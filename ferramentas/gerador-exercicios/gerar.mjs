#!/usr/bin/env node
/* Gera exercícios auto-corrigíveis a partir dos tópicos de um curso do catálogo.
 *
 *   node gerar.mjs <id-do-curso> [--lote N] [--max N] [--seco]
 *
 *   --lote N   tópicos por chamada à API (padrão 6)
 *   --max N    para depois de N tópicos — use para medir custo antes de gastar
 *   --seco     monta o prompt e mede o tamanho, sem chamar a API
 *
 * A saída vai para exercicios-<id>.json, junto com o relatório de uso e custo.
 * O catálogo é lido de ../../assets/dados.js — a mesma fonte que o site usa.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const DADOS = path.join(AQUI, '..', '..', 'assets', 'dados.js');

const MODELO = 'claude-opus-5';

/* preço por milhão de tokens — claude-opus-5 */
const PRECO = {
  entrada: 5.0,
  saida: 25.0,
  leitura_cache: 0.5, // 0,1x entrada
  escrita_cache: 6.25, // 1,25x entrada, TTL de 5 min
};

/* ---- argumentos ---------------------------------------------------------- */

const argv = process.argv.slice(2);
const cursoId = argv.find((a) => !a.startsWith('--'));
const opt = (nome, padrao) => {
  const i = argv.indexOf('--' + nome);
  return i === -1 ? padrao : Number(argv[i + 1]);
};
const seco = argv.includes('--seco');

if (!cursoId) {
  console.error('uso: node gerar.mjs <id-do-curso> [--lote N] [--max N] [--seco]');
  process.exit(1);
}

const TAM_LOTE = opt('lote', 6);
const MAX_TOPICOS = opt('max', Infinity);

/* ---- catálogo ------------------------------------------------------------ */

const escopo = {};
new Function('g', fs.readFileSync(DADOS, 'utf8') + '\ng.CURSOS=CURSOS;')(escopo);

const curso = escopo.CURSOS.find((c) => c.id === cursoId);
if (!curso) {
  console.error(`curso "${cursoId}" não existe no catálogo.`);
  console.error('ids disponíveis: ' + escopo.CURSOS.map((c) => c.id).join(', '));
  process.exit(1);
}
if (!curso.topicos?.length) {
  console.error(`curso "${cursoId}" não tem tópicos preenchidos.`);
  process.exit(1);
}

/* ---- prompt -------------------------------------------------------------- */

const REGRAS = `Você escreve exercícios para uma escola de programação online que corrige \
tudo por máquina. Não existe professor do outro lado: um exercício que precise de \
julgamento humano para ser corrigido é inútil aqui.

Para cada tópico recebido, escreva de 3 a 5 exercícios que permitam ao aluno validar \
se entendeu aquele tópico especificamente — não o curso inteiro, não o tópico vizinho.

Dois tipos, e a escolha entre eles é sua:

**codigo** — quando o tópico envolve algo que se escreve e executa. Preencha \`linguagem\`, \
\`esqueleto\` (assinatura ou arquivo inicial que o aluno completa) e \`testes\` com 3 a 6 casos. \
Deixe \`alternativas\` vazio.

Regras dos testes: cada caso é determinístico — mesma entrada, sempre a mesma saída. \
Sem relógio, sem aleatoriedade, sem rede, sem ordem de dicionário. \`entrada\` e \
\`saida_esperada\` são strings exatas, do jeito que um runner compara. Inclua pelo menos \
um caso de borda (vazio, zero, negativo, limite), porque é onde o entendimento aparece.

**quiz** — quando o tópico é conceitual e não há código a executar. Preencha \`alternativas\` \
com 4 opções, exatamente uma correta, cada uma com \`porque\` explicando por que está certa \
ou errada. Deixe \`linguagem\`, \`esqueleto\` e \`testes\` vazios.

Regras das alternativas: as erradas descrevem confusões que alunos reais têm, não absurdos \
óbvios. Nada de "todas as anteriores", nada de alternativa mais longa que as outras por ser \
a certa, nada que se resolva por eliminação sem saber o assunto.

**dica_socratica** aparece quando o aluno pede ajuda. Ela aponta o caminho e nunca entrega a \
resposta: uma pergunta que faz a pessoa notar o que faltou, ou o nome do conceito a revisar. \
Se lida sozinha, ela não deve permitir acertar o exercício.

Distribua as dificuldades: nem tudo fácil, nem tudo difícil. Enunciados em português do Brasil, \
diretos, sem "neste exercício você irá". Nome próprio de tecnologia fica intacto.`;

const CONTEXTO = `# Curso: ${curso.nome}

**Categoria:** ${curso.categoria} · **Nível:** ${curso.nivel} · **Carga:** ${curso.horas}h

**Resumo:** ${curso.resumo}

**Ementa:** ${curso.ementa}

${curso.requisitos ? `**Pré-requisitos:** ${curso.requisitos}` : ''}

**Todos os tópicos do curso** (para você saber o que pertence a outro tópico e não invadir):
${curso.topicos.map((t, i) => `${i + 1}. ${t}`).join('\n')}`;

const ESQUEMA = {
  type: 'object',
  properties: {
    exercicios: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          topico: { type: 'string', description: 'o tópico exato que este exercício valida' },
          tipo: { type: 'string', enum: ['codigo', 'quiz'] },
          dificuldade: { type: 'string', enum: ['facil', 'medio', 'dificil'] },
          enunciado: { type: 'string' },
          linguagem: { type: 'string', description: 'vazio quando tipo=quiz' },
          esqueleto: { type: 'string', description: 'vazio quando tipo=quiz' },
          testes: {
            type: 'array',
            description: 'vazio quando tipo=quiz',
            items: {
              type: 'object',
              properties: {
                descricao: { type: 'string' },
                entrada: { type: 'string' },
                saida_esperada: { type: 'string' },
              },
              required: ['descricao', 'entrada', 'saida_esperada'],
              additionalProperties: false,
            },
          },
          alternativas: {
            type: 'array',
            description: 'vazio quando tipo=codigo',
            items: {
              type: 'object',
              properties: {
                texto: { type: 'string' },
                correta: { type: 'boolean' },
                porque: { type: 'string' },
              },
              required: ['texto', 'correta', 'porque'],
              additionalProperties: false,
            },
          },
          dica_socratica: { type: 'string' },
        },
        required: [
          'topico',
          'tipo',
          'dificuldade',
          'enunciado',
          'linguagem',
          'esqueleto',
          'testes',
          'alternativas',
          'dica_socratica',
        ],
        additionalProperties: false,
      },
    },
  },
  required: ['exercicios'],
  additionalProperties: false,
};

/* ---- lotes --------------------------------------------------------------- */

const topicos = curso.topicos.slice(0, MAX_TOPICOS);
const lotes = [];
for (let i = 0; i < topicos.length; i += TAM_LOTE) {
  lotes.push(topicos.slice(i, i + TAM_LOTE));
}

console.log(`curso ....... ${curso.nome} (${curso.id})`);
console.log(`tópicos ..... ${topicos.length} de ${curso.topicos.length}`);
console.log(`lotes ....... ${lotes.length} de até ${TAM_LOTE}`);
console.log(`modelo ...... ${MODELO}`);
console.log(`prefixo ..... ~${Math.round((REGRAS.length + CONTEXTO.length) / 4)} tokens (estimativa, será cacheado)`);
console.log('');

if (seco) {
  const amostra = lotes[0].map((t, i) => `${i + 1}. ${t}`).join('\n');
  console.log('--- primeiro lote ---');
  console.log(amostra);
  console.log('\n(--seco: nada foi enviado para a API)');
  process.exit(0);
}

/* ---- geração ------------------------------------------------------------- */

const { default: Anthropic } = await import('@anthropic-ai/sdk');
const cliente = new Anthropic();

const todos = [];
const uso = {
  input_tokens: 0,
  output_tokens: 0,
  cache_read_input_tokens: 0,
  cache_creation_input_tokens: 0,
};

for (const [n, lote] of lotes.entries()) {
  process.stdout.write(`lote ${n + 1}/${lotes.length} (${lote.length} tópicos) ... `);

  const pedido = `Escreva os exercícios para estes tópicos:

${lote.map((t, i) => `${i + 1}. ${t}`).join('\n')}`;

  const stream = cliente.messages.stream({
    model: MODELO,
    max_tokens: 32000,
    thinking: { type: 'adaptive' },
    output_config: {
      effort: 'high',
      format: { type: 'json_schema', schema: ESQUEMA },
    },
    system: [
      { type: 'text', text: REGRAS },
      // o contexto do curso não muda entre lotes: o cache cobre regras + contexto
      { type: 'text', text: CONTEXTO, cache_control: { type: 'ephemeral' } },
    ],
    messages: [{ role: 'user', content: pedido }],
  });

  const resposta = await stream.finalMessage();

  if (resposta.stop_reason === 'refusal') {
    console.log('recusado pelos classificadores — lote pulado');
    continue;
  }
  if (resposta.stop_reason === 'max_tokens') {
    console.log('AVISO: truncado em max_tokens — reduza --lote');
  }

  for (const k of Object.keys(uso)) uso[k] += resposta.usage[k] ?? 0;

  const texto = resposta.content.find((b) => b.type === 'text')?.text ?? '';
  let lidos = [];
  try {
    lidos = JSON.parse(texto).exercicios ?? [];
  } catch {
    console.log('resposta não era JSON válido — lote pulado');
    continue;
  }
  todos.push(...lidos);
  console.log(`${lidos.length} exercícios`);
}

/* ---- saída e custo ------------------------------------------------------- */

const saida = path.join(AQUI, `exercicios-${curso.id}.json`);
fs.writeFileSync(
  saida,
  JSON.stringify({ curso: curso.id, modelo: MODELO, gerado_em: new Date().toISOString(), exercicios: todos }, null, 2),
  'utf8',
);

const custo =
  (uso.input_tokens * PRECO.entrada +
    uso.output_tokens * PRECO.saida +
    uso.cache_read_input_tokens * PRECO.leitura_cache +
    uso.cache_creation_input_tokens * PRECO.escrita_cache) /
  1e6;

const porTipo = todos.reduce((a, e) => ((a[e.tipo] = (a[e.tipo] || 0) + 1), a), {});

console.log('');
console.log(`arquivo ..... ${saida}`);
console.log(`exercícios .. ${todos.length} (${Object.entries(porTipo).map(([k, v]) => `${v} ${k}`).join(', ')})`);
console.log(`tokens ...... entrada ${uso.input_tokens} · saída ${uso.output_tokens}`);
console.log(`              cache lido ${uso.cache_read_input_tokens} · cache escrito ${uso.cache_creation_input_tokens}`);
console.log(`custo ....... US$ ${custo.toFixed(4)}`);
if (todos.length) {
  console.log(`              US$ ${(custo / todos.length).toFixed(5)} por exercício`);
  console.log(`extrapolado . US$ ${((custo / topicos.length) * 1503).toFixed(2)} para os 1.503 tópicos do catálogo`);
}
if (uso.cache_read_input_tokens === 0 && lotes.length > 1) {
  console.log('\nAVISO: nenhuma leitura de cache. O prefixo pode estar abaixo do mínimo cacheável.');
}
