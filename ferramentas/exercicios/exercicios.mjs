#!/usr/bin/env node
/* Pipeline de exercícios do catálogo: gerar → validar → criticar.
 *
 *   node exercicios.mjs python --max 3          o ciclo inteiro (padrão)
 *   node exercicios.mjs python --ate gerar      para depois de gerar
 *   node exercicios.mjs arquivo.json            retoma: valida e critica
 *   node exercicios.mjs arquivo.json --de criticar
 *   node exercicios.mjs --cursos
 *
 * O alvo é um id de curso ou um arquivo .json — o script distingue pelo sufixo. Retomar de
 * um arquivo é o que torna barato corrigir um gabarito à mão e reconferir sem regerar.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { acharCurso, carregar } from './lib/catalogo.mjs';
import { relatorio } from './lib/claude.mjs';
import { gerar, contagemPorTipo } from './lib/gerar.mjs';
import { validar, conferirInterpretadores, linguagensUsadas, conferirCAS, precisaCAS } from './lib/validar.mjs';
import { criticar } from './lib/criticar.mjs';
import { comparar, dimensoesDe, registrar } from './lib/historico.mjs';
import { TIPOS, renderizar } from './lib/tipos.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const ETAPAS = ['gerar', 'validar', 'criticar'];

/* ---- argumentos ---------------------------------------------------------- */

const argv = process.argv.slice(2);
const alvo = argv.find((a) => !a.startsWith('--'));
const txt = (nome, padrao) => {
  const i = argv.indexOf('--' + nome);
  return i === -1 ? padrao : argv[i + 1];
};
const num = (nome, padrao) => {
  const v = txt(nome, null);
  return v === null ? padrao : Number(v);
};
const tem = (nome) => argv.includes('--' + nome);

const opcoes = { alternativas: num('alternativas', 5) };
const TAM_LOTE = num('lote', 6);
const MAX_TOPICOS = num('max', Infinity);
const TIMEOUT = num('timeout', 10) * 1000;
const PARALELO = num('paralelo', 4);

const ehArquivo = alvo?.endsWith('.json');
const de = txt('de', ehArquivo ? 'validar' : 'gerar');
const ate = txt('ate', 'criticar');

const AJUDA = `uso: node exercicios.mjs <curso|arquivo.json> [opções]

O padrão é rodar o ciclo inteiro: gerar, validar e criticar.

  node exercicios.mjs python --max 3        gera, valida e critica
  node exercicios.mjs python --ate gerar    só gera
  node exercicios.mjs saida.json            retoma: valida e critica
  node exercicios.mjs saida.json --de criticar --ate criticar

etapas
  --de <etapa>       por onde começar (padrão: gerar, ou validar se o alvo é .json)
  --ate <etapa>      onde parar (padrão: criticar)
                     etapas: ${ETAPAS.join(', ')}

opções
  --max N            só os N primeiros tópicos — use na primeira vez, custa centavos
  --lote N           tópicos por chamada (padrão 6)
  --alternativas N   alternativas por questão (padrão 5)
  --timeout N        segundos por caso de teste (padrão 10)
  --paralelo N       chamadas simultâneas (padrão 4; suba se não bater rate limit)
  --so-estrutura     validar sem API nem execução
  --so-sondas        criticar sem o julgamento
  --seco             gerar sem chamar a API
  --cursos           lista os ids do catálogo
  --ver [N]          lê os exercícios de um .json em forma humana (N = só o de número N)

tipos: ${TIPOS.join(', ')}`;

/* ---- utilidades ---------------------------------------------------------- */

// Placar da rodada: cada etapa deposita o que só ela sabe, e o fim da execução responde
// "evoluiu ou não" sem que ninguém precise reler a saída inteira.
const placar = { gerados: 0, estrutura: 0, execucao: 0, api: 0, aprovados: 0, dimensoes: {} };

const rot = (e) => `${e.tipo.padEnd(16)} ${(e.topico ?? '').slice(0, 38).padEnd(38)}`;
const indice = (etapa) => ETAPAS.indexOf(etapa);
const rodar = (etapa) => indice(etapa) >= indice(de) && indice(etapa) <= indice(ate);

function gravar(destino, dados, exercicios) {
  fs.writeFileSync(destino, JSON.stringify({ ...dados, exercicios }, null, 2), 'utf8');
}

function preservar(caminho) {
  // A rodada anterior custou dinheiro e pode conter correções feitas à mão.
  if (fs.existsSync(caminho)) {
    const anterior = caminho.replace(/\.json$/, `.${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.renameSync(caminho, anterior);
    console.log(`(a versão anterior virou ${path.basename(anterior)})`);
  }
}

/* ---- etapas -------------------------------------------------------------- */

async function etapaGerar(cursoId) {
  const curso = acharCurso(cursoId);
  const topicos = curso.topicos.slice(0, MAX_TOPICOS);

  console.log(`curso ........ ${curso.nome} (${curso.id})`);
  console.log(`tópicos ...... ${topicos.length} de ${curso.topicos.length}`);
  console.log(`alternativas . ${opcoes.alternativas} por questão`);
  console.log(`paralelo ..... ${PARALELO} chamadas simultâneas`);
  console.log('');

  if (tem('seco')) {
    console.log('--seco: nada foi enviado para a API');
    console.log(topicos.map((t, i) => `${i + 1}. ${t}`).join('\n'));
    return null;
  }

  const exercicios = await gerar({
    curso,
    topicos,
    tamLote: TAM_LOTE,
    paralelo: PARALELO,
    opcoes,
    aoProgredir: (m, feitos, total) => console.log(`[${String(feitos).padStart(2)}/${total}] ${m}`),
  });

  const destino = path.join(AQUI, `exercicios-${curso.id}.json`);
  // Zero exercício não pode apagar a rodada anterior: uma geração que falhou renomeou o
  // arquivo bom e gravou um vazio por cima.
  if (!exercicios.length) {
    console.error('\nA geração não produziu exercício algum — o arquivo anterior fica como está.');
    process.exit(1);
  }
  preservar(destino);
  const dados = { curso: curso.id, gerado_em: new Date().toISOString(), alternativas: opcoes.alternativas, exercicios };
  gravar(destino, dados, exercicios);

  console.log('');
  console.log(`gerados ...... ${exercicios.length} (${contagemPorTipo(exercicios)})`);
  placar.gerados = exercicios.length;
  placar.curso = curso.id;
  placar.topicos = topicos.length;
  return { caminho: destino, dados };
}

async function etapaValidar({ caminho, dados }) {
  const exercicios = dados.exercicios ?? [];

  if (!tem('so-estrutura')) {
    const faltando = conferirInterpretadores(linguagensUsadas(exercicios));
    if (faltando.length) {
      console.error('\nNão dá para executar exercícios neste ambiente:');
      for (const f of faltando) console.error(`  · ${f}`);
      console.error('\nInstale o que falta, ou use --so-estrutura.');
      process.exit(2);
    }
    if (precisaCAS(exercicios)) {
      const semCAS = conferirCAS();
      if (semCAS) {
        console.error(`\nNão dá para verificar expressões: ${semCAS}`);
        console.error('Instale, ou use --so-estrutura.');
        process.exit(2);
      }
    }
  }

  console.log('');
  const { aprovados, reprovados } = await validar({
    exercicios,
    opcoes: { ...opcoes, alternativas: dados.alternativas ?? opcoes.alternativas },
    timeout: TIMEOUT,
    paralelo: PARALELO,
    soEstrutura: tem('so-estrutura'),
    aoProgredir: (e, estado, detalhe, falhas, feitos, total) => {
      console.log(`[#${String(feitos).padStart(3)}/${total}] ${rot(e)} ${estado}${detalhe ? '  ' + detalhe : ''}`);
      for (const f of (falhas ?? []).slice(0, 2)) {
        console.log(`     caso ${f.caso} (${f.descricao}): ${f.motivo}`);
        if (f.esperado !== undefined) {
          console.log(`       esperado ${JSON.stringify(f.esperado)}`);
          console.log(`       obtido   ${JSON.stringify(f.obtido)}`);
        }
      }
    },
  });

  const base = caminho.replace(/\.json$/, '');
  gravar(`${base}.validado.json`, dados, aprovados);
  if (reprovados.length) gravar(`${base}.reprovado.json`, dados, reprovados);

  console.log('');
  console.log(`validados .... ${aprovados.length}/${exercicios.length}  (${reprovados.length} reprovados)`);
  placar.estrutura = reprovados.filter((e) => e._camada === 'estrutura').length;
  placar.execucao = reprovados.length - placar.estrutura;
  return { caminho: `${base}.validado.json`, dados: { ...dados, exercicios: aprovados } };
}

async function etapaCriticar({ caminho, dados }) {
  const exercicios = dados.exercicios ?? [];
  const curso = acharCurso(dados.curso);

  console.log('');
  const { aprovados, reprovados } = await criticar({
    exercicios,
    curso,
    soSondas: tem('so-sondas'),
    paralelo: PARALELO,
    aoProgredir: (e, estado, achados, feitos, total) => {
      const n = Array.isArray(achados) ? achados.length : 0;
      console.log(`[#${String(feitos).padStart(3)}/${total}] ${rot(e)} ${estado}${estado === 'ok' && n ? `  (${n} ressalva menor)` : ''}`);
      if (estado === 'REPROVA') for (const a of achados) console.log(`     [${a.dimensao}] ${a.explicacao}`);
    },
  });

  const base = caminho.replace(/\.json$/, '');
  gravar(`${base}.criticado.json`, dados, aprovados);
  if (reprovados.length) gravar(`${base}.rejeitado.json`, dados, reprovados);

  console.log('');
  console.log(`aprovados .... ${aprovados.length}/${exercicios.length}  (${reprovados.length} rejeitados)`);
  placar.api = reprovados.length;
  placar.aprovados = aprovados.length;
  placar.dimensoes = dimensoesDe(reprovados);
  return { reprovados: reprovados.length };
}

function imprimirCusto() {
  const r = relatorio();
  if (!r.houveChamada) return;
  console.log('');
  console.log('custo por etapa');
  for (const l of r.linhas) console.log(l);
  console.log(`  ${'TOTAL'.padEnd(10)} US$ ${r.total.toFixed(4)}`);
}

/* ---- despacho ------------------------------------------------------------ */

try {
  if (tem('ver') && ehArquivo) {
    // Revisão por uma pessoa é o único sinal externo deste pipeline; JSON não se lê.
    const d = JSON.parse(fs.readFileSync(alvo, 'utf8'));
    const so = Number(txt('ver', ''));
    const lista = d.exercicios ?? [];
    for (const [i, e] of lista.entries()) {
      if (Number.isInteger(so) && so > 0 && so !== i + 1) continue;
      console.log(renderizar(e, i + 1));
    }
    console.log(`${'─'.repeat(78)}\n${lista.length} exercícios em ${path.basename(alvo)}`);
  } else if (tem('cursos')) {
    for (const c of carregar().CURSOS) console.log(`${c.id.padEnd(24)} ${String(c.topicos?.length ?? 0).padStart(2)} tópicos  ${c.nome}`);
  } else if (!alvo || tem('help') || tem('ajuda')) {
    console.log(AJUDA);
  } else {
    for (const e of [de, ate]) {
      if (!ETAPAS.includes(e)) throw new Error(`etapa desconhecida: "${e}" — use ${ETAPAS.join(', ')}`);
    }
    if (indice(de) > indice(ate)) throw new Error(`--de ${de} vem depois de --ate ${ate}`);
    if (ehArquivo && rodar('gerar')) throw new Error('o alvo é um arquivo: comece de validar ou criticar');

    let estado = ehArquivo ? { caminho: alvo, dados: JSON.parse(fs.readFileSync(alvo, 'utf8')) } : null;
    let reprovados = 0;

    if (rodar('gerar')) {
      estado = await etapaGerar(alvo);
      if (!estado) process.exit(0); // --seco
    }
    if (rodar('validar')) estado = await etapaValidar(estado);
    if (rodar('criticar')) ({ reprovados } = await etapaCriticar(estado));

    imprimirCusto();
    // Só o ciclo inteiro entra no histórico. Uma retomada de arquivo não gerou nada, e o
    // denominador seria outro — comparar as duas mediria o comando, não a ferramenta.
    if (rodar('gerar') && rodar('criticar') && placar.gerados) {
      const rodada = { quando: new Date().toISOString(), ...placar };
      for (const l of comparar(rodada)) console.log(l);
      registrar(rodada);
    }
    process.exit(reprovados ? 1 : 0);
  }
} catch (err) {
  console.error(err.message);
  if (err.ids) console.error('ids disponíveis: ' + err.ids.join(', '));
  process.exit(1);
}
