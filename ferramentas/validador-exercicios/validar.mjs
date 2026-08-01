#!/usr/bin/env node
/* Valida o JSON do gerador-exercicios: confere a estrutura de todos os exercícios
 * e, nos de código, escreve uma solução de referência e a executa contra os casos.
 *
 *   node validar.mjs ../gerador-exercicios/exercicios-python.json [--so-estrutura]
 *
 *   --so-estrutura   pula a parte que chama a API e executa código (grátis)
 *   --timeout N      segundos por caso de teste (padrão 10)
 *
 * Sai com código 1 se algum exercício reprovar, para dar pra usar em CI.
 *
 * A solução de referência é escrita SEM ver os casos de teste — só o enunciado e o
 * esqueleto. Assim, quando solução e gabarito concordam, isso é evidência de que os
 * dois estão certos. Quando discordam, o validador não sabe qual lado errou: pode ser
 * o gabarito, pode ser o enunciado ambíguo demais para alguém acertar sem ver os
 * testes. Nos dois casos o exercício precisa de conserto, então reprova.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const MODELO = 'claude-opus-5';

/* Candidatos por linguagem, em ordem de preferência: ambientes variam — um Codespace
 * de projeto Node pode não ter "python3" e ter "python", ou só a versão com número. */
const EXECUTORES = {
  python: { candidatos: ['python3', 'python', 'python3.12', 'python3.11'], args: (src) => ['-c', src] },
  javascript: { candidatos: ['node', 'nodejs'], args: (src) => ['-e', src] },
};

const RESOLVIDO = {}; // linguagem -> comando que funciona

/* ---- argumentos ---------------------------------------------------------- */

const argv = process.argv.slice(2);
const arquivo = argv.find((a) => !a.startsWith('--'));
const soEstrutura = argv.includes('--so-estrutura');
const TIMEOUT = (() => {
  const i = argv.indexOf('--timeout');
  return (i === -1 ? 10 : Number(argv[i + 1])) * 1000;
})();

if (!arquivo) {
  console.error('uso: node validar.mjs <arquivo.json> [--so-estrutura] [--timeout N]');
  process.exit(1);
}

const dados = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
const exercicios = dados.exercicios ?? [];

/* ---- conferência de estrutura (sem API, sem execução) -------------------- */

function conferirEstrutura(e) {
  const p = [];
  if (!e.topico?.trim()) p.push('sem tópico');
  if (!e.enunciado?.trim()) p.push('sem enunciado');
  if (!e.dica_socratica?.trim()) p.push('sem dica socrática');

  if (e.tipo === 'codigo') {
    if (!e.linguagem?.trim()) p.push('código sem linguagem');
    if (!e.esqueleto?.trim()) p.push('código sem esqueleto');
    if ((e.testes?.length ?? 0) < 3) p.push(`código com ${e.testes?.length ?? 0} casos (mínimo 3)`);
    if (e.alternativas?.length) p.push('código com alternativas preenchidas');
    for (const [i, t] of (e.testes ?? []).entries()) {
      if (typeof t.saida_esperada !== 'string') p.push(`caso ${i + 1} sem saida_esperada`);
      if (!t.descricao?.trim()) p.push(`caso ${i + 1} sem descrição`);
    }
  } else if (e.tipo === 'quiz') {
    const n = e.alternativas?.length ?? 0;
    if (n !== 4) p.push(`quiz com ${n} alternativas (esperado 4)`);
    const certas = (e.alternativas ?? []).filter((a) => a.correta).length;
    if (certas !== 1) p.push(`quiz com ${certas} alternativas corretas (esperado 1)`);
    if ((e.alternativas ?? []).some((a) => !a.porque?.trim())) p.push('alternativa sem "porque"');
    if (e.testes?.length) p.push('quiz com testes preenchidos');
    if (e.linguagem?.trim()) p.push('quiz com linguagem preenchida');
  } else {
    p.push(`tipo desconhecido: ${e.tipo}`);
  }
  return p;
}

/* ---- solução de referência ----------------------------------------------- */

const REGRAS_SOLUCAO = `Você recebe o enunciado de um exercício de programação e o esqueleto \
que o aluno completa. Escreva a solução de referência completa: o arquivo inteiro, pronto \
para executar, não só a parte que falta.

A solução lê da entrada padrão e escreve na saída padrão exatamente o que o enunciado pede. \
Nada de texto extra, nada de prompt pedindo dados, nada de comentário explicativo na saída.

Você NÃO está vendo os casos de teste. Implemente estritamente o que o enunciado especifica. \
Se o enunciado for ambíguo em algum ponto, escolha a leitura mais literal e siga — não invente \
comportamento que o enunciado não descreve.`;

const ESQUEMA_SOLUCAO = {
  type: 'object',
  properties: {
    solucao: { type: 'string', description: 'o arquivo completo, pronto para executar' },
  },
  required: ['solucao'],
  additionalProperties: false,
};

let clientePreguicoso = null;
async function obterCliente() {
  // Importa o SDK só quando há mesmo uma solução a escrever: revalidar um arquivo
  // que já traz as soluções não precisa de dependência instalada nem de chave.
  if (!clientePreguicoso) {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    clientePreguicoso = new Anthropic();
  }
  return clientePreguicoso;
}

async function escreverSolucao(e) {
  const cliente = await obterCliente();
  const resposta = await cliente.messages
    .stream({
      model: MODELO,
      max_tokens: 8000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high', format: { type: 'json_schema', schema: ESQUEMA_SOLUCAO } },
      system: [{ type: 'text', text: REGRAS_SOLUCAO, cache_control: { type: 'ephemeral' } }],
      messages: [
        {
          role: 'user',
          content: `Linguagem: ${e.linguagem}

## Enunciado
${e.enunciado}

## Esqueleto
\`\`\`
${e.esqueleto}
\`\`\``,
        },
      ],
    })
    .finalMessage();

  if (resposta.stop_reason === 'refusal') return { erro: 'recusado pelos classificadores' };
  const texto = resposta.content.find((b) => b.type === 'text')?.text ?? '';
  try {
    return { solucao: JSON.parse(texto).solucao, uso: resposta.usage };
  } catch {
    return { erro: 'resposta não era JSON válido' };
  }
}

/* ---- execução ------------------------------------------------------------ */

function rodarCaso(linguagem, src, teste) {
  const exec = EXECUTORES[linguagem];
  const cmd = RESOLVIDO[linguagem];
  if (!exec || !cmd) return { ok: false, motivo: `linguagem "${linguagem}" não suportada pelo validador` };
  try {
    const saida = execFileSync(cmd, exec.args(src), {
      input: teste.entrada ?? '',
      encoding: 'utf8',
      timeout: TIMEOUT,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    if (saida === teste.saida_esperada) return { ok: true };
    return { ok: false, motivo: 'saída diferente', esperado: teste.saida_esperada, obtido: saida };
  } catch (err) {
    if (err.code === 'ETIMEDOUT') return { ok: false, motivo: `estourou ${TIMEOUT / 1000}s` };
    // Nunca engolir a causa: quando o interpretador não existe o stderr vem vazio
    // e só o err.code diz o que houve.
    const stderr = (err.stderr ?? '').toString().trim();
    const detalhe = stderr ? stderr.split('\n').pop() : `${err.code ?? 'erro'}: ${err.message.split('\n')[0]}`;
    return { ok: false, motivo: 'erro na execução', obtido: detalhe };
  }
}

/* Confere que os interpretadores existem antes de acusar o conteúdo. Sem isso, um
 * python3 ausente vira "8 exercícios reprovados" e manda você caçar defeito onde
 * não tem. */
function conferirInterpretadores(linguagens) {
  const faltando = [];
  for (const lang of linguagens) {
    const exec = EXECUTORES[lang];
    if (!exec) {
      faltando.push(`${lang}: o validador não sabe executar essa linguagem`);
      continue;
    }
    const tentado = [];
    for (const cmd of exec.candidatos) {
      try {
        execFileSync(cmd, exec.args(lang === 'python' ? 'pass' : ';'), {
          input: '',
          encoding: 'utf8',
          timeout: 10000,
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        RESOLVIDO[lang] = cmd;
        break;
      } catch {
        tentado.push(cmd);
      }
    }
    if (!RESOLVIDO[lang]) faltando.push(`${lang}: nenhum destes está no PATH — ${tentado.join(', ')}`);
  }
  return faltando;
}

/* ---- passada principal --------------------------------------------------- */

const aprovados = [];
const reprovados = [];
const uso = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };

if (!soEstrutura) {
  const linguagens = [...new Set(exercicios.filter((e) => e.tipo === 'codigo').map((e) => e.linguagem).filter(Boolean))];
  const faltando = conferirInterpretadores(linguagens);
  if (faltando.length) {
    console.error('Não dá para validar exercícios de código neste ambiente:');
    for (const f of faltando) console.error(`  · ${f}`);
    console.error('\nInstale o que falta, ou rode com --so-estrutura para conferir só a estrutura.');
    process.exit(2);
  }
}

for (const [i, e] of exercicios.entries()) {
  const rotulo = `[${String(i + 1).padStart(2)}/${exercicios.length}] ${e.tipo.padEnd(6)} ${e.topico.slice(0, 44)}`;
  const problemas = conferirEstrutura(e);

  if (problemas.length) {
    console.log(`${rotulo}  ESTRUTURA: ${problemas.join('; ')}`);
    reprovados.push({ ...e, _motivo: problemas });
    continue;
  }

  if (e.tipo !== 'codigo' || soEstrutura) {
    console.log(`${rotulo}  ok`);
    aprovados.push(e);
    continue;
  }

  // Reaproveita a solução de uma rodada anterior: revalidar não paga de novo,
  // e dá para corrigir um gabarito e reconferir sem gastar nada.
  const ref = e._solucao_referencia
    ? { solucao: e._solucao_referencia, uso: {} }
    : await escreverSolucao(e);
  if (ref.erro) {
    console.log(`${rotulo}  SOLUÇÃO: ${ref.erro}`);
    reprovados.push({ ...e, _motivo: [ref.erro] });
    continue;
  }
  for (const k of Object.keys(uso)) uso[k] += ref.uso[k] ?? 0;

  const falhas = [];
  for (const [n, t] of e.testes.entries()) {
    const r = rodarCaso(e.linguagem, ref.solucao, t);
    if (!r.ok) {
      falhas.push({ caso: n + 1, descricao: t.descricao, ...r });
    }
  }

  if (falhas.length) {
    console.log(`${rotulo}  REPROVA ${falhas.length}/${e.testes.length} casos`);
    for (const f of falhas.slice(0, 2)) {
      console.log(`         caso ${f.caso} (${f.descricao}): ${f.motivo}`);
      if (f.esperado !== undefined) {
        console.log(`           esperado ${JSON.stringify(f.esperado)}`);
        console.log(`           obtido   ${JSON.stringify(f.obtido)}`);
      } else if (f.obtido) {
        console.log(`           ${f.obtido}`);
      }
    }
    reprovados.push({ ...e, _motivo: falhas, _solucao_referencia: ref.solucao });
  } else {
    console.log(`${rotulo}  ok  ${e.testes.length}/${e.testes.length} casos`);
    aprovados.push({ ...e, _solucao_referencia: ref.solucao });
  }
}

/* ---- saída --------------------------------------------------------------- */

const base = arquivo.replace(/\.json$/, '');
fs.writeFileSync(`${base}.validado.json`, JSON.stringify({ ...dados, exercicios: aprovados }, null, 2), 'utf8');
if (reprovados.length) {
  fs.writeFileSync(`${base}.reprovado.json`, JSON.stringify({ ...dados, exercicios: reprovados }, null, 2), 'utf8');
}

const custo =
  (uso.input_tokens * 5 + uso.output_tokens * 25 + uso.cache_read_input_tokens * 0.5 + uso.cache_creation_input_tokens * 6.25) / 1e6;

console.log('');
console.log(`aprovados ... ${aprovados.length}/${exercicios.length}`);
console.log(`reprovados .. ${reprovados.length}`);
console.log(`arquivos .... ${path.basename(base)}.validado.json` + (reprovados.length ? ` e .reprovado.json` : ''));
if (!soEstrutura && custo > 0) console.log(`custo ....... US$ ${custo.toFixed(4)}`);

process.exit(reprovados.length ? 1 : 0);
