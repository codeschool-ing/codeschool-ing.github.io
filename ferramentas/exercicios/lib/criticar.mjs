/* Etapa 3: julgar o que executar não revela — alvo, ambiguidade, gabarito, distratores.
 *
 * Duas sondas comportamentais valem mais que o julgamento: um modelo a quem se pede
 * "avalie a qualidade" de um texto escrito por outro modelo tende a concordar. Sonda
 * observa comportamento; julgamento é opinião.
 */
import { contexto } from './catalogo.mjs';
import { perguntar } from './claude.mjs';

/* ---- sonda: responder às cegas -------------------------------------------- */

const SYS_CEGO = `Você responde questões de múltipla escolha. Não sabe quais alternativas
estão marcadas como corretas — escolha pelo mérito.

Se mais de uma leitura for defensável, diga em "ambigua" e explique. Uma questão bem escrita
tem exatamente um conjunto de respostas defensável.`;

const ESQ_CEGO = {
  type: 'object',
  properties: {
    escolhas: { type: 'array', items: { type: 'integer' }, description: 'índices escolhidos, começando em 0' },
    ambigua: { type: 'boolean' },
    explicacao: { type: 'string' },
  },
  required: ['escolhas', 'ambigua', 'explicacao'],
  additionalProperties: false,
};

async function sondaCego(e) {
  const multi = e.tipo === 'multipla-escolha';
  const r = await perguntar({
    etapa: 'criticar',
    system: SYS_CEGO,
    esquema: ESQ_CEGO,
    maxTokens: 4000,
    pergunta: `${e.enunciado}${multi ? '\n\n(mais de uma alternativa pode estar correta)' : ''}\n\n${e.alternativas
      .map((a, i) => `${i}. ${a.texto}`)
      .join('\n')}`,
  });
  if (r.erro) return { erro: r.erro };
  const gabarito = e.alternativas.map((a, i) => (a.correta ? i : -1)).filter((i) => i >= 0);
  const escolhas = [...(r.escolhas ?? [])].sort();
  const bateu = escolhas.length === gabarito.length && escolhas.every((v, i) => v === gabarito[i]);
  return { escolhas, gabarito, bateu, ambigua: r.ambigua, explicacao: r.explicacao };
}

/* ---- sonda: a dica entrega a resposta? ------------------------------------ */

const SYS_DICA_ABERTA = `Você recebe um exercício e uma dica de estudo. Julgue se a dica
entrega a solução.

Marque "entrega" como verdadeiro se ela contiver o nome exato da função a chamar, o
algoritmo pronto ou o valor de saída. Marque falso se apenas aponta a direção, faz uma
pergunta ou nomeia o conceito a revisar.

Critério: alguém que só lesse a dica, sem saber o assunto, produziria a resposta?`;

const SYS_DICA_ALTERNATIVAS = `Você recebe uma questão de alternativas e uma dica de estudo.
Julgue se a dica torna o exercício inútil.

**Cuidado com o falso positivo.** Numa questão de alternativas, qualquer dica útil estreita o
campo — é para isso que ela existe. Estreitar não é defeito. O defeito é a dica
**substituir o entendimento**: quem a lê marca a certa sem conseguir explicar por quê.

Verdadeiro só quando a dica praticamente reproduz o texto da alternativa correta, enuncia o
critério de decisão inteiro pronto para aplicar, ou descarta sozinha o distrator mais forte.
Falso quando indica o que examinar, propõe um teste que o aluno ainda precisa executar, ou
nomeia o conceito sem resolvê-lo.`;

const ESQ_DICA = {
  type: 'object',
  properties: { entrega: { type: 'boolean' }, explicacao: { type: 'string' } },
  required: ['entrega', 'explicacao'],
  additionalProperties: false,
};

const COM_ALTERNATIVAS = new Set(['quiz', 'multipla-escolha']);

async function sondaDica(e) {
  return perguntar({
    etapa: 'criticar',
    system: COM_ALTERNATIVAS.has(e.tipo) ? SYS_DICA_ALTERNATIVAS : SYS_DICA_ABERTA,
    esquema: ESQ_DICA,
    maxTokens: 3000,
    pergunta: `## Exercício\n${e.enunciado}\n\n## Dica\n${e.dica_socratica}`,
  });
}

/* ---- julgamento ----------------------------------------------------------- */

const SYS_JULGA = `Você revisa exercícios de uma escola de programação onde a correção é toda
automática — não há professor para desfazer mal-entendido. Um exercício ambíguo ou fora do
alvo reprova aluno que entendeu o assunto.

Sua tarefa é **encontrar defeito**, não elogiar. A falha a evitar é aprovar um exercício com
problema real; listar problema inexistente é menos grave. Se não houver defeito, devolva a
lista vazia — mas procure de verdade antes.

Defeitos que já apareceram neste catálogo:

**alvo** — mede outra coisa que não o tópico declarado. Exemplo real: num curso sobre o papel
do arquiteto, um exercício pedia para implementar busca em grafo. Mede programação, não
arquitetura. Também conta como alvo errado exigir conteúdo de tópico posterior: um exercício
de "instalação e primeiro script" que precisa de \`strip()\`, condicional e f-string reprova
quem domina o tópico avaliado.

**enunciado** — ambíguo, ou contradiz a semântica da linguagem. Exemplo real: exercício sobre
operadores exibindo \`-7 ** 2 = 49\`. O valor está certo para a variável, mas quem digitar
\`-7 ** 2\` no interpretador vê -49. Também conta não especificar a saída exigida quando a
correção é por comparação exata.

**gabarito** — a resposta marcada não é a melhor, ou outra se defende igualmente.

**distratores** — erradas óbvias demais; ou a correta mais longa e mais qualificada que as
outras, entregando-se pelo formato; ou absolutos que quem faz prova descarta por hábito; ou
erradas todas de uma categoria e a correta de outra.

**A régua da gravidade é uma pergunta só: isso muda quem passa?**

Marque **alta** quando o defeito faz o exercício aprovar quem não sabe, ou reprovar quem
sabe. Sem exceção, mesmo que o conserto seja fácil:

- dá para acertar por eliminação, pelo formato, pelo tamanho da alternativa ou por heurística
  de prova, sem entender o tópico — o exercício não mede nada;
- exige conteúdo de tópico posterior;
- erro factual, ou ambiguidade que muda qual resposta está certa;
- a saída exigida não está no enunciado, e a correção é por comparação exata.

Marque **baixa** só para o que não altera o resultado de ninguém.

Não use "baixa" como meio-termo educado. Um exercício que qualquer aluno acerta sem estudar é
defeituoso mesmo que esteja bem escrito.`;

const ESQ_JULGA = {
  type: 'object',
  properties: {
    problemas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          dimensao: { type: 'string', enum: ['alvo', 'enunciado', 'gabarito', 'distratores', 'dica'] },
          gravidade: { type: 'string', enum: ['alta', 'baixa'] },
          explicacao: { type: 'string' },
          sugestao: { type: 'string' },
        },
        required: ['dimensao', 'gravidade', 'explicacao', 'sugestao'],
        additionalProperties: false,
      },
    },
  },
  required: ['problemas'],
  additionalProperties: false,
};

function corpo(e) {
  if (COM_ALTERNATIVAS.has(e.tipo))
    return e.alternativas.map((a, i) => `${i}. [${a.correta ? 'CORRETA' : 'errada'}] ${a.texto}\n   porque: ${a.porque}`).join('\n');
  if (e.tipo === 'codigo')
    return `Linguagem: ${e.linguagem}\nEsqueleto:\n${e.esqueleto}\nCasos:\n${e.testes
      .map((t) => `  ${t.descricao}: entrada ${JSON.stringify(t.entrada)} → ${JSON.stringify(t.saida_esperada)}`)
      .join('\n')}`;
  if (e.tipo === 'saida-esperada') return `Linguagem: ${e.linguagem}\nTrecho:\n${e.codigo_dado}\nResposta: ${JSON.stringify(e.resposta)}`;
  if (e.tipo === 'ordenacao') return `Ordem correta:\n${e.itens.map((t, i) => `${i + 1}. ${t}`).join('\n')}`;
  return '';
}

async function julgar(e, curso) {
  return perguntar({
    etapa: 'criticar',
    system: SYS_JULGA,
    esquema: ESQ_JULGA,
    pergunta: `${contexto(curso)}\n\n---\n\n## Exercício (tipo: ${e.tipo}, dificuldade: ${e.dificuldade})
## Tópico declarado: ${e.topico}

### Enunciado
${e.enunciado}

### Corpo
${corpo(e)}

### Dica socrática
${e.dica_socratica}`,
  });
}

/* ---- passada -------------------------------------------------------------- */

export async function criticar({ exercicios, curso, soSondas, aoProgredir }) {
  const aprovados = [];
  const reprovados = [];

  for (const e of exercicios) {
    const achados = [];

    if (COM_ALTERNATIVAS.has(e.tipo)) {
      const cego = await sondaCego(e);
      if (cego.erro)
        achados.push({ dimensao: 'gabarito', gravidade: 'alta', explicacao: `sonda cega falhou: ${cego.erro}`, sugestao: 'rodar de novo' });
      else {
        if (!cego.bateu)
          achados.push({
            dimensao: 'gabarito',
            gravidade: 'alta',
            explicacao: `às cegas escolhi [${cego.escolhas}], o gabarito é [${cego.gabarito}]. ${cego.explicacao}`,
            sugestao: 'conferir qual está certa; se ambas se defendem, reescrever',
          });
        if (cego.ambigua)
          achados.push({ dimensao: 'enunciado', gravidade: 'alta', explicacao: `ambígua às cegas: ${cego.explicacao}`, sugestao: 'deixar uma leitura só' });
      }
    }

    const dica = await sondaDica(e);
    if (!dica.erro && dica.entrega)
      achados.push({ dimensao: 'dica', gravidade: 'alta', explicacao: `a dica entrega a resposta: ${dica.explicacao}`, sugestao: 'apontar o conceito sem resolver' });

    if (!soSondas) {
      // Uma repetição; se ainda falhar, o exercício NÃO foi julgado — e não julgado não
      // pode virar aprovado, senão a falha do passe vira selo de qualidade em silêncio.
      let j = await julgar(e, curso);
      if (j.erro) j = await julgar(e, curso);
      if (j.erro)
        achados.push({ dimensao: 'alvo', gravidade: 'alta', explicacao: `o julgamento não completou (${j.erro}) — não avaliado`, sugestao: 'rodar de novo' });
      else achados.push(...(j.problemas ?? []));
    }

    const graves = achados.filter((a) => a.gravidade === 'alta');
    if (graves.length) {
      aoProgredir?.(e, 'REPROVA', graves);
      reprovados.push({ ...e, _critica: achados });
    } else {
      aoProgredir?.(e, 'ok', achados);
      aprovados.push(achados.length ? { ...e, _critica: achados } : e);
    }
  }

  return { aprovados, reprovados };
}
