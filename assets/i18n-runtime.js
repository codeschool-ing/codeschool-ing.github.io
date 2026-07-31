/* ==========================================================================
   codeschool.ing — internacionalização (pt-BR · en · es)

   A CHAVE É O PRÓPRIO TEXTO EM PORTUGUÊS. Isso tem três consequências boas:
   o português não precisa de dicionário (é a origem), o HTML não precisa de
   atributos `data-i18n`, e qualquer string ainda não traduzida cai de volta
   no português sozinha, sem quebrar a tela.

   Os dicionários vivem em assets/i18n.js, em window.I18N.

   Detecção: usa `navigator.languages`, que é o IDIOMA configurado no
   navegador — não geolocalização. É o sinal certo: um brasileiro acessando
   de fora continua querendo português, e não exige permissão do usuário.
   ========================================================================== */

const IDIOMAS = [
  { cod: 'pt', html: 'pt-BR', rotulo: 'Português', curto: 'PT' },
  { cod: 'en', html: 'en',    rotulo: 'English',   curto: 'EN' },
  { cod: 'es', html: 'es',    rotulo: 'Español',   curto: 'ES' },
  { cod: 'fr', html: 'fr',    rotulo: 'Français',  curto: 'FR' },
  { cod: 'it', html: 'it',    rotulo: 'Italiano',  curto: 'IT' },
];
const CHAVE_IDIOMA = 'codeschool-idioma';

function idiomaDoNavegador() {
  const lista = (navigator.languages && navigator.languages.length)
    ? navigator.languages : [navigator.language || 'pt-BR'];
  for (const l of lista) {
    const base = String(l).toLowerCase().split('-')[0];
    if (IDIOMAS.some((i) => i.cod === base)) return base;
  }
  return 'pt';
}

let IDIOMA = (() => {
  try {
    const salvo = localStorage.getItem(CHAVE_IDIOMA);
    if (salvo && IDIOMAS.some((i) => i.cod === salvo)) return salvo;
  } catch (e) { /* modo privado: cai na detecção */ }
  return idiomaDoNavegador();
})();

/* tradução de uma string de interface; sem entrada, devolve o português */
function txt(s) {
  const d = window.I18N && window.I18N[IDIOMA] && window.I18N[IDIOMA].ui;
  return (d && d[s]) || s;
}

/* ---------- textos estáticos da página ----------
   Um passeio único pelo DOM guarda o texto original de cada elemento-folha.
   Trocar de idioma é reescrever esses mesmos nós. Os contêineres montados
   por JavaScript ficam de fora: eles se refazem a partir dos dados. */
const DINAMICOS = [
  '#trilha-painel', '#cursos-grade', '#chips-cat', '#modal-corpo',
  '#abas-carreira', '#abas-tecnologia', '#depos', '#m-interesse',
  '#drop-trilhas-lista', '#drop-filtros-lista', '.drop-atual',
];
const textosOriginais = [];   // { el, tipo, original, bruto }

function mapearTextos() {
  const fora = (el) => !el || el.closest('script,style') || DINAMICOS.some((sel) => el.closest(sel));
  /* Passeio pelos NÓS DE TEXTO, não pelos elementos: só assim entram as
     frases partidas por <strong> e <span> no meio, como o parágrafo do topo
     e os números do rodapé do hero. */
  const andarilho = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (andarilho.nextNode()) {
    const n = andarilho.currentNode;
    if (fora(n.parentElement)) continue;
    const s = n.nodeValue.trim();
    if (s.length > 2 && /[A-Za-zÀ-ÿ]/.test(s)) {
      textosOriginais.push({ el: n, tipo: 'no', original: s, bruto: n.nodeValue });
    }
  }
  document.querySelectorAll('[placeholder]').forEach((el) => {
    if (!fora(el)) textosOriginais.push({ el, tipo: 'placeholder', original: el.getAttribute('placeholder') });
  });
  document.querySelectorAll('[aria-label]').forEach((el) => {
    if (!fora(el)) textosOriginais.push({ el, tipo: 'aria-label', original: el.getAttribute('aria-label') });
  });
  document.querySelectorAll('[title]').forEach((el) => {
    if (!fora(el)) textosOriginais.push({ el, tipo: 'title', original: el.getAttribute('title') });
  });
  const meta = document.querySelector('meta[name="description"]');
  if (meta) textosOriginais.push({ el: meta, tipo: 'content', original: meta.getAttribute('content') });
  const tit = document.querySelector('title');
  if (tit) textosOriginais.push({ el: tit, tipo: 'titulo', original: tit.textContent.trim() });
}

function aplicarTextos() {
  textosOriginais.forEach((r) => {
    if (!r.el) return;
    const v = txt(r.original);
    if (r.tipo === 'no') r.el.nodeValue = r.bruto.replace(r.original, v);
    else if (r.tipo === 'titulo') r.el.textContent = v;
    else r.el.setAttribute(r.tipo, v);
  });
}

/* lista as frases sem tradução no idioma atual — usada na conferência */
function faltamTraducoes() {
  const d = (window.I18N[IDIOMA] && window.I18N[IDIOMA].ui) || {};
  return [...new Set(textosOriginais.map((r) => r.original))].filter((s) => !d[s]);
}

/* ---------- conteúdo do catálogo ----------
   Guarda-se o português original de cada campo e, na troca de idioma, os
   objetos de CURSOS/TRILHAS/DEPOIMENTOS são reescritos no lugar. Assim todo
   o resto do código continua lendo `c.nome` sem saber que existe tradução —
   e cada campo cai no português sozinho quando falta a versão traduzida. */
const BASE_PT = { cursos: {}, trilhas: {}, depoimentos: [] };

function guardarBase() {
  CURSOS.forEach((c) => {
    BASE_PT.cursos[c.id] = {
      nome: c.nome, resumo: c.resumo, ementa: c.ementa,
      topicos: c.topicos, requisitos: c.requisitos,
    };
  });
  TRILHAS.forEach((tr) => {
    const etapas = {};
    tr.cursos.forEach((item, ix) => {
      if (ehEscolha(item)) {
        etapas[ix] = { escolha: item.escolha, nota: item.nota, opcoes: item.opcoes.map((o) => o.nome) };
      }
    });
    BASE_PT.trilhas[tr.id] = { nome: tr.nome, objetivo: tr.objetivo, saida: tr.saida, etapas };
  });
  DEPOIMENTOS.forEach((d) => BASE_PT.depoimentos.push({ texto: d.texto, autor: d.autor, contexto: d.contexto }));
}

function aplicarConteudo() {
  const dic = (window.I18N && window.I18N[IDIOMA]) || {};
  const dc = dic.cursos || {}, dt = dic.trilhas || {}, dd = dic.depoimentos || [];

  CURSOS.forEach((c) => {
    const pt = BASE_PT.cursos[c.id], tr = dc[c.id] || {};
    c.nome = tr.nome || pt.nome;
    c.resumo = tr.resumo || pt.resumo;
    c.ementa = tr.ementa || pt.ementa;
    c.topicos = tr.topicos || pt.topicos;
    c.requisitos = tr.requisitos !== undefined ? tr.requisitos : pt.requisitos;
  });

  TRILHAS.forEach((trilha) => {
    const pt = BASE_PT.trilhas[trilha.id], tr = dt[trilha.id] || {};
    trilha.nome = tr.nome || pt.nome;
    trilha.objetivo = tr.objetivo || pt.objetivo;
    trilha.saida = tr.saida || pt.saida;
    trilha.cursos.forEach((item, ix) => {
      if (!ehEscolha(item)) return;
      const ptE = pt.etapas[ix], trE = (tr.etapas || {})[ix] || {};
      item.escolha = trE.escolha || ptE.escolha;
      item.nota = trE.nota || ptE.nota;
      item.opcoes.forEach((o, io) => { o.nome = (trE.opcoes && trE.opcoes[io]) || ptE.opcoes[io]; });
    });
  });

  DEPOIMENTOS.forEach((d, i) => {
    const pt = BASE_PT.depoimentos[i], tr = dd[i] || {};
    d.texto = tr.texto || pt.texto;
    d.autor = tr.autor || pt.autor;
    d.contexto = tr.contexto || pt.contexto;
  });
}

/* ---------- seletor ---------- */
function montarSeletorIdioma() {
  const caixa = document.querySelector('#idioma-menu');
  if (!caixa) return;
  caixa.textContent = '';
  IDIOMAS.forEach((i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'idioma-op' + (i.cod === IDIOMA ? ' on' : '');
    b.lang = i.html;
    b.textContent = i.rotulo;
    b.addEventListener('click', () => { trocarIdioma(i.cod); fecharIdioma(); });
    caixa.appendChild(b);
  });
  const atual = IDIOMAS.find((i) => i.cod === IDIOMA);
  document.querySelector('#idioma-curto').textContent = atual.curto;
  document.documentElement.lang = atual.html;
}
function fecharIdioma() {
  const c = document.querySelector('#idioma');
  if (c) { c.classList.remove('aberto'); c.querySelector('.idioma-btn').setAttribute('aria-expanded', 'false'); }
}

function trocarIdioma(cod) {
  if (cod === IDIOMA) return;
  IDIOMA = cod;
  try { localStorage.setItem(CHAVE_IDIOMA, cod); } catch (e) { /* modo privado */ }
  aplicarIdioma();
}

/* refaz tudo o que depende de texto: os estáticos, os dados e as telas que
   se montam a partir deles */
function aplicarIdioma() {
  aplicarConteudo();
  aplicarTextos();
  montarSeletorIdioma();
  if (typeof redesenharTudo === 'function') redesenharTudo();
}
