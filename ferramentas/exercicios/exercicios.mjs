#!/usr/bin/env node
/* Pipeline de exercícios do catálogo: gerar → validar → criticar.
 *
 *   node exercicios.mjs tudo     python --max 3     encadeia as três etapas
 *   node exercicios.mjs gerar    python --max 3
 *   node exercicios.mjs validar  exercicios-python.json
 *   node exercicios.mjs criticar exercicios-python.validado.json
 *   node exercicios.mjs cursos                      lista os ids do catálogo
 *
 * Cada etapa continua servindo sozinha: dá para validar um arquivo corrigido à mão sem
 * regerar, ou recriticar depois de ajustar um gabarito.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { acharCurso, carregar } from './lib/catalogo.mjs';
import { relatorio } from './lib/claude.mjs';
import { gerar, contagemPorTipo } from './lib/gerar.mjs';
import { validar, conferirInterpretadores, linguagensUsadas } from './lib/validar.mjs';
import { criticar } from './lib/criticar.mjs';
import { resumo, TIPOS } from './lib/tipos.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));

/* ---- argumentos ---------------------------------------------------------- */

const argv = process.argv.slice(2);
const comando = argv[0];
const alvo = argv[1] && !argv[1].startsWith('--') ? argv[1] : null;
const num = (nome, padrao) => {
  const i = argv.indexOf('--' + nome);
  return i === -1 ? padrao : Number(argv[i + 1]);
};
const tem = (nome) => argv.includes('--' + nome);

const opcoes = { alternativas: num('alternativas', 5) };
const TAM_LOTE = num('lote', 6);
const MAX_TOPICOS = num('max', Infinity);
const TIMEOUT = num('timeout', 10) * 1000;

const AJUDA = `uso: node exercicios.mjs <comando> [alvo] [opções]

comandos
  tudo <curso>       gerar, validar e criticar em sequência
  gerar <curso>      escreve exercícios a partir dos tópicos
  validar <arquivo>  confere estrutura e executa o que executa
  criticar <arquivo> julga alvo, ambiguidade, gabarito e distratores
  cursos             lista os ids do catálogo

opções
  --max N            só os N primeiros tópicos (use na primeira vez)
  --lote N           tópicos por chamada (padrão 6)
  --alternativas N   alternativas por questão (padrão 5)
  --timeout N        segundos por caso de teste (padrão 10)
  --so-estrutura     validar sem API nem execução
  --so-sondas        criticar sem o julgamento
  --seco             gerar sem chamar a API

tipos: ${TIPOS.join(', ')}`;

/* ---- utilidades ---------------------------------------------------------- */

const rot = (e) => `${e.tipo.padEnd(16)} ${(e.topico ?? '').slice(0, 38).padEnd(38)}`;

function gravar(destino, dados, exercicios) {
  fs.writeFileSync(destino, JSON.stringify({ ...dados, exercicios }, null, 2), 'utf8');
  return path.basename(destino);
}

function preservar(caminho) {
  // A rodada anterior custou dinheiro e pode conter correções feitas à mão.
  if (fs.existsSync(caminho)) {
    const anterior = caminho.replace(/\.json$/, `.${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.renameSync(caminho, anterior);
    console.log(`(a versão anterior virou ${path.basename(anterior)})`);
  }
}

function imprimirCusto() {
  const r = relatorio();
  if (!r.houveChamada) return;
  console.log('');
  console.log('custo por etapa');
  for (const l of r.linhas) console.log(l);
  console.log(`  ${'TOTAL'.padEnd(10)} US$ ${r.total.toFixed(4)}`);
}

/* ---- comandos ------------------------------------------------------------ */

async function cmdGerar(cursoId) {
  const curso = acharCurso(cursoId);
  const topicos = curso.topicos.slice(0, MAX_TOPICOS);

  console.log(`curso ........ ${curso.nome} (${curso.id})`);
  console.log(`tópicos ...... ${topicos.length} de ${curso.topicos.length}`);
  console.log(`alternativas . ${opcoes.alternativas} por questão`);
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
    opcoes,
    aoProgredir: (m, fim) => (fim ? console.log(m) : process.stdout.write(m + ' ...')),
  });

  const destino = path.join(AQUI, `exercicios-${curso.id}.json`);
  preservar(destino);
  const dados = { curso: curso.id, gerado_em: new Date().toISOString(), alternativas: opcoes.alternativas, exercicios };
  gravar(destino, dados, exercicios);

  console.log('');
  console.log(`exercícios ... ${exercicios.length} (${contagemPorTipo(exercicios)})`);
  console.log(`arquivo ...... ${path.basename(destino)}`);
  return { destino, dados, exercicios };
}

async function cmdValidar(arquivo, jaCarregado) {
  const dados = jaCarregado ?? JSON.parse(fs.readFileSync(arquivo, 'utf8'));
  const exercicios = dados.exercicios ?? [];
  const soEstrutura = tem('so-estrutura');

  if (!soEstrutura) {
    const faltando = conferirInterpretadores(linguagensUsadas(exercicios));
    if (faltando.length) {
      console.error('Não dá para executar exercícios neste ambiente:');
      for (const f of faltando) console.error(`  · ${f}`);
      console.error('\nInstale o que falta, ou use --so-estrutura.');
      process.exit(2);
    }
  }

  const { aprovados, reprovados } = await validar({
    exercicios,
    opcoes: { ...opcoes, alternativas: dados.alternativas ?? opcoes.alternativas },
    timeout: TIMEOUT,
    aoProgredir: (e, estado, detalhe, falhas) => {
      console.log(`  ${rot(e)} ${estado}${detalhe ? '  ' + detalhe : ''}`);
      for (const f of (falhas ?? []).slice(0, 2)) {
        console.log(`     caso ${f.caso} (${f.descricao}): ${f.motivo}`);
        if (f.esperado !== undefined) {
          console.log(`       esperado ${JSON.stringify(f.esperado)}`);
          console.log(`       obtido   ${JSON.stringify(f.obtido)}`);
        }
      }
    },
  });

  const base = (arquivo ?? path.join(AQUI, `exercicios-${dados.curso}.json`)).replace(/\.json$/, '');
  gravar(`${base}.validado.json`, dados, aprovados);
  if (reprovados.length) gravar(`${base}.reprovado.json`, dados, reprovados);

  console.log('');
  console.log(`validados .... ${aprovados.length}/${exercicios.length}  (${reprovados.length} reprovados)`);
  return { destino: `${base}.validado.json`, dados: { ...dados, exercicios: aprovados }, exercicios: aprovados };
}

async function cmdCriticar(arquivo, jaCarregado) {
  const dados = jaCarregado ?? JSON.parse(fs.readFileSync(arquivo, 'utf8'));
  const exercicios = dados.exercicios ?? [];
  const curso = acharCurso(dados.curso);

  const { aprovados, reprovados } = await criticar({
    exercicios,
    curso,
    soSondas: tem('so-sondas'),
    aoProgredir: (e, estado, achados) => {
      const menores = Array.isArray(achados) ? achados.length : 0;
      console.log(`  ${rot(e)} ${estado}${estado === 'ok' && menores ? `  (${menores} ressalva menor)` : ''}`);
      if (estado === 'REPROVA') for (const a of achados) console.log(`     [${a.dimensao}] ${a.explicacao}`);
    },
  });

  const base = (arquivo ?? path.join(AQUI, `exercicios-${dados.curso}.validado.json`)).replace(/\.json$/, '');
  gravar(`${base}.criticado.json`, dados, aprovados);
  if (reprovados.length) gravar(`${base}.rejeitado.json`, dados, reprovados);

  console.log('');
  console.log(`aprovados .... ${aprovados.length}/${exercicios.length}  (${reprovados.length} rejeitados)`);
  return { aprovados, reprovados };
}

/* ---- despacho ------------------------------------------------------------ */

try {
  if (!comando || comando === 'ajuda' || tem('help')) {
    console.log(AJUDA);
  } else if (comando === 'cursos') {
    for (const c of carregar().CURSOS) console.log(`${c.id.padEnd(24)} ${c.topicos?.length ?? 0} tópicos  ${c.nome}`);
  } else if (comando === 'gerar') {
    if (!alvo) throw new Error('falta o id do curso');
    await cmdGerar(alvo);
    imprimirCusto();
  } else if (comando === 'validar') {
    if (!alvo) throw new Error('falta o arquivo');
    await cmdValidar(alvo);
    imprimirCusto();
  } else if (comando === 'criticar') {
    if (!alvo) throw new Error('falta o arquivo');
    const { reprovados } = await cmdCriticar(alvo);
    imprimirCusto();
    process.exit(reprovados.length ? 1 : 0);
  } else if (comando === 'tudo') {
    if (!alvo) throw new Error('falta o id do curso');
    const g = await cmdGerar(alvo);
    if (!g) process.exit(0);
    console.log('');
    const v = await cmdValidar(g.destino, g.dados);
    console.log('');
    const { reprovados } = await cmdCriticar(v.destino, v.dados);
    imprimirCusto();
    process.exit(reprovados.length ? 1 : 0);
  } else {
    console.error(`comando desconhecido: ${comando}\n`);
    console.error(AJUDA);
    process.exit(1);
  }
} catch (err) {
  console.error(err.message);
  if (err.ids) console.error('ids disponíveis: ' + err.ids.join(', '));
  process.exit(1);
}
