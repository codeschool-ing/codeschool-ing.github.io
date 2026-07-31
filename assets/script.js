/* ==========================================================================
   codeschool.ing — vitrine (dados em assets/dados.js)
   ========================================================================== */

const $ = (sel) => document.querySelector(sel);
const cursoPorId = (id) => CURSOS.find((c) => c.id === id);

/* ---------- trilhas com bifurcação ----------
   Um item de `cursos` é o id de um curso (string) ou uma etapa de escolha
   (objeto com `opcoes`). Daí três leituras diferentes da mesma trilha:
   todos os cursos possíveis, o caminho escolhido e as horas do caminho. */
const ehEscolha = (item) => typeof item === 'object' && Array.isArray(item.opcoes);

// todos os cursos que a trilha pode conter, somando todas as opções
const todosOsCursos = (t) =>
  t.cursos.flatMap((i) => (ehEscolha(i) ? i.opcoes.flatMap((o) => o.cursos) : [i]));

// a escolha atual de cada trilha, por índice de opção (a primeira é a sugerida)
const escolhas = {};
const opcaoAtiva = (idTrilha, idxEtapa) => (escolhas[idTrilha + ':' + idxEtapa] || 0);

// o caminho que o aluno está vendo agora
const caminhoDaTrilha = (t) =>
  t.cursos.flatMap((i, idx) => (ehEscolha(i) ? i.opcoes[opcaoAtiva(t.id, idx)].cursos : [i]));

const horasDe = (ids) => ids.reduce((s, id) => s + (cursoPorId(id)?.horas || 0), 0);

/* ---------- o grafo de uma trilha ----------
   Cada curso do caminho vira um nó; uma etapa de escolha vira um nó único
   (o bloco), porque ela é uma decisão, não um curso. As arestas saem do
   campo `depende` de cada curso, recortado ao que existe nesta trilha.
   O nível de um nó é 1 + o maior nível entre os seus pré-requisitos, o que
   coloca lado a lado tudo o que pode ser feito ao mesmo tempo. */
function grafoDaTrilha(t) {
  const nos = [];
  const doCurso = {};   // id de curso -> id do nó que o contém
  const membrosDoGarfo = {}; // id de curso (de qualquer opção) -> id do nó garfo

  t.cursos.forEach((item, idx) => {
    if (!ehEscolha(item)) {
      nos.push({ id: item, tipo: 'curso', cursos: [item] });
      doCurso[item] = item;
      return;
    }
    const idNo = 'garfo:' + idx;
    nos.push({ id: idNo, tipo: 'garfo', etapa: item, idx: idx, cursos: item.opcoes[opcaoAtiva(t.id, idx)].cursos });
    item.opcoes.forEach((o) => o.cursos.forEach((c) => { membrosDoGarfo[c] = idNo; }));
    item.opcoes[opcaoAtiva(t.id, idx)].cursos.forEach((c) => { doCurso[c] = idNo; });
  });

  // arestas: pré-requisito -> curso, resolvendo cursos internos para o bloco
  const idDoItem = (v) => (typeof v === 'number' ? nos[v] && nos[v].id : doCurso[v] || membrosDoGarfo[v]);
  nos.forEach((no, i) => {
    const deps = new Set();
    no.cursos.forEach((id) => {
      (cursoPorId(id)?.depende || []).forEach((d) => {
        const alvo = doCurso[d] || membrosDoGarfo[d];
        if (alvo && alvo !== no.id) deps.add(alvo);
      });
      // ligações que só existem nesta trilha (ordem de currículo, não de conteúdo)
      ((t.ligacoes || {})[id] || []).forEach((v) => {
        const alvo = idDoItem(v);
        if (alvo && alvo !== no.id) deps.add(alvo);
      });
    });
    // sem nenhum pré-requisito dentro desta trilha: vale a ordem do currículo,
    // senão cursos como `nuvem` e `testes-cicd` cairiam todos no primeiro nível
    if (!deps.size && i > 0) deps.add(nos[i - 1].id);
    no.deps = [...deps];
  });

  // nó de chegada: tudo o que não é pré-requisito de mais nada desemboca nele,
  // para o grafo não terminar em cursos soltos sem seta de saída
  const temSucessor = {};
  nos.forEach((n) => n.deps.forEach((d) => { temSucessor[d] = true; }));
  nos.push({ id: '@saida', tipo: 'saida', cursos: [], deps: nos.filter((n) => !temSucessor[n.id]).map((n) => n.id) });

  const sucessores = {};
  nos.forEach((n) => n.deps.forEach((d) => { (sucessores[d] = sucessores[d] || []).push(n.id); }));

  /* Níveis por ordenação topológica iterativa (Kahn). A versão recursiva
     anterior tinha um teto de profundidade que estourava nas trilhas longas
     — Engenharia de Dados e DevSecOps ficavam sem nível e não renderizavam. */
  const nivel = {};
  const restam = {};
  nos.forEach((n) => { restam[n.id] = n.deps.length; });
  const fila = nos.filter((n) => !n.deps.length).map((n) => n.id);
  fila.forEach((id) => { nivel[id] = 0; });
  for (let i = 0; i < fila.length; i += 1) {
    const id = fila[i];
    (sucessores[id] || []).forEach((s) => {
      nivel[s] = Math.max(nivel[s] === undefined ? 0 : nivel[s], nivel[id] + 1);
      restam[s] -= 1;
      if (restam[s] <= 0) fila.push(s);
    });
  }
  /* Rede de segurança: se um dado formar ciclo (curso que depende de outro
     declarado depois dele na trilha), a fila do Kahn esgota antes do fim.
     Em vez de deixar esses nós sem nível — o que fazia a trilha inteira
     desaparecer —, eles entram depois do maior pré-requisito já resolvido. */
  const presos = nos.filter((n) => nivel[n.id] === undefined);
  presos.forEach((n) => {
    const resolvidos = n.deps.map((d) => nivel[d]).filter((v) => v !== undefined);
    nivel[n.id] = resolvidos.length ? Math.max(...resolvidos) + 1 : 0;
    fila.push(n.id);
  });
  if (presos.length && window.console) {
    console.warn('trilha "' + t.nome + '": dependência circular em ' + presos.map((n) => n.id).join(', '));
  }

  // agrupa por nível, sem deixar buraco na sequência de colunas
  const porNivel = {};
  nos.forEach((n) => { (porNivel[nivel[n.id]] = porNivel[nivel[n.id]] || []).push(n); });
  const colunas = Object.keys(porNivel)
    .map(Number)
    .sort((a, b) => a - b)
    .map((v) => porNivel[v]);
  colunas.forEach((col, i) => col.forEach((n) => { nivel[n.id] = i; }));

  /* ---------- ordenação dentro de cada nível ----------
     Aqui mora a inteligência estrutural do grafo. NADA é fixado por trilha:
     o algoritmo mede o desenho que vai sair e escolhe a ordem que produz
     menos cruzamento de linhas. Trilha nova entra e é otimizada do mesmo
     jeito, sem ninguém precisar arrumar a ordem na mão.

     São três peças, todas do método de Sugiyama:

       1. baricentro — cada nó puxa para a altura média dos seus vizinhos
          da coluna ao lado. Chega perto rápido, mas encalha em ótimos
          locais: há casos que só melhoram mexendo em DUAS colunas, e
          nenhuma troca isolada melhora sozinha;
       2. transposição — troca pares vizinhos de uma mesma coluna enquanto
          isso não piorar. Aceitar as trocas EMPATADAS destrava aqueles
          casos de duas colunas: a primeira troca anda de lado, a segunda
          colhe o ganho;
       3. partidas múltiplas — as duas anteriores são guloso puro e o
          resultado depende de onde se começa. Então recomeça-se de várias
          ordens iniciais (a do currículo, a invertida e algumas
          embaralhadas) e fica-se com a melhor de todas. O embaralhamento
          usa um gerador com semente fixa: a saída é sempre a mesma, o
          grafo não muda de forma a cada visita.

     Custa ~7 ms para as 16 trilhas inteiras, uma vez por abertura. */

  const posicao = {};
  const indexar = () => colunas.forEach((col) => col.forEach((n, i) => {
    posicao[n.id] = col.length > 1 ? i / (col.length - 1) : 0.5;
  }));

  /* As arestas, separadas pelo vão de níveis que cada uma atravessa. */
  const arestas = [];
  nos.forEach((n) => n.deps.forEach((d) => {
    if (nivel[d] < nivel[n.id]) arestas.push({ de: d, para: n.id, vao: nivel[n.id] - nivel[d] });
  }));

  /* Custo de uma ordenação. São TRÊS critérios, em ordem de prioridade —
     comparados um a um, não somados: o segundo só é consultado quando o
     primeiro empata, e o terceiro quando os dois empatam. Assim nenhum
     critério menor consegue comprar um cruzamento a mais.

     1) CRUZAMENTOS — o que o desenho realmente mostra.
        Aresta de um nível para o seguinte vira curva direta: duas se
        cruzam quando a ordem vertical das pontas se inverte.
        Aresta que pula níveis não é desenhada reta: `desenharArestas` a
        desvia para uma faixa livre por fora do grafo (é a regra "se a
        linha passaria por trás de um curso, leve a linha por fora"). Ela
        então só cruza alguma coisa na saída e na chegada, ao subir ou
        descer até essa faixa, cruzando as diretas que passam por cima (ou
        por baixo) dela. O roteador escolhe o lado mais perto; aqui o
        custo escolhe igual.

     2) VIÉS PARA CIMA — empatados subir e descer, o desvio sobe. É
        convenção, mas uniforme: com todos os atalhos saindo do mesmo
        lado, o corpo principal da trilha fica contíguo, em vez de
        partido por linhas passando dos dois lados.

     3) ORDEM DO CURRÍCULO — entre desenhos igualmente limpos, vence o
        que mantém os cursos na sequência em que a trilha os declara.
        Sem isto, cada partida do otimizador devolveria uma permutação
        arbitrária entre as boas, e níveis como "Qualidade · Performance ·
        Entrega" apareceriam fora de ordem sem nenhum ganho. */
  const ordemCurriculo = {};
  nos.forEach((n, i) => { ordemCurriculo[n.id] = i; });
  const vaos = [];
  const custo = () => {
    for (let g = 0; g < colunas.length - 1; g += 1) vaos[g] = [];
    arestas.forEach((e) => {
      if (e.vao === 1) vaos[nivel[e.de]].push({ a: posicao[e.de], b: posicao[e.para] });
    });
    let cruz = 0;
    vaos.forEach((lista) => {
      for (let i = 0; i < lista.length; i += 1) {
        for (let j = i + 1; j < lista.length; j += 1) {
          if ((lista[i].a - lista[j].a) * (lista[i].b - lista[j].b) < 0) cruz += 1;
        }
      }
    });
    let vies = 0;
    arestas.forEach((e) => {
      if (e.vao === 1) return;
      const pu = posicao[e.de], pv = posicao[e.para];
      const saida = vaos[nivel[e.de]], chegada = vaos[nivel[e.para] - 1];
      let cima = 0, baixo = 0;
      saida.forEach((s) => { if (s.a < pu) cima += 1; else if (s.a > pu) baixo += 1; });
      chegada.forEach((s) => { if (s.b < pv) cima += 1; else if (s.b > pv) baixo += 1; });
      cruz += Math.min(cima, baixo);
      vies += pu + pv;
    });
    let fora = 0;
    colunas.forEach((col) => {
      for (let i = 0; i < col.length; i += 1) {
        for (let j = i + 1; j < col.length; j += 1) {
          if (ordemCurriculo[col[i].id] > ordemCurriculo[col[j].id]) fora += 1;
        }
      }
    });
    return [cruz, vies, fora];
  };
  /* compara dois custos critério a critério (ordem lexicográfica) */
  const pior = (a, b) => {
    for (let i = 0; i < a.length; i += 1) {
      if (a[i] !== b[i]) return a[i] > b[i];
    }
    return false;
  };
  const igual = (a, b) => a.every((v, i) => v === b[i]);

  /* média e mediana das alturas dos vizinhos — a mediana costuma se sair
     melhor quando um nó tem poucos vizinhos muito espalhados, então as
     duas se alternam nas passadas */
  const MEDIA = (v) => v.reduce((a, b) => a + b, 0) / v.length;
  const MEDIANA = (v) => {
    const s = v.slice().sort((a, b) => a - b);
    return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
  };
  const ordenar = (col, vizinhos, agregar) => {
    const chave = col.map((n, i) => {
      const v = vizinhos(n).map((id) => posicao[id]).filter((x) => x !== undefined);
      return { n: n, b: v.length ? agregar(v) : null, i: i };
    });
    chave.sort((a, b) => (a.b === null || b.b === null ? a.i - b.i : (a.b - b.b) || (a.i - b.i)));
    return chave.map((x) => x.n);
  };

  /* troca pares vizinhos enquanto compensar; `aceitarEmpate` deixa o
     algoritmo andar de lado para sair de um ótimo local */
  const transpor = (aceitarEmpate) => {
    let melhorou = true;
    let voltas = 0;
    while (melhorou && voltas < 8) {
      melhorou = false;
      voltas += 1;
      colunas.forEach((col) => {
        for (let i = 0; i + 1 < col.length; i += 1) {
          const antes = custo();
          const tmp = col[i]; col[i] = col[i + 1]; col[i + 1] = tmp;
          indexar();
          const depois = custo();
          if (pior(antes, depois) || (aceitarEmpate && igual(antes, depois))) {
            if (pior(antes, depois)) melhorou = true;
          } else {
            const v = col[i]; col[i] = col[i + 1]; col[i + 1] = v;
            indexar();
          }
        }
      });
    }
  };

  indexar();
  let melhor = colunas.map((col) => col.slice());
  let melhorCusto = custo();
  const guardar = () => {
    const c = custo();
    if (pior(melhorCusto, c)) { melhorCusto = c; melhor = colunas.map((col) => col.slice()); }
  };

  const inicial = colunas.map((col) => col.slice());
  let semente = 1;   // gerador congruente linear: embaralha sempre igual
  const sorteio = () => { semente = (semente * 1103515245 + 12345) & 0x7fffffff; return semente / 0x7fffffff; };
  const PARTIDAS = ['curriculo', 'invertida', 'sorteio', 'sorteio', 'sorteio', 'sorteio'];

  PARTIDAS.forEach((partida) => {
    colunas.length = 0;
    inicial.forEach((col) => {
      if (partida === 'curriculo') return colunas.push(col.slice());
      if (partida === 'invertida') return colunas.push(col.slice().reverse());
      const a = col.slice();
      for (let i = a.length - 1; i > 0; i -= 1) {
        const j = Math.floor(sorteio() * (i + 1));
        const t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return colunas.push(a);
    });
    indexar();
    /* numa partida embaralhada, subir o morro ANTES do baricentro: se o
       baricentro rodar primeiro ele reordena tudo pelos vizinhos e apaga
       o sorteio, e a partida deixa de ser uma partida diferente */
    if (partida === 'sorteio') { transpor(true); guardar(); }
    for (let passo = 0; passo < 2; passo += 1) {
      const agregar = passo % 2 ? MEDIANA : MEDIA;
      for (let v = 1; v < colunas.length; v += 1) {
        colunas[v] = ordenar(colunas[v], (n) => n.deps, agregar);
        indexar();
      }
      for (let v = colunas.length - 2; v >= 0; v -= 1) {
        colunas[v] = ordenar(colunas[v], (n) => sucessores[n.id] || [], agregar);
        indexar();
      }
      guardar();
      transpor(passo % 2 === 1);
      guardar();
    }
  });

  colunas.length = 0;
  melhor.forEach((col) => colunas.push(col));
  colunas.forEach((col, i) => col.forEach((n) => { nivel[n.id] = i; }));

  return { nos: nos, colunas: colunas, nivel: nivel, niveisReais: colunas.length - 1 };
}

// faixa de carga horária: menor e maior caminho possível
function faixaDeHoras(t) {
  let min = 0, max = 0;
  t.cursos.forEach((i) => {
    if (!ehEscolha(i)) { const h = cursoPorId(i)?.horas || 0; min += h; max += h; return; }
    const hs = i.opcoes.map((o) => horasDe(o.cursos));
    min += Math.min(...hs);
    max += Math.max(...hs);
  });
  return { min, max };
}

// em quantas trilhas um curso aparece (o mesmo curso pode servir a várias)
const trilhasDoCurso = (id) => TRILHAS.filter((t) => todosOsCursos(t).includes(id));
// o inverso de `depende`: que cursos este destrava
const depoisDe = (id) => CURSOS.filter((c) => (c.depende || []).includes(id));

document.getElementById('ano').textContent = new Date().getFullYear();
$('#n-cursos').textContent = CURSOS.length;
$('#n-trilhas').textContent = TRILHAS.length;
/* soma real da carga horária do catálogo, no lugar do antigo "5.000+ alunos
   formados" — número que uma escola nova não tem. Este cresce sozinho quando
   entra curso novo, e é verdade no dia em que o site sobe. O separador de
   milhar segue o idioma: 5.930 em português, 5,930 em inglês. */
const TOTAL_HORAS = CURSOS.reduce((s, c) => s + (c.horas || 0), 0);
const localeAtual = () => (IDIOMAS.find((i) => i.cod === IDIOMA) || {}).html || 'pt-BR';
function mostrarHoras() {
  $('#n-horas').textContent = TOTAL_HORAS.toLocaleString(localeAtual());
}
mostrarHoras();

/* ---------- terminal do hero ----------
   Quatro comandos, e nenhuma resposta escrita à mão: os números, os nomes
   das trilhas e a ficha do curso saem de CURSOS e TRILHAS. Assim o
   terminal não envelhece — entra trilha nova, ele conta certo — e não há
   como ele contradizer o resto da página.

   Os comandos ficam em inglês porque são o nome de uma ferramenta; as
   respostas seguem o idioma escolhido. */
const CURSO_VITRINE = 'kubernetes';   // avançado e com pré-requisito: mostra as duas coisas
function montarTerminal() {
  const corpo = $('#term-body');
  if (!corpo) return;
  const cmd = (s) => '<div class="term-line"><span class="pr">$</span> ' + s + '</div>';
  const seta = (m, cls, s) => '<div class="term-line"><span class="' + cls + '">' + m + '</span> ' + s + '</div>';
  const branco = '<div class="term-vao"></div>';

  const status = seta('✓', 'ok',
    CURSOS.length + ' ' + txt('cursos ·') + ' ' + TRILHAS.length + ' ' + txt('trilhas ·') +
    ' ' + TOTAL_HORAS.toLocaleString(localeAtual()) + ' ' + txt('horas de conteúdo'));

  const carreira = TRILHAS.filter((t) => t.familia === 'carreira');
  const lista = carreira.slice(0, 3).map((t) => {
    const f = faixaDeHoras(t);
    return seta('→', 'pr', t.nome + ' · ' + (f.min === f.max ? f.min : f.min + '–' + f.max) + 'h');
  }).join('');
  const resto = carreira.length - 3;
  const maisTrilhas = resto > 0
    ? '<div class="term-line"><span class="cm">  ' +
      txt('… e mais {n} trilhas de carreira').replace('{n}', resto) + '</span></div>'
    : '';

  const c = cursoPorId(CURSO_VITRINE) || CURSOS.find((x) => (x.depende || []).length);
  const ficha = c
    ? cmd('codeschool course ' + c.id + ' --info') +
      seta('→', 'pr', c.nome + ' · ' + c.horas + 'h · ' + txt(c.nivel)) +
      ((c.depende || []).length
        ? seta('↳', 'cm', txt('precisa antes:') + ' ' +
            c.depende.map((d) => cursoPorId(d)?.nome).filter(Boolean).join(', '))
        : '')
    : '';

  corpo.innerHTML =
    cmd('codeschool --status') + status + branco +
    cmd('codeschool tracks --career') + lista + maisTrilhas + branco +
    ficha + branco +
    cmd('codeschool start<span class="cursor"></span>');
  // a posição de cada linha vira o atraso da animação
  [...corpo.children].forEach((el, i) => el.style.setProperty('--i', i));
}
montarTerminal();

/* ---------- tema claro/escuro ---------- */
const temaBtn = $('#tema-btn');
function aplicarTema(tema) {
  if (tema === 'claro') document.documentElement.dataset.tema = 'claro';
  else delete document.documentElement.dataset.tema;
  temaBtn.setAttribute('aria-label', tema === 'claro' ? 'Mudar para tema escuro' : 'Mudar para tema claro');
}
temaBtn.addEventListener('click', () => {
  const novo = document.documentElement.dataset.tema === 'claro' ? 'escuro' : 'claro';
  try { localStorage.setItem('codeschool-tema', novo); } catch (e) {}
  aplicarTema(novo);
});
try { aplicarTema(localStorage.getItem('codeschool-tema') || 'escuro'); } catch (e) { aplicarTema('escuro'); }

/* ---------- menu mobile ---------- */
const menu = $('#menu');
$('#burger').addEventListener('click', () => menu.classList.toggle('open'));

/* ==========================================================
   TRILHAS — sequência de cursos com setas
   ========================================================== */
const painelEl = $('#trilha-painel');
let trilhaAtual = 0;
let trocaT = null;

/* Duas famílias de trilha: "carreira" responde que profissão o aluno quer,
   "tecnologia" responde que ferramenta ele quer dominar. Cada uma tem sua
   fileira de abas, com rótulo e setas próprias — como só existem duas, o
   alternador que havia antes custava mais altura do que informava. O índice
   usado em toda a seção continua sendo o de TRILHAS. */
const FAMILIAS = ['carreira', 'tecnologia'];
const familiaDe = (t) => t.familia || 'carreira';
const indicesDaFamilia = (f) => TRILHAS.map((t, i) => (familiaDe(t) === f ? i : -1)).filter((i) => i >= 0);
const caixaDaFamilia = (f) => document.querySelector('.abas-caixa[data-familia="' + f + '"]');
const abasDaFamilia = (f) => $('#abas-' + f);

/* Menu suspenso das trilhas (celular): as duas fileiras roláveis viram uma
   lista só, agrupada por família. Mesma fonte de dados, mesma função de abrir. */
const dropTrilhas = $('#drop-trilhas');
function montarDropTrilhas() {
  const lista = $('#drop-trilhas-lista');
  lista.textContent = '';
  FAMILIAS.forEach((f) => {
    const h = document.createElement('div');
    h.className = 'drop-grupo';
    h.textContent = txt(f === 'carreira' ? 'trilhas por carreira' : 'trilhas por tecnologia');
    lista.appendChild(h);
    indicesDaFamilia(f).forEach((i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'drop-op' + (i === trilhaAtual ? ' on' : '');
      b.textContent = TRILHAS[i].nome;
      b.addEventListener('click', () => { abrirTrilha(i); fecharDrops(); });
      lista.appendChild(b);
    });
  });
  dropTrilhas.querySelector('.drop-atual').textContent = TRILHAS[trilhaAtual].nome;
}

function montarAbas() {
  FAMILIAS.forEach((f) => {
    const el = abasDaFamilia(f);
    el.textContent = '';
    indicesDaFamilia(f).forEach((i) => {
      const b = document.createElement('button');
      b.className = 'trilha-aba' + (i === trilhaAtual ? ' on' : '');
      b.type = 'button';
      b.dataset.idx = i;
      b.setAttribute('role', 'tab');
      b.textContent = TRILHAS[i].nome;
      b.addEventListener('click', () => abrirTrilha(i));
      el.appendChild(b);
    });
  });
}

/* o cartão de um curso dentro do grafo */
function cartaoCurso(id, ordem, deps) {
  const c = cursoPorId(id);
  if (!c) return '';
  const nT = trilhasDoCurso(id).length;
  const requer = (deps || []).map((d) => cursoPorId(d)?.nome).filter(Boolean);
  return (
    '<button class="curso-no" type="button" data-curso="' + c.id + '" data-no="' + c.id + '">' +
      (ordem ? '<span class="ordem">' + txt('nível') + ' ' + ordem + '</span>' : '') +
      '<span class="nome">' + c.nome + '</span>' +
      (nT > 1 ? '<span class="tag-compartilhado">' + txt('em') + ' ' + nT + ' ' + txt('trilhas') + '</span>' : '') +
      '<span class="meta">' + c.horas + 'h · ' + txt(c.nivel) + '</span>' +
      (requer.length ? '<span class="requer">' + txt('depois de') + ' ' + requer.join(' + ') + '</span>' : '') +
    '</button>'
  );
}

function montarTrilha(t) {
  const caminho = caminhoDaTrilha(t);
  const horas = horasDe(caminho);
  const { min, max } = faixaDeHoras(t);
  const g = grafoDaTrilha(t);

  const colunas = g.colunas
    .map((nos, v) => {
      const cartoes = nos
        .map((no) => {
          if (no.tipo === 'saida') {
            return '<div class="no-saida" data-no="@saida">' +
              '<span class="saida-selo" aria-hidden="true">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
                '<path d="M5 22V4M5 4h11l-2 4 2 4H5"/></svg>' +
              '</span>' +
              '<span class="saida-txt">' +
                '<span class="saida-rotulo">' + txt('chegada') + '</span>' +
                '<span class="saida-nome">' + t.saida + '</span>' +
              '</span>' +
            '</div>';
          }
          if (no.tipo === 'curso') {
            const nomes = (cursoPorId(no.id)?.depende || []).filter((d) => g.nos.some((x) => x.cursos.includes(d)));
            return cartaoCurso(no.id, String(v + 1).padStart(2, '0'), nomes);
          }
          // etapa de escolha: um bloco só, com as opções em abas
          const item = no.etapa;
          const sel = opcaoAtiva(t.id, no.idx);
          const abas = item.opcoes
            .map((o, j) =>
              '<button class="garfo-aba' + (j === sel ? ' on' : '') + '" type="button" ' +
              'data-garfo="' + no.idx + '" data-opcao="' + j + '">' + o.nome +
              '<span class="garfo-h">' + horasDe(o.cursos) + 'h</span></button>')
            .join('');
          const dentro = item.opcoes[sel].cursos.map((id) => cartaoCurso(id)).join('');
          return (
            '<div class="garfo" data-no="' + no.id + '">' +
              '<div class="garfo-topo">' +
                '<span class="garfo-rotulo">' + txt('nível') + ' ' + String(v + 1).padStart(2, '0') +
                  ' · ' + txt('você escolhe') + ' ' + item.escolha + '</span>' +
                '<div class="garfo-abas" role="tablist">' + abas + '</div>' +
              '</div>' +
              (item.nota ? '<p class="garfo-nota">' + item.nota + '</p>' : '') +
              '<div class="garfo-cursos">' + dentro + '</div>' +
            '</div>'
          );
        })
        .join('');
      // uma sub-coluna só; o script reparte depois de medir a altura real
      return '<div class="nivel" data-nivel="' + v + '"><div class="subcol">' + cartoes + '</div></div>';
    })
    .join('');

  const carga = min === max
    ? '<span><b>' + horas + 'h</b>' + txt('de carga') + '</span>'
    : '<span><b>' + horas + 'h</b>' + txt('neste caminho') + ' <i>(' + min + 'h ' + txt('a') + ' ' + max + 'h)</i></span>';

  const paralelo = g.colunas.slice(0, -1).filter((c) => c.length > 1).length;

  return (
    '<div class="trilha-topo">' +
      '<div>' +
        '<h3>' + t.nome + '</h3>' +
        '<p>' + t.objetivo + '</p>' +
      '</div>' +
      '<div class="trilha-resumo">' +
        '<span><b>' + caminho.length + '</b>' + txt('cursos') + '</span>' +
        carga +
        '<span><b>' + g.niveisReais + '</b>' + txt('níveis') +
          (paralelo ? '<i>' + paralelo + ' ' + txt('deles com ordem livre') + '</i>' : '') +
        '</span>' +
        '<span><b>→</b>' + t.saida + '</span>' +
      '</div>' +
    '</div>' +
    '<div class="grafo-caixa">' +
      '<button class="grafo-seta esq" type="button" data-rolar="-1" aria-label="Ver níveis anteriores">←</button>' +
      '<div class="trilha-grafo"><svg class="grafo-arestas" aria-hidden="true"></svg>' +
        '<div class="grafo-niveis">' + colunas + '</div></div>' +
      '<button class="grafo-seta dir" type="button" data-rolar="1" aria-label="Ver próximos níveis">→</button>' +
    '</div>'
  );
}

/* ---------- reparte cada nível em sub-colunas ----------
   Um nível com muitos cursos não pode esticar para baixo da tela. Aqui se
   mede a altura real de cada cartão e se enche uma sub-coluna até o limite
   antes de abrir a seguinte, então o grafo cresce na horizontal — que é
   onde existem as setas de navegação. */
function repartirNiveis() {
  const rol = painelEl.querySelector('.trilha-grafo');
  const faixa = painelEl.querySelector('.grafo-niveis');
  if (!rol || !faixa) return;
  // volta ao tamanho cheio antes de medir: é a altura disponível que decide
  // a repartição, não a que sobrou da trilha anterior
  const caixaG = painelEl.querySelector('.grafo-caixa');
  if (caixaG) caixaG.style.flex = '1 1 auto';
  // em tela estreita o CSS empilha tudo numa coluna: nada a repartir, e o
  // que sobrou de uma medição anterior volta para uma sub-coluna só
  const emLista = getComputedStyle(faixa).flexDirection !== 'row';
  const gap = 10;
  // desconta o padding real da faixa em vez de uma constante: ele mudou junto
  // com o cabeçalho da seção, e um número mágico aqui silenciaria o ganho
  const cs = getComputedStyle(faixa);
  const disponivel = rol.clientHeight -
    (parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)) - 4;
  painelEl.querySelectorAll('.nivel').forEach((nv) => {
    const itens = [];
    nv.querySelectorAll(':scope > .subcol').forEach((sc) => {
      Array.from(sc.children).forEach((el) => itens.push(el));
    });
    if (itens.length < 2) return;

    if (emLista) {
      nv.textContent = '';
      const sc = document.createElement('div');
      sc.className = 'subcol';
      itens.forEach((el) => sc.appendChild(el));
      nv.appendChild(sc);
      return;
    }

    const colunas = [[]];
    let usado = 0;
    itens.forEach((el) => {
      const h = el.offsetHeight;
      const atual = colunas[colunas.length - 1];
      if (atual.length && usado + gap + h > disponivel) { colunas.push([]); usado = 0; }
      colunas[colunas.length - 1].push(el);
      usado += (usado ? gap : 0) + h;
    });

    nv.textContent = '';
    colunas.forEach((col) => {
      const sc = document.createElement('div');
      sc.className = 'subcol';
      col.forEach((el) => sc.appendChild(el));
      nv.appendChild(sc);
    });
  });

  /* A faixa abraça o grafo em vez de ocupar toda a altura que sobra. Sem
     isso os cartões ficavam centrados numa faixa bem mais alta, e o bloco
     nome+objetivo tinha 33px de folga para as abas acima contra 103px para
     o primeiro cartão abaixo. A medição continua sendo feita com a altura
     cheia — é ela que decide quantos cartões cabem numa coluna. */
  if (!emLista) {
    let alto = 0;
    painelEl.querySelectorAll('.nivel > .subcol').forEach((sc) => {
      alto = Math.max(alto, sc.offsetHeight);
    });
    const cheio = rol.clientHeight;
    const cx = painelEl.querySelector('.grafo-caixa');
    if (alto && cx) {
      const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      cx.style.flex = '0 0 ' + Math.min(cheio, alto + pad) + 'px';
    }
  }
}

/* ---------- as arestas ----------
   Desenhadas depois que o layout existe: mede-se cada nó e liga-se a borda
   direita do pré-requisito à borda esquerda de quem depende dele. */
function desenharArestas(t) {
  repartirNiveis();
  const cont = painelEl.querySelector('.trilha-grafo');
  const svg = cont && cont.querySelector('.grafo-arestas');
  if (!svg) return;
  const g = grafoDaTrilha(t);
  const base = cont.getBoundingClientRect();
  const L = cont.scrollLeft, T = cont.scrollTop;
  const caixa = (id) => {
    const el = cont.querySelector('[data-no="' + CSS.escape(id) + '"]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left - base.left + L, y: r.top - base.top + T, w: r.width, h: r.height };
  };

  svg.setAttribute('width', cont.scrollWidth);
  svg.setAttribute('height', cont.scrollHeight);
  svg.setAttribute('viewBox', '0 0 ' + cont.scrollWidth + ' ' + cont.scrollHeight);

  /* Distância que uma linha de contorno mantém do cartão que desvia. Era
     11px e algumas passavam raspando; 16 dá respiro sem alongar a curva a
     ponto de ela virar um arco. O `.subcol` abriu junto, senão o corredor
     entre dois cartões empilhados não comportaria a folga maior. */
  const FOLGA = 16;
  // a faixa de desvio fica logo acima e logo abaixo dos cartões, não nas
  // bordas do container: curvas curtas em vez de arcos atravessando a tela
  let yTopo = Infinity, yBase = -Infinity;
  g.nos.forEach((n) => {
    const c = caixa(n.id);
    if (!c) return;
    yTopo = Math.min(yTopo, c.y);
    yBase = Math.max(yBase, c.y + c.h);
  });
  if (!isFinite(yTopo)) { yTopo = 0; yBase = cont.scrollHeight; }
  const desvioCima = Math.max(6, yTopo - FOLGA);
  const desvioBaixo = Math.min(cont.scrollHeight - 6, yBase + FOLGA);

  /* Todas as caixas medidas de uma vez. O desvio não é decidido contando
     níveis pulados — isso deixava passar o caso em que um nível é repartido
     em sub-colunas e o cartão vizinho de coluna fica no corredor, mesmo com
     a aresta ligando níveis adjacentes. Agora é geometria: se há cartão
     entre as duas pontas, a linha passa por fora. */
  const caixas = g.nos.map((n) => {
    const c = caixa(n.id);
    return c && { id: n.id, x: c.x, y: c.y, w: c.w, h: c.h };
  }).filter(Boolean);
  const noCaminho = (xa, xb, ya, yb, ignora) => caixas.filter((c) =>
    ignora.indexOf(c.id) < 0 &&
    c.x + c.w > xa && c.x < xb &&
    c.y < yb && c.y + c.h > ya);

  /* Folga horizontal livre a partir de um x, dentro da faixa vertical que a
     curva percorre. É ela que limita a largura da subida: com sub-colunas o
     vão ao lado do cartão cai de 48px para 14px, e uma subida de 26px passaria
     por dentro do vizinho. */
  const folga = (x, ya, yb, ignora, paraDireita) => {
    let lim = Infinity;
    caixas.forEach((c) => {
      if (ignora.indexOf(c.id) >= 0) return;
      if (c.y >= yb || c.y + c.h <= ya) return;
      const d = paraDireita ? c.x - x : x - (c.x + c.w);
      if (d >= 0) lim = Math.min(lim, d);
    });
    return lim;
  };

  const linhas = [];
  g.nos.forEach((no) => {
    const b = caixa(no.id);
    if (!b) return;
    const salto = no.deps.length;
    no.deps.forEach((d) => {
      const a = caixa(d);
      if (!a) return;
      const x1 = a.x + a.w, y1 = a.y + a.h / 2;
      const x2 = b.x, y2 = b.y + b.h / 2;
      let dd;

      /* a curva simples tem os pontos de controle na altura das pontas, então
         ela nunca sai da faixa entre y1 e y2: basta olhar esse retângulo */
      const ignora = [d, no.id];
      const obst = noCaminho(x1 + 2, x2 - 2, Math.min(y1, y2) - 4, Math.max(y1, y2) + 4, ignora);

      if (obst.length) {
        /* contorna por fora, pelo lado mais barato — acima do cartão mais alto
           que atrapalha, ou abaixo do mais baixo. Fica um arco curto e local
           em vez de um que atravessa o grafo inteiro. */
        const topo = Math.min.apply(null, obst.map((c) => c.y));
        const base = Math.max.apply(null, obst.map((c) => c.y + c.h));
        const porCima = (y1 - topo) + (y2 - topo) <= (base - y1) + (base - y2);
        let yD = porCima ? topo - FOLGA : base + FOLGA;
        // o contorno local pode esbarrar noutro cartão: aí vale a faixa livre
        // acima ou abaixo de todo o grafo, que é sempre limpa. O lado é
        // reavaliado — o mais barato para o contorno curto raramente é o mesmo
        if (noCaminho(x1 + 2, x2 - 2, yD - 3, yD + 3, ignora).length) {
          yD = (y1 - desvioCima) + (y2 - desvioCima) <= (desvioBaixo - y1) + (desvioBaixo - y2)
            ? desvioCima : desvioBaixo;
        }
        yD = Math.max(6, Math.min(cont.scrollHeight - 6, yD));
        // cada ponta usa a folga que ela realmente tem: a subida da saída cabe
        // no vão à direita do pré-requisito, a da chegada no vão à esquerda de
        // quem depende dele
        const larg = (x, paraDireita) => {
          const ya = Math.min(paraDireita ? y1 : y2, yD), yb = Math.max(paraDireita ? y1 : y2, yD);
          return Math.max(5, Math.min(26, folga(x, ya, yb, ignora, paraDireita) / 2));
        };
        const eS = larg(x1, true), eE = larg(x2, false);
        dd = 'M' + x1 + ',' + y1 +
          ' C' + (x1 + eS) + ',' + y1 + ' ' + (x1 + eS) + ',' + yD + ' ' + (x1 + eS * 2) + ',' + yD +
          ' L' + (x2 - eE * 2) + ',' + yD +
          ' C' + (x2 - eE) + ',' + yD + ' ' + (x2 - eE) + ',' + y2 + ' ' + x2 + ',' + y2;
      } else {
        const dx = Math.max(18, (x2 - x1) / 2);
        dd = 'M' + x1 + ',' + y1 + ' C' + (x1 + dx) + ',' + y1 +
          ' ' + (x2 - dx) + ',' + y2 + ' ' + x2 + ',' + y2;
      }

      linhas.push(
        '<g class="aresta" data-de="' + d + '" data-para="' + no.id + '">' +
          '<title>' + rotuloNo(d, g) + ' → ' + rotuloNo(no.id, g) + '</title>' +
          '<path class="hit" d="' + dd + '"/>' +
          '<path class="linha" d="' + dd + '"/>' +
          '<circle class="ponta" cx="' + x2 + '" cy="' + y2 + '" r="3"/>' +
        '</g>'
      );
      void salto;
    });
  });
  svg.innerHTML = linhas.join('');
  ajustarSetasGrafo();
}

/* nome legível de um nó, para o rótulo da aresta */
function rotuloNo(id, g) {
  if (id === '@saida') return txt('chegada');
  const c = cursoPorId(id);
  if (c) return c.nome;
  const no = g.nos.find((n) => n.id === id);
  return no && no.etapa ? 'escolha ' + no.etapa.escolha : id;
}

/* o grafo rola por setas, sem barra de rolagem à mostra */
function ajustarSetasGrafo() {
  const cx = painelEl.querySelector('.grafo-caixa');
  const rol = cx && cx.querySelector('.trilha-grafo');
  if (!rol) return;
  const sobra = rol.scrollWidth - rol.clientWidth;
  cx.querySelector('.grafo-seta.esq').disabled = !(sobra > 4 && rol.scrollLeft > 4);
  cx.querySelector('.grafo-seta.dir').disabled = !(sobra > 4 && rol.scrollLeft < sobra - 4);
  cx.classList.toggle('sem-setas', sobra <= 4);
  rol.classList.toggle('fade-dir', sobra > 4 && rol.scrollLeft < sobra - 4);
  rol.classList.toggle('fade-esq', sobra > 4 && rol.scrollLeft > 4);
  // em tela estreita o grafo é lista e rola para baixo: o fade avisa que há mais
  const sobraY = rol.scrollHeight - rol.clientHeight;
  rol.classList.toggle('fade-baixo', sobraY > 4 && rol.scrollTop < sobraY - 4);
}

/* Uma fileira rola quando as abas não cabem: setas nas pontas e um fade
   indicando de que lado ainda há trilha. A mesma função serve às duas
   famílias e à fileira de filtros do catálogo. */
function ajustarFileira(caixa) {
  const rol = caixa && caixa.querySelector('.trilha-abas, .chips');
  if (!rol) return;
  const sobra = rol.scrollWidth - rol.clientWidth;
  const temEsq = sobra > 4 && rol.scrollLeft > 4;
  const temDir = sobra > 4 && rol.scrollLeft < sobra - 4;
  rol.classList.toggle('fade-esq', temEsq);
  rol.classList.toggle('fade-dir', temDir);
  const esq = caixa.querySelector('.abas-seta.esq');
  const dir = caixa.querySelector('.abas-seta.dir');
  if (esq) esq.disabled = !temEsq;
  if (dir) dir.disabled = !temDir;
  caixa.classList.toggle('sem-setas', sobra <= 4);
}
function ajustarAbas() {
  FAMILIAS.forEach((f) => ajustarFileira(caixaDaFamilia(f)));
  ajustarFileira($('.chips-caixa'));
}

/* rola uma "tela" por clique, respeitando a largura disponível */
document.addEventListener('click', (e) => {
  const b = e.target.closest('.abas-seta[data-rolar], #chips-esq, #chips-dir');
  if (!b) return;
  const caixa = b.closest('.abas-caixa, .chips-caixa');
  const rol = caixa.querySelector('.trilha-abas, .chips');
  const passo = b.id === 'chips-esq' || b.dataset.rolar === '-1' ? -1 : 1;
  rol.scrollBy({ left: passo * Math.max(160, rol.clientWidth - 80), behavior: reduzMovimento ? 'auto' : 'smooth' });
});
document.addEventListener('scroll', (e) => {
  const rol = e.target;
  if (!rol.classList || !(rol.classList.contains('trilha-abas') || rol.classList.contains('chips'))) return;
  ajustarFileira(rol.closest('.abas-caixa, .chips-caixa'));
}, true);

function abrirTrilha(i, semAnimacao) {
  trilhaAtual = i;
  // as duas fileiras estão sempre à mostra: basta marcar a aba certa e trazê-la
  // para a vista dentro da fileira dela
  let ativa = null;
  document.querySelectorAll('.trilha-aba').forEach((b) => {
    const ehEsta = Number(b.dataset.idx) === i;
    b.classList.toggle('on', ehEsta);
    if (ehEsta) ativa = b;
  });
  if (ativa) {
    const rol = ativa.parentElement;
    const dir = ativa.offsetLeft - rol.scrollLeft;
    if (dir < 0) rol.scrollLeft = ativa.offsetLeft - 8;
    else if (dir + ativa.offsetWidth > rol.clientWidth)
      rol.scrollLeft = ativa.offsetLeft + ativa.offsetWidth - rol.clientWidth + 8;
  }
  ajustarAbas();
  montarDropTrilhas();
  // cancela sempre, inclusive na versão sem animação: uma troca pendente de
  // 160ms atrás sobrescreveria o painel que acabou de ser montado
  clearTimeout(trocaT);
  if (semAnimacao) {
    painelEl.classList.remove('trocando');
    painelEl.innerHTML = montarTrilha(TRILHAS[i]);
    desenharArestas(TRILHAS[i]);
    return;
  }
  painelEl.classList.add('trocando');
  trocaT = setTimeout(() => {
    painelEl.innerHTML = montarTrilha(TRILHAS[i]);
    painelEl.classList.remove('trocando');
    desenharArestas(TRILHAS[i]);
  }, 160);
}
montarAbas();
abrirTrilha(0, true);
ajustarAbas();
addEventListener('resize', ajustarAbas);
// as arestas são desenhadas sobre medidas reais: refaz quando o layout muda
let redesenhaT = null;
addEventListener('resize', () => {
  clearTimeout(redesenhaT);
  redesenhaT = setTimeout(() => desenharArestas(TRILHAS[trilhaAtual]), 120);
});
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => desenharArestas(TRILHAS[trilhaAtual]));
}

/* ==========================================================
   CATÁLOGO — busca + filtro por área
   ========================================================== */
const grade = $('#cursos-grade');
const vazio = $('#cursos-vazio');
const busca = $('#busca');
const chipsEl = $('#chips-cat');
let categoria = 'todas';

const categorias = ['todas', ...new Set(CURSOS.map((c) => c.categoria))];
function montarChips() {
  chipsEl.textContent = '';
  categorias.forEach((cat) => {
    const b = document.createElement('button');
    b.className = 'chip' + (cat === categoria ? ' on' : '');
    b.type = 'button';
    const qtd = cat === 'todas' ? CURSOS.length : CURSOS.filter((c) => c.categoria === cat).length;
    b.innerHTML = txt(cat) + '<span class="qtd">(' + qtd + ')</span>';
    b.addEventListener('click', () => {
      categoria = cat;
      chipsEl.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c === b));
      montarCatalogo();
      montarDropFiltros();
    });
    chipsEl.appendChild(b);
  });
}
montarChips();

/* Menu suspenso dos filtros (celular), pelo mesmo motivo das trilhas */
const dropFiltros = $('#drop-filtros');
function montarDropFiltros() {
  const lista = $('#drop-filtros-lista');
  lista.textContent = '';
  categorias.forEach((cat) => {
    const qtd = cat === 'todas' ? CURSOS.length : CURSOS.filter((c) => c.categoria === cat).length;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'drop-op' + (cat === categoria ? ' on' : '');
    b.textContent = txt(cat) + ' (' + qtd + ')';
    b.addEventListener('click', () => {
      categoria = cat;
      montarChips();
      montarCatalogo();
      montarDropFiltros();
      fecharDrops();
    });
    lista.appendChild(b);
  });
  const qtdAtual = categoria === 'todas' ? CURSOS.length : CURSOS.filter((c) => c.categoria === categoria).length;
  dropFiltros.querySelector('.drop-atual').textContent = txt(categoria) + ' (' + qtdAtual + ')';
}
montarDropFiltros();

/* abre/fecha e fecha ao clicar fora — vale para os dois menus */
function fecharDrops() {
  document.querySelectorAll('.drop.aberto').forEach((d) => {
    d.classList.remove('aberto');
    d.querySelector('.drop-btn').setAttribute('aria-expanded', 'false');
  });
}
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.drop-btn');
  if (!btn) { if (!e.target.closest('.drop-lista')) fecharDrops(); return; }
  const d = btn.closest('.drop');
  const abrindo = !d.classList.contains('aberto');
  fecharDrops();
  d.classList.toggle('aberto', abrindo);
  btn.setAttribute('aria-expanded', abrindo ? 'true' : 'false');
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharDrops(); });

function montarCatalogo() {
  const termo = busca.value.trim().toLowerCase();
  const lista = CURSOS.filter((c) => {
    const okCat = categoria === 'todas' || c.categoria === categoria;
    const okTermo =
      !termo ||
      c.nome.toLowerCase().includes(termo) ||
      c.resumo.toLowerCase().includes(termo) ||
      c.ementa.join(' ').toLowerCase().includes(termo) ||
      (c.topicos || []).join(' ').toLowerCase().includes(termo);
    return okCat && okTermo;
  });

  grade.innerHTML = lista
    .map((c) => {
      const nT = trilhasDoCurso(c.id).length;
      return (
        '<button class="curso-card" type="button" data-curso="' + c.id + '">' +
          '<span class="curso-topo"><span class="curso-cat">/' + txt(c.categoria) + '</span>' +
          '<span class="curso-nivel">' + txt(c.nivel) + '</span></span>' +
          '<h3>' + c.nome + '</h3>' +
          '<p>' + c.resumo + '</p>' +
          '<span class="curso-rodape"><span>' + c.horas + ' ' + txt('horas') + '</span>' +
          '<span class="trilhas-qtd">' + (nT ? txt('em') + ' ' + nT + ' ' + txt(nT > 1 ? 'trilhas' : 'trilha') : txt('curso avulso')) + '</span></span>' +
        '</button>'
      );
    })
    .join('');
  vazio.hidden = lista.length > 0;
  alinharBusca();
}

/* A caixa de busca fica com a largura exata de um cartão do catálogo, para
   as duas bordas esquerda e direita baterem. Não dá para acertar isso no
   CSS: a grade é `auto-fill` (o número de colunas muda com a largura) e a
   lista rolável ainda desconta a barra de rolagem. Então mede-se o cartão
   de verdade. Sem cartão na tela (busca sem resultado), a última largura
   boa continua valendo. */
function alinharBusca() {
  const caixa = document.querySelector('.busca');
  if (!caixa) return;
  /* no celular a busca ocupa a linha inteira e quem filtra é o menu
     suspenso — nada a alinhar, e a largura inline atrapalharia */
  if (matchMedia('(max-width:700px)').matches) { caixa.style.width = ''; return; }
  const cartao = grade.querySelector('.curso-card');
  if (cartao && cartao.offsetWidth) caixa.style.width = cartao.offsetWidth + 'px';
}
addEventListener('resize', alinharBusca);
busca.addEventListener('input', montarCatalogo);
montarCatalogo();

/* ==========================================================
   DEPOIMENTOS
   ========================================================== */
function montarDepoimentos() {
  $('#depos').innerHTML = DEPOIMENTOS.map(
    (d) =>
      '<article class="depo"><span class="depo-aspas" aria-hidden="true">“</span>' +
      '<p>' + d.texto + '</p>' +
      '<span class="depo-autor"><b>' + d.autor + '</b><span>' + d.contexto + '</span></span></article>'
  ).join('');
}
montarDepoimentos();

/* ==========================================================
   MODAL DE CURSO
   ========================================================== */
const modal = $('#modal');
const modalCorpo = $('#modal-corpo');
const modalArquivo = $('#modal-arquivo');

/* São dois modais — o do curso e o da inscrição — e a trava de rolagem, o
   Esc e o encadeamento de toque precisam saber qual está aberto, não
   presumir que é o do curso. `modalAberto()` é o que todos consultam. */
const MODAIS = () => [modal, $('#modal-assinar')];
const modalAberto = () => MODAIS().find((m) => m && !m.hidden) || null;
function fecharModais() {
  MODAIS().forEach((m) => { if (m) m.hidden = true; });
  document.documentElement.classList.remove('modal-aberto');
}

/* "faz parte de 3 trilhas de carreira" + "e de 2 trilhas de tecnologia"

   A frase inteira é UMA chave de tradução, com `{n}` no lugar do número —
   não um prefixo, mais o substantivo, mais um sufixo. Montar por pedaços
   funciona em português, onde o qualificador vem depois ("trilhas de
   carreira"), e quebra em inglês, onde ele vem antes ("career tracks"):
   saía "part of 2 tracks career tracks". Ordem de palavras é coisa que só
   a frase inteira resolve. */
function blocoDeTrilhas(lista, familia, continuacao) {
  if (!lista.length) return '';
  const n = lista.length;
  const chave = (continuacao ? 'e de {n} ' : 'faz parte de {n} ') +
    (n > 1 ? 'trilhas' : 'trilha') + ' de ' + familia;
  return '<div class="modal-bloco"><h4>' + txt(chave).replace('{n}', n) +
    '</h4><div class="modal-trilhas">' +
    lista.map((t) => '<button type="button" data-trilha="' + t.id + '">' + t.nome + ' →</button>').join('') +
    '</div></div>';
}

/* ---------- vídeo de apresentação do curso ----------
   Fachada, não iframe: mostra a capa e um botão, e só troca pelo player do
   YouTube quando alguém clica. Assim o modal abre leve, e quem não assiste
   não recebe cookie nenhum do YouTube. Sem `video` no curso, o quadro fica
   reservado — publicar o vídeo depois não reorganiza a tela. */
function blocoDeVideo(c) {
  if (!c.video) {
    return '<div class="modal-video vazio" aria-hidden="true">' +
      '<span class="video-play"></span><span class="video-aviso">' + txt('vídeo em breve') + '</span></div>';
  }
  return '<button type="button" class="modal-video" data-video="' + c.video + '" ' +
    'aria-label="' + txt('assistir à apresentação do curso') + '">' +
    '<img src="https://i.ytimg.com/vi/' + c.video + '/hqdefault.jpg" alt="" loading="lazy" />' +
    '<span class="video-play"></span></button>';
}

function abrirCurso(id) {
  const c = cursoPorId(id);
  if (!c) return;
  const trilhas = trilhasDoCurso(id);
  const deCarreira = trilhas.filter((t) => familiaDe(t) === 'carreira');
  const deTecnologia = trilhas.filter((t) => familiaDe(t) === 'tecnologia');
  modalArquivo.textContent = id + '.curso';
  /* Duas colunas onde couber (ver style.css): à esquerda o que convence —
     o que é o curso, quem fala nele e o botão; à direita o que detalha —
     ementa, tópicos, pré-requisitos e trilhas. Numa coluna só, a ordem do
     HTML já é a ordem certa de leitura. */
  modalCorpo.innerHTML =
    '<div class="modal-col modal-col-apresenta">' +
    '<h3 id="modal-titulo">' + c.nome + '</h3>' +
    '<div class="modal-meta">' +
      '<span>' + txt('área') + ': <b>' + txt(c.categoria) + '</b></span>' +
      '<span>' + txt('nível') + ': <b>' + txt(c.nivel) + '</b></span>' +
      '<span>' + txt('carga') + ': <b>' + c.horas + ' ' + txt('horas') + '</b></span>' +
    '</div>' +
    blocoDeVideo(c) +
    '<p>' + c.resumo + '</p>' +
    '<div class="modal-acoes"><button type="button" class="btn btn-primary" data-matricular="' + c.id + '">' +
      txt('Comece agora →') + '</button></div>' +
    '</div>' +
    '<div class="modal-col modal-col-detalhe">' +
    '<div class="modal-bloco"><h4>' + txt('o que você aprende') + '</h4><ul>' +
      c.ementa.map((e) => '<li>' + e + '</li>').join('') +
    '</ul></div>' +
    // lista técnica completa — recolhida, para quem quer conferir tópico a tópico
    (c.topicos && c.topicos.length
      ? '<details class="modal-topicos"><summary>' + txt('conteúdo detalhado') +
        '<span class="qtd">' + c.topicos.length + ' ' + txt('tópicos') + '</span></summary><ul>' +
        c.topicos.map((t) => '<li>' + t + '</li>').join('') +
        '</ul></details>'
      : '') +
    '<div class="modal-bloco"><h4>' + txt('pré-requisitos') + '</h4>' +
      ((c.depende || []).length
        ? '<div class="modal-trilhas pre-req">' +
          c.depende.map((d) => {
            const p = cursoPorId(d);
            return p ? '<button type="button" data-curso="' + p.id + '">← ' + p.nome + '</button>' : '';
          }).join('') + '</div>'
        : '') +
      (c.requisitos ? '<p class="dim">' + c.requisitos + '</p>' : '') +
    '</div>' +
    (depoisDe(c.id).length
      ? '<div class="modal-bloco"><h4>' + txt('abre caminho para') + '</h4><div class="modal-trilhas">' +
        depoisDe(c.id).map((p) => '<button type="button" data-curso="' + p.id + '">' + p.nome + ' →</button>').join('') +
        '</div></div>'
      : '') +
    // as duas famílias aparecem separadas: "em 5 trilhas" não diz a mesma
    // coisa se 3 são carreiras e 2 são tecnologias
    blocoDeTrilhas(deCarreira, 'carreira', false) +
    blocoDeTrilhas(deTecnologia, 'tecnologia', deCarreira.length > 0) +
    '</div>';
  modalCorpo.scrollTop = 0;
  modal.hidden = false;
  /* trava a página por baixo: a classe corta o overflow do documento e da
     tela atual, e os tratadores de roda e toque param de empurrar o fundo.
     São as duas metades do mesmo problema — a classe cuida da barra de
     rolagem e da inércia, os tratadores cuidam do encadeamento. */
  document.documentElement.classList.add('modal-aberto');
  ajustarTopicos();
  $('#modal-fechar').focus();
}

/* ---------- a lista de tópicos toma a altura que sobra ----------
   Em duas colunas o corpo do modal não rola: quem rola é a lista. Mas o
   teto dela não pode ser fixo — 48 tópicos com teto de 420px ainda faziam
   a coluna passar da altura, e o modal voltava a rolar levando o vídeo e o
   botão para fora da vista. Aqui mede-se quanto a coluna excede e tira-se
   esse tanto da lista, que é o único bloco que pode encolher sem perder
   informação (ela rola). Piso de 140px: abaixo disso a lista deixa de ser
   legível e é melhor a coluna rolar.

   Por que em JS e não no CSS: o `<details>` do Chrome envolve o conteúdo
   num slot, então o `ul` não vira item flex e `flex:1 1 auto` nele é
   ignorado pelo layout. */
function ajustarTopicos() {
  const det = modalCorpo.querySelector('.modal-topicos');
  const lista = det && det.querySelector('ul');
  if (!lista) return;
  lista.style.maxHeight = '';
  if (!det.open || !matchMedia('(min-width:1024px)').matches) return;
  const col = det.closest('.modal-col-detalhe');
  if (!col) return;
  const excedente = col.scrollHeight - col.clientHeight;
  if (excedente > 0) lista.style.maxHeight = Math.max(140, lista.clientHeight - excedente) + 'px';
}
addEventListener('resize', ajustarTopicos);
modalCorpo.addEventListener('toggle', (e) => {
  if (e.target.classList.contains('modal-topicos')) ajustarTopicos();
}, true);

function fecharModal() { fecharModais(); }

/* FAQ: uma pergunta aberta por vez. O `toggle` não borbulha, então a
   escuta vai na fase de captura — e é uma só, no contêiner, em vez de uma
   por <details>: assim vale para as perguntas que entrarem depois. */
const faqTela = $('#faq .faq');
if (faqTela) {
  faqTela.addEventListener('toggle', (e) => {
    const alvo = e.target;
    if (alvo.tagName !== 'DETAILS' || !alvo.open) return;
    faqTela.querySelectorAll('details[open]').forEach((d) => { if (d !== alvo) d.open = false; });
  }, true);
}

// abrir a partir dos cartões e dos nós das trilhas
document.addEventListener('click', (e) => {
  /* Setas do grafo: avança/retrocede uma tela de níveis. O seletor precisa
     da classe — as setas das fileiras de abas também usam `data-rolar`, e
     com o seletor solto um clique nelas rolava as abas (tratador de cima)
     e o grafo junto. */
  const rolar = e.target.closest('.grafo-seta[data-rolar]');
  if (rolar) {
    const rol = painelEl.querySelector('.trilha-grafo');
    if (rol) rol.scrollBy({ left: Number(rolar.dataset.rolar) * Math.max(240, rol.clientWidth - 120), behavior: reduzMovimento ? 'auto' : 'smooth' });
    return;
  }

  // etapa com bifurcação: troca o caminho sem sair do lugar
  const garfo = e.target.closest('[data-garfo]');
  if (garfo) {
    const t = TRILHAS[trilhaAtual];
    escolhas[t.id + ':' + garfo.dataset.garfo] = Number(garfo.dataset.opcao);
    const rol = painelEl.querySelector('.trilha-grafo');
    const x = rol ? rol.scrollLeft : 0;
    const y = rol ? rol.scrollTop : 0;
    painelEl.innerHTML = montarTrilha(t);
    const novo = painelEl.querySelector('.trilha-grafo');
    if (novo) { novo.scrollLeft = x; novo.scrollTop = y; }
    desenharArestas(t);
    return;
  }

  // botão do modal: o curso não é mais unidade de compra, então ele não
  // escolhe plano — vai como origem do pedido
  const btnMat = e.target.closest('[data-matricular]');
  if (btnMat) { abrirAssinatura('', btnMat.dataset.matricular); return; }

  // botões dos três cartões de plano: levam o plano escolhido para o combo
  const btnPlano = e.target.closest('.plano-btn');
  if (btnPlano) {
    e.preventDefault();
    abrirAssinatura(btnPlano.closest('.plano').querySelector('.plano-nome').textContent.trim());
    return;
  }

  // capa do vídeo: agora sim carrega o player, já tocando
  const capa = e.target.closest('[data-video]');
  if (capa) {
    const quadro = document.createElement('div');
    quadro.className = 'modal-video tocando';
    quadro.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + capa.dataset.video +
      '?autoplay=1&rel=0" title="' + txt('apresentação do curso') + '" allowfullscreen ' +
      'allow="accelerometer; autoplay; encrypted-media; picture-in-picture"></iframe>';
    capa.replaceWith(quadro);
    return;
  }

  const alvo = e.target.closest('[data-curso]');
  if (alvo) { abrirCurso(alvo.dataset.curso); return; }

  // dentro do modal: saltar para a trilha citada
  const btnTrilha = e.target.closest('[data-trilha]');
  if (btnTrilha) {
    const i = TRILHAS.findIndex((t) => t.id === btnTrilha.dataset.trilha);
    if (i > -1) {
      fecharModal();
      abrirTrilha(i, true);
      irPara(telas.findIndex((t) => t.id === 'trilhas'));
    }
    return;
  }

  if (e.target.closest('[data-fechar]')) fecharModal();
});

$('#modal-fechar').addEventListener('click', fecharModais);
modal.addEventListener('click', (e) => { if (e.target === modal) fecharModais(); });
$('#assinar-fechar').addEventListener('click', fecharModais);
$('#modal-assinar').addEventListener('click', (e) => {
  if (e.target === $('#modal-assinar')) fecharModais();
});
$('#cta-assinar').addEventListener('click', () => abrirAssinatura());


/* ==========================================================
   MATRÍCULA
   Cole em MATRICULA_URL a URL de POST do seu formulário
   (Formspree, Web3Forms, Brevo...). Vazio = modo demonstração.
   ========================================================== */
const MATRICULA_URL = '';

/* O combo lista os planos, e a lista sai dos próprios cartões da tela de
   planos — não de um array paralelo aqui. Assim, mexer nos cartões do
   `index.html` (acrescentar um quarto plano, renomear, tirar um) ajusta o
   formulário sozinho, e não existe a chance de os dois discordarem. Como
   roda depois de `aplicarTextos()`, os nomes já vêm no idioma da vez. */
const selPlano = $('#m-plano');
const planosDaTela = () =>
  [...document.querySelectorAll('#planos .plano-nome')].map((h) => h.textContent.trim());

function montarSelectPlanos() {
  const antes = selPlano.value;
  selPlano.innerHTML =
    '<option value="">' + txt('ainda não sei — quero orientação') + '</option>' +
    planosDaTela().map((n) => '<option value="' + n + '">' + n + '</option>').join('');
  selPlano.value = antes;
}
montarSelectPlanos();

/* De onde a pessoa veio, quando veio de um curso. O curso deixou de ser
   unidade de compra, então não vira opção do combo — mas saber que o
   pedido nasceu olhando "Kubernetes" vale para quem for atender. */
let cursoDeOrigem = '';

/* Abre o modal de inscrição. Vem de três lugares, e o que muda entre eles
   é só quanta coisa o formulário ainda precisa perguntar:

   - botão de um plano  → o plano é o cabeçalho e o seletor some. Sobram
                          dois campos, que é o formulário mais curto possível.
   - "Comece agora"     → ninguém escolheu plano ainda, então o seletor
                          aparece, começando em "ainda não sei".
   - botão do modal de  → como o de cima, mas guarda o curso que a pessoa
     um curso             estava olhando para ir junto no envio.

   O foco vai para o × e não para o campo de nome: em celular, focar um
   input na abertura escancara o teclado virtual por cima do modal antes de
   a pessoa ler o que ele diz. */
const modalAssinar = $('#modal-assinar');
const assinarPlano = $('#assinar-plano');
const campoPlano = $('#campo-plano');

function abrirAssinatura(plano, origem) {
  fecharModais();
  cursoDeOrigem = origem || '';
  statusMat.textContent = '';
  const conhecido = plano && planosDaTela().includes(plano);
  if (conhecido) {
    $('#assinar-plano-nome').textContent = plano;
    selPlano.value = plano;
  } else {
    selPlano.value = '';
  }
  assinarPlano.hidden = !conhecido;
  campoPlano.hidden = !!conhecido;
  modalAssinar.hidden = false;
  document.documentElement.classList.add('modal-aberto');
  $('#assinar-fechar').focus();
}

const formMat = $('#form-matricula');
const statusMat = $('#form-status');

/* ---------- o campo aceita whatsapp OU e-mail ----------
   Enquanto o que foi digitado puder ser um telefone, a máscara entra
   sozinha: (45) 90000-0000 no celular de nove dígitos, (45) 0000-0000 no
   fixo. Assim que aparece letra ou @, a máscara se desfaz e o campo volta
   a ser texto livre — senão "123abc@..." viraria "(12) 3abc@...".
   Número internacional (começa com +) também fica intacto. */
const contatoEl = $('#m-contato');
const soDigitos = (s) => s.replace(/\D/g, '');
const sinaisDaMascara = /[()\s-]/g;

function comMascaraDeTelefone(d) {
  d = d.slice(0, 11);
  if (d.length <= 2) return d ? '(' + d : '';
  const resto = d.slice(2);
  if (!resto.length) return '(' + d.slice(0, 2) + ') ';
  if (resto.length <= 4) return '(' + d.slice(0, 2) + ') ' + resto;
  const corte = resto.length > 8 ? 5 : 4;   // celular tem nove dígitos, fixo tem oito
  return '(' + d.slice(0, 2) + ') ' + resto.slice(0, corte) + '-' + resto.slice(corte);
}

contatoEl.addEventListener('input', () => {
  const v = contatoEl.value;
  const ehTelefone = !/[^\d()\s-]/.test(v);
  if (!ehTelefone) {
    // e-mail (ou número internacional): tira a máscara que já tenha entrado
    const limpo = v.replace(sinaisDaMascara, '');
    if (limpo !== v && !/\s/.test(limpo)) contatoEl.value = limpo;
    return;
  }
  const pos = contatoEl.selectionStart;
  const digitosAntes = soDigitos(v.slice(0, pos)).length;
  const novo = comMascaraDeTelefone(soDigitos(v));
  if (novo === v) return;
  contatoEl.value = novo;
  // recoloca o cursor depois do mesmo dígito em que ele estava
  let i = 0;
  for (let vistos = 0; i < novo.length && vistos < digitosAntes; i += 1) {
    if (/\d/.test(novo[i])) vistos += 1;
  }
  contatoEl.setSelectionRange(i, i);
});

formMat.addEventListener('submit', (e) => {
  e.preventDefault();
  const nome = $('#m-nome').value.trim();
  const contato = $('#m-contato').value.trim();
  if (!nome || !contato) {
    statusMat.textContent = '✗ preencha nome e contato';
    return;
  }
  const dados = {
    nome,
    contato,
    plano: selPlano.value || 'sem preferência',
  };
  if (cursoDeOrigem) dados.origem = 'curso:' + cursoDeOrigem;
  if (!MATRICULA_URL) {
    statusMat.textContent = '✓ pedido registrado — ' + nome + ' (modo demonstração: configure MATRICULA_URL)';
    formMat.reset();
    return;
  }
  statusMat.textContent = '… enviando';
  fetch(MATRICULA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  })
    .then(() => {
      statusMat.textContent = '✓ recebemos seu contato — falaremos com você em breve!';
      formMat.reset();
    })
    .catch(() => {
      statusMat.textContent = '✗ falha ao enviar — escreva para contact@codeschool.ing';
    });
});

/* ==========================================================
   NEWSLETTER
   Cole em NEWSLETTER_URL a URL de POST do provedor (Brevo,
   Mailchimp, MailerLite...). Vazio = modo demonstração.
   ========================================================== */
const NEWSLETTER_URL = '';

const newsForm = $('#news-form');
const newsEmail = $('#news-email');
const newsStatus = $('#news-status');

newsForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = newsEmail.value.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    newsStatus.textContent = '✗ informe um e-mail válido';
    return;
  }
  if (!NEWSLETTER_URL) {
    newsStatus.textContent = '✓ inscrição registrada — ' + email + ' (modo demonstração)';
    newsForm.reset();
    return;
  }
  newsStatus.textContent = '… enviando';
  const dados = new FormData();
  dados.append('EMAIL', email);
  fetch(NEWSLETTER_URL, { method: 'POST', mode: 'no-cors', body: dados })
    .then(() => {
      newsStatus.textContent = '✓ inscrição confirmada — bem-vindo(a) a bordo!';
      newsForm.reset();
    })
    .catch(() => {
      newsStatus.textContent = '✗ falha ao enviar — tente novamente em instantes';
    });
});

/* ==========================================================
   FULLPAGE — cada seção ocupa a tela; a rolagem salta entre elas
   ========================================================== */
const telas = Array.from(document.querySelectorAll('.screen'));
const reduzMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;
let atual = 0;
let travado = false;
let travaT = null;

/* indicadores laterais */
const dots = document.createElement('div');
dots.className = 'dots';
telas.forEach((tela, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.setAttribute('aria-label', 'Ir para a seção ' + (i + 1));
  b.addEventListener('click', () => irPara(i));
  dots.appendChild(b);
});
document.body.appendChild(dots);

const linksMenu = Array.from(document.querySelectorAll('.navlinks a[href^="#"]'));

function marcarAtiva() {
  dots.querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', i === atual));
  const id = '#' + telas[atual].id;
  linksMenu.forEach((a) => a.classList.toggle('on', a.getAttribute('href') === id));
}

function irPara(i) {
  i = Math.max(0, Math.min(telas.length - 1, i));
  const destino = telas[i].offsetTop;
  if (i === atual && Math.abs(window.scrollY - destino) < 4) return;
  travado = true;
  atual = i;
  window.scrollTo({ top: destino, behavior: reduzMovimento ? 'auto' : 'smooth' });
  marcarAtiva();
  clearTimeout(travaT);
  travaT = setTimeout(() => { travado = false; }, 950);
}

/* a tela atual ainda pode rolar internamente nessa direção? */
function noLimite(tela, dir) {
  if (tela.scrollHeight <= tela.clientHeight + 4) return true;
  return dir > 0
    ? tela.scrollTop + tela.clientHeight >= tela.scrollHeight - 4
    : tela.scrollTop <= 4;
}

/* passar o cursor por um curso acende as arestas que chegam nele e saem dele */
painelEl.addEventListener('mouseover', (e) => {
  const no = e.target.closest('[data-no]');
  if (!no) return;
  const id = no.dataset.no;
  painelEl.querySelectorAll('.aresta').forEach((a) => {
    a.classList.toggle('on', a.dataset.de === id || a.dataset.para === id);
  });
});
painelEl.addEventListener('mouseout', (e) => {
  if (e.target.closest('[data-no]')) painelEl.querySelectorAll('.aresta.on').forEach((a) => a.classList.remove('on'));
});

/* o grafo avisa as setas quando é arrastado direto */
painelEl.addEventListener('scroll', (e) => {
  if (e.target.classList && e.target.classList.contains('trilha-grafo')) ajustarSetasGrafo();
}, true);

/* painéis com rolagem própria (catálogo, trilha no celular, depoimentos) */
function rolavelInterno(alvo, dir, tela) {
  let el = alvo instanceof Element ? alvo : null;
  while (el && el !== tela && el !== document.body) {
    if (el.scrollHeight > el.clientHeight + 4) {
      const pode = dir > 0
        ? el.scrollTop + el.clientHeight < el.scrollHeight - 4
        : el.scrollTop > 4;
      if (pode) return el;
    }
    el = el.parentElement;
  }
  return null;
}

/* roda do mouse / trackpad */
window.addEventListener('wheel', (e) => {
  const aberto = modalAberto();
  if (aberto) {
    // dentro do modal, o que tem rolagem própria continua rolando; o resto
    // não empurra a página por baixo (o `return` seco deixava passar)
    const d = e.deltaY > 0 ? 1 : -1;
    if (!rolavelInterno(e.target, d, aberto)) e.preventDefault();
    return;
  }
  e.preventDefault();
  if (travado) return;
  const dir = e.deltaY > 0 ? 1 : -1;
  const tela = telas[atual];
  const interno = rolavelInterno(e.target, dir, tela);
  if (interno) { interno.scrollTop += e.deltaY; return; }
  if (!noLimite(tela, dir)) { tela.scrollTop += e.deltaY; return; }
  if (Math.abs(e.deltaY) < 8) return;
  irPara(atual + dir);
}, { passive: false });

/* teclado */
window.addEventListener('keydown', (e) => {
  if (modalAberto()) {
    if (e.key === 'Escape') fecharModais();
    return;
  }
  if (/^(INPUT|TEXTAREA|SELECT|BUTTON|SUMMARY)$/.test(e.target.tagName)) return;
  const desce = ['ArrowDown', 'PageDown', ' '].includes(e.key);
  const sobe = ['ArrowUp', 'PageUp'].includes(e.key);
  if (desce || sobe) {
    e.preventDefault();
    if (!travado) irPara(atual + (desce ? 1 : -1));
  } else if (e.key === 'Home') {
    e.preventDefault(); irPara(0);
  } else if (e.key === 'End') {
    e.preventDefault(); irPara(telas.length - 1);
  } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && telas[atual].id === 'trilhas') {
    e.preventDefault();
    // as setas andam dentro da família da trilha aberta, não pela lista inteira
    const daFamilia = indicesDaFamilia(familiaDe(TRILHAS[trilhaAtual]));
    const pos = daFamilia.indexOf(trilhaAtual) + (e.key === 'ArrowRight' ? 1 : -1);
    abrirTrilha(daFamilia[Math.max(0, Math.min(daFamilia.length - 1, pos))]);
  }
});

/* toque (celular e tablet) */
let toqueY = null;
let toqueAlvo = null;
window.addEventListener('touchstart', (e) => {
  toqueY = e.touches[0].clientY;
  toqueAlvo = e.target;
}, { passive: true });
window.addEventListener('touchmove', (e) => {
  if (toqueY === null) return;
  const abertoT = modalAberto();
  if (abertoT) {
    const d = toqueY - e.touches[0].clientY > 0 ? 1 : -1;
    if (!rolavelInterno(toqueAlvo, d, abertoT)) e.preventDefault();
    return;
  }
  const dir = toqueY - e.touches[0].clientY > 0 ? 1 : -1;
  if (rolavelInterno(toqueAlvo, dir, telas[atual])) return;
  if (toqueAlvo instanceof Element && toqueAlvo.closest('.trilha-fluxo')) return;
  if (noLimite(telas[atual], dir)) e.preventDefault();
}, { passive: false });
window.addEventListener('touchend', (e) => {
  if (toqueY === null || modalAberto()) return;
  const delta = toqueY - e.changedTouches[0].clientY;
  const alvo = toqueAlvo;
  toqueY = null;
  toqueAlvo = null;
  if (travado || Math.abs(delta) < 50) return;
  const dir = delta > 0 ? 1 : -1;
  if (rolavelInterno(alvo, dir, telas[atual])) return;
  if (noLimite(telas[atual], dir)) irPara(atual + dir);
});

/* âncoras internas (menu, botões do hero, modal) */
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const alvo = document.querySelector(a.getAttribute('href'));
    if (!alvo) return;
    const i = telas.indexOf(alvo.closest('.screen') || alvo);
    if (i > -1) {
      e.preventDefault();
      menu.classList.remove('open');
      irPara(i);
    }
  });
});

/* ressincroniza se a barra de rolagem for arrastada */
let syncT = null;
window.addEventListener('scroll', () => {
  if (travado) return;
  clearTimeout(syncT);
  syncT = setTimeout(() => {
    let melhor = 0, menorDist = Infinity;
    telas.forEach((tela, i) => {
      const d = Math.abs(tela.offsetTop - window.scrollY);
      if (d < menorDist) { menorDist = d; melhor = i; }
    });
    if (melhor !== atual) { atual = melhor; marcarAtiva(); }
  }, 120);
});

window.addEventListener('resize', () => window.scrollTo({ top: telas[atual].offsetTop }));

/* âncora na URL ao carregar (ex.: /#cursos) */
if (location.hash) {
  const alvo = document.querySelector(location.hash);
  const i = telas.indexOf(alvo ? alvo.closest('.screen') || alvo : null);
  if (i > -1) { atual = i; window.scrollTo({ top: telas[i].offsetTop }); }
}

/* rodapé: links das trilhas abrem a tela de trilhas já na escolhida */
marcarAtiva();

/* ==========================================================
   IDIOMA — ver assets/i18n-runtime.js
   A troca refaz tudo o que nasce de texto: os nós estáticos, os dados
   traduzidos e as três telas que se montam a partir deles.
   ========================================================== */
function redesenharTudo() {
  montarAbas();
  montarChips();
  montarDropFiltros();
  montarCatalogo();
  montarDepoimentos();
  montarSelectPlanos();
  abrirTrilha(trilhaAtual, true);
  ajustarAbas();
  mostrarHoras();
  montarTerminal();
}

const idiomaCaixa = $('#idioma');
idiomaCaixa.querySelector('.idioma-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  const aberto = idiomaCaixa.classList.toggle('aberto');
  e.currentTarget.setAttribute('aria-expanded', aberto ? 'true' : 'false');
});
document.addEventListener('click', (e) => { if (!e.target.closest('#idioma')) fecharIdioma(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharIdioma(); });

guardarBase();
mapearTextos();
aplicarIdioma();
