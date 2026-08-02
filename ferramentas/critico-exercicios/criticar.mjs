#!/usr/bin/env node
/* Terceira camada do pipeline: julga o que executar não revela.
 *
 *   node criticar.mjs ../gerador-exercicios/exercicios-python.validado.json
 *
 *   --so-sondas   roda só as sondas comportamentais, sem o julgamento (mais barato)
 *   --curso ID    força o curso, se o JSON não trouxer
 *
 * O validador prova que enunciado, gabarito e solução descrevem a mesma coisa. Não prova
 * que o exercício mede o tópico certo, que o enunciado é inequívoco, nem que a dica não
 * entrega a resposta. É isso que este passe cobre.
 *
 * Duas sondas comportamentais e um julgamento:
 *
 *   sonda "cego"  — responde o quiz sem ver qual alternativa está marcada como correta.
 *                   Discordar do gabarito significa que ou o gabarito erra, ou a questão
 *                   é ambígua. Nos dois casos há conserto a fazer.
 *   sonda "dica"  — tenta resolver o exercício vendo APENAS o enunciado e a dica
 *                   socrática. Conseguir é o defeito: a dica devia orientar, não entregar.
 *   julgamento    — com o tópico e a ementa em contexto, procura defeito de alvo,
 *                   ambiguidade, gabarito errado e distrator implausível.
 *
 * As sondas valem mais que o julgamento: são comportamento observado, não opinião. Um
 * modelo pedido para "avaliar a qualidade" tende a concordar com o que lê.
 */
import fs from 'node:fs';
import path from 'node:path';

const MODELO = 'claude-opus-5';
const PRECO = { entrada: 5.0, saida: 25.0, leitura_cache: 0.5, escrita_cache: 6.25 };

const argv = process.argv.slice(2);
const arquivo = argv.find((a) => !a.startsWith('--'));
const soSondas = argv.includes('--so-sondas');
const cursoForcado = (() => {
  const i = argv.indexOf('--curso');
  return i === -1 ? null : argv[i + 1];
})();

if (!arquivo) {
  console.error('uso: node criticar.mjs <arquivo.json> [--so-sondas] [--curso ID]');
  process.exit(1);
}

const dados = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
const exercicios = dados.exercicios ?? [];
const cursoId = cursoForcado ?? dados.curso;

/* ---- contexto do curso, lido do catálogo --------------------------------- */

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const escopo = {};
new Function('g', fs.readFileSync(path.join(AQUI, '..', '..', 'assets', 'dados.js'), 'utf8') + '\ng.CURSOS=CURSOS;')(escopo);
const curso = escopo.CURSOS.find((c) => c.id === cursoId);
if (!curso) {
  console.error(`curso "${cursoId}" não encontrado no catálogo. Use --curso <id>.`);
  process.exit(1);
}

const CONTEXTO = `Curso: ${curso.nome} (${curso.categoria}, ${curso.nivel})
Ementa: ${curso.ementa}
Tópicos do curso:
${curso.topicos.map((t, i) => `${i + 1}. ${t}`).join('\n')}`;

/* ---- cliente ------------------------------------------------------------- */

let cliente = null;
const uso = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };

async function perguntar({ system, pergunta, esquema, maxTokens = 4000 }) {
  if (!cliente) {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    cliente = new Anthropic();
  }
  const r = await cliente.messages
    .stream({
      model: MODELO,
      max_tokens: maxTokens,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high', format: { type: 'json_schema', schema: esquema } },
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: pergunta }],
    })
    .finalMessage();

  if (r.stop_reason === 'refusal') return { erro: 'recusado pelos classificadores' };
  for (const k of Object.keys(uso)) uso[k] += r.usage[k] ?? 0;
  const texto = r.content.find((b) => b.type === 'text')?.text ?? '';
  try {
    return JSON.parse(texto);
  } catch {
    return { erro: 'resposta não era JSON válido' };
  }
}

/* ---- sonda 1: responder o quiz às cegas ---------------------------------- */

const SYS_CEGO = `Você responde questões de múltipla escolha. Não sabe qual alternativa \
está marcada como correta — escolha pelo mérito.

Se mais de uma alternativa for defensável, ou se a questão puder ser lida de mais de um \
jeito, diga isso em "ambigua" e explique. Uma questão bem escrita tem exatamente uma \
resposta defensável.`;

const ESQ_CEGO = {
  type: 'object',
  properties: {
    escolha: { type: 'integer', description: 'índice da alternativa escolhida, começando em 0' },
    ambigua: { type: 'boolean' },
    explicacao: { type: 'string' },
  },
  required: ['escolha', 'ambigua', 'explicacao'],
  additionalProperties: false,
};

async function sondaCego(e) {
  const r = await perguntar({
    system: SYS_CEGO,
    esquema: ESQ_CEGO,
    maxTokens: 3000,
    pergunta: `${e.enunciado}\n\n${e.alternativas.map((a, i) => `${i}. ${a.texto}`).join('\n')}`,
  });
  if (r.erro) return { erro: r.erro };
  const gabarito = e.alternativas.findIndex((a) => a.correta);
  return { escolha: r.escolha, gabarito, bateu: r.escolha === gabarito, ambigua: r.ambigua, explicacao: r.explicacao };
}

/* ---- sonda 2: a dica entrega a resposta? --------------------------------- */

const SYS_DICA = `Você recebe um exercício e uma dica de estudo. Responda com o que dá para \
extrair da dica.

Se a dica praticamente contiver a resposta — o nome exato da função a usar, o valor de \
saída, a alternativa certa —, marque "entrega" como verdadeiro. Se ela só aponta a direção, \
faz uma pergunta ou nomeia o conceito a revisar sem resolver, marque falso.

O critério é: alguém que só lesse a dica, sem saber o assunto, conseguiria acertar?`;

const ESQ_DICA = {
  type: 'object',
  properties: {
    entrega: { type: 'boolean' },
    explicacao: { type: 'string' },
  },
  required: ['entrega', 'explicacao'],
  additionalProperties: false,
};

async function sondaDica(e) {
  return perguntar({
    system: SYS_DICA,
    esquema: ESQ_DICA,
    maxTokens: 2000,
    pergunta: `## Exercício\n${e.enunciado}\n\n## Dica\n${e.dica_socratica}`,
  });
}

/* ---- julgamento ---------------------------------------------------------- */

const SYS_JULGA = `Você revisa exercícios de uma escola de programação onde a correção é \
toda automática — não há professor para desfazer mal-entendido. Um exercício ambíguo ou \
fora do alvo reprova aluno que entendeu o assunto.

Sua tarefa é **encontrar defeito**, não elogiar. A falha que você deve evitar é aprovar um \
exercício com problema real; listar problema inexistente é menos grave. Se não houver \
defeito, devolva a lista vazia — mas procure de verdade antes.

Estes quatro defeitos já apareceram neste catálogo e são o que você procura:

**alvo** — o exercício mede outra coisa que não o tópico declarado. Exemplo real: num curso \
sobre o papel do arquiteto de software, um exercício pedia para implementar busca em grafo. \
Mede programação, não arquitetura, e reprova quem domina o assunto e não programa.

**enunciado** — ambíguo, ou contradiz a semântica da linguagem. Exemplo real: um exercício \
sobre operadores exibia \`-7 ** 2 = 49\`. O valor está certo para a variável, mas quem \
digitar \`-7 ** 2\` no interpretador vê -49, porque \`**\` tem precedência maior que o menos \
unário. O aluno conclui que o exercício está quebrado.

**gabarito** — a alternativa marcada como correta não é a melhor, ou mais de uma se defende.

**distratores** — alternativas erradas óbvias demais, que deixam acertar por eliminação sem \
saber o assunto; ou alternativa certa mais longa e detalhada que as outras, o que entrega \
a resposta pelo formato.

Gravidade **alta** reprova o exercício: erro factual, ambiguidade que muda a resposta, alvo \
errado. Gravidade **baixa** é ajuste de redação que não impede o uso.`;

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

async function julgar(e) {
  const corpo =
    e.tipo === 'quiz'
      ? e.alternativas.map((a, i) => `${i}. [${a.correta ? 'CORRETA' : 'errada'}] ${a.texto}\n   porque: ${a.porque}`).join('\n')
      : `Linguagem: ${e.linguagem}\nEsqueleto:\n${e.esqueleto}\nCasos:\n${e.testes
          .map((t) => `  ${t.descricao}: entrada ${JSON.stringify(t.entrada)} → ${JSON.stringify(t.saida_esperada)}`)
          .join('\n')}`;

  return perguntar({
    system: SYS_JULGA,
    esquema: ESQ_JULGA,
    pergunta: `${CONTEXTO}\n\n---\n\n## Exercício (tipo: ${e.tipo}, dificuldade: ${e.dificuldade})
## Tópico declarado: ${e.topico}

### Enunciado
${e.enunciado}

### Corpo
${corpo}

### Dica socrática
${e.dica_socratica}`,
  });
}

/* ---- passada ------------------------------------------------------------- */

console.log(`curso ....... ${curso.nome}`);
console.log(`exercícios .. ${exercicios.length}`);
console.log('');

const aprovados = [];
const reprovados = [];

for (const [i, e] of exercicios.entries()) {
  const rotulo = `[${String(i + 1).padStart(2)}/${exercicios.length}] ${e.tipo.padEnd(6)} ${e.topico.slice(0, 40)}`;
  const achados = [];

  if (e.tipo === 'quiz') {
    const cego = await sondaCego(e);
    if (cego.erro) achados.push({ dimensao: 'sonda', gravidade: 'alta', explicacao: `sonda cega falhou: ${cego.erro}`, sugestao: 'rodar de novo' });
    else {
      if (!cego.bateu)
        achados.push({
          dimensao: 'gabarito',
          gravidade: 'alta',
          explicacao: `respondendo às cegas escolhi a alternativa ${cego.escolha}, o gabarito é a ${cego.gabarito}. ${cego.explicacao}`,
          sugestao: 'conferir qual está certa; se as duas se defendem, reescrever',
        });
      if (cego.ambigua)
        achados.push({ dimensao: 'enunciado', gravidade: 'alta', explicacao: `ambígua às cegas: ${cego.explicacao}`, sugestao: 'deixar uma leitura só' });
    }
  }

  const dica = await sondaDica(e);
  if (!dica.erro && dica.entrega)
    achados.push({ dimensao: 'dica', gravidade: 'alta', explicacao: `a dica entrega a resposta: ${dica.explicacao}`, sugestao: 'apontar o conceito sem resolver' });

  if (!soSondas) {
    const j = await julgar(e);
    if (j.erro) achados.push({ dimensao: 'julgamento', gravidade: 'baixa', explicacao: j.erro, sugestao: 'rodar de novo' });
    else achados.push(...(j.problemas ?? []));
  }

  const graves = achados.filter((a) => a.gravidade === 'alta');
  if (graves.length) {
    console.log(`${rotulo}  REPROVA`);
    for (const a of graves) console.log(`         [${a.dimensao}] ${a.explicacao}`);
    reprovados.push({ ...e, _critica: achados });
  } else {
    console.log(`${rotulo}  ok${achados.length ? `  (${achados.length} ressalva menor)` : ''}`);
    aprovados.push(achados.length ? { ...e, _critica: achados } : e);
  }
}

/* ---- saída --------------------------------------------------------------- */

const base = arquivo.replace(/\.json$/, '');
fs.writeFileSync(`${base}.criticado.json`, JSON.stringify({ ...dados, exercicios: aprovados }, null, 2), 'utf8');
if (reprovados.length) fs.writeFileSync(`${base}.rejeitado.json`, JSON.stringify({ ...dados, exercicios: reprovados }, null, 2), 'utf8');

const custo =
  (uso.input_tokens * PRECO.entrada + uso.output_tokens * PRECO.saida + uso.cache_read_input_tokens * PRECO.leitura_cache + uso.cache_creation_input_tokens * PRECO.escrita_cache) / 1e6;

console.log('');
console.log(`aprovados ... ${aprovados.length}/${exercicios.length}`);
console.log(`reprovados .. ${reprovados.length}`);
console.log(`custo ....... US$ ${custo.toFixed(4)}` + (exercicios.length ? `  (US$ ${(custo / exercicios.length).toFixed(5)} por exercício)` : ''));

process.exit(reprovados.length ? 1 : 0);
