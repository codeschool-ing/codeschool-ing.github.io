/* Etapa 2: conferir estrutura e executar o que dá para executar.
 *
 * `codigo`         → escreve uma solução de referência SEM ver os casos e roda contra eles.
 * `saida-esperada` → executa o próprio trecho mostrado e compara com o gabarito. Este é o
 *                    mais forte do pipeline: não depende de julgamento nenhum, só do
 *                    interpretador. Pega precedência errada, formatação errada, \n faltando.
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { perguntar } from './claude.mjs';
import { conferir } from './tipos.mjs';
import { mapaConcorrente } from './paralelo.mjs';

const EXECUTORES = {
  python: { candidatos: ['python3', 'python', 'python3.12', 'python3.11'], args: (src) => ['-c', src] },
  javascript: { candidatos: ['node', 'nodejs'], args: (src) => ['-e', src] },
};

const RESOLVIDO = {};
const VERIFICADOR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'verificar_expressao.py');

/* Confere que dá para verificar expressão: precisa de python com sympy. */
export function conferirCAS() {
  const cmd = RESOLVIDO.python;
  if (!cmd) return 'python não está no PATH (necessário para resposta-expressao)';
  try {
    execFileSync(cmd, ['-c', 'import sympy'], { encoding: 'utf8', timeout: 20000, stdio: ['pipe', 'pipe', 'pipe'] });
    return null;
  } catch {
    return `sympy não instalado — rode: ${cmd} -m pip install sympy`;
  }
}

/* Recalcula o gabarito com sympy e compara. Não é opinião: se a conta não bate, o gabarito
 * está errado. */
function verificarExpressao(e, timeout) {
  const cmd = RESOLVIDO.python;
  const entrada = JSON.stringify({
    gabarito: e.expressao_gabarito,
    variaveis: e.variaveis ?? [],
    verificacao: { origem: e.verificacao_origem, operacao: e.verificacao_operacao, variavel: e.verificacao_variavel },
  });
  try {
    const saida = execFileSync(cmd, [VERIFICADOR], { input: entrada, encoding: 'utf8', timeout, stdio: ['pipe', 'pipe', 'pipe'] });
    return JSON.parse(saida);
  } catch (err) {
    if (err.code === 'ETIMEDOUT') return { erro: `a verificação estourou ${timeout / 1000}s` };
    const stderr = (err.stderr ?? '').toString().trim();
    return { erro: stderr ? stderr.split('\n').pop() : `${err.code ?? 'erro'}: ${err.message.split('\n')[0]}` };
  }
}

export function conferirInterpretadores(linguagens) {
  const faltando = [];
  for (const lang of linguagens) {
    const exec = EXECUTORES[lang];
    if (!exec) {
      faltando.push(`${lang}: o validador não sabe executar essa linguagem`);
      continue;
    }
    if (RESOLVIDO[lang]) continue;
    const tentado = [];
    for (const cmd of exec.candidatos) {
      try {
        execFileSync(cmd, exec.args(lang === 'python' ? 'pass' : ';'), { input: '', encoding: 'utf8', timeout: 10000, stdio: ['pipe', 'pipe', 'pipe'] });
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

function rodar(linguagem, src, entrada, timeout) {
  const exec = EXECUTORES[linguagem];
  const cmd = RESOLVIDO[linguagem];
  if (!exec || !cmd) return { erro: `linguagem "${linguagem}" não suportada` };
  try {
    return { saida: execFileSync(cmd, exec.args(src), { input: entrada ?? '', encoding: 'utf8', timeout, stdio: ['pipe', 'pipe', 'pipe'] }) };
  } catch (err) {
    if (err.code === 'ETIMEDOUT') return { erro: `estourou ${timeout / 1000}s` };
    // Interpretador ausente dá ENOENT com stderr vazio: nunca engolir a causa.
    const stderr = (err.stderr ?? '').toString().trim();
    return { erro: stderr ? stderr.split('\n').pop() : `${err.code ?? 'erro'}: ${err.message.split('\n')[0]}` };
  }
}

const SYS_SOLUCAO = `Você recebe o enunciado de um exercício de programação e o esqueleto que
o aluno completa. Escreva a solução de referência completa: o arquivo inteiro, pronto para
executar, não só a parte que falta.

A solução lê da entrada padrão e escreve na saída padrão exatamente o que o enunciado pede.
Nada de texto extra, nada de prompt pedindo dados.

Você NÃO está vendo os casos de teste. Implemente estritamente o que o enunciado especifica.
Se ele for ambíguo, escolha a leitura mais literal — não invente comportamento que o
enunciado não descreve.`;

const ESQ_SOLUCAO = {
  type: 'object',
  properties: { solucao: { type: 'string' } },
  required: ['solucao'],
  additionalProperties: false,
};

async function solucaoDeReferencia(e) {
  if (e._solucao_referencia) return { solucao: e._solucao_referencia };
  return perguntar({
    etapa: 'validar',
    system: SYS_SOLUCAO,
    esquema: ESQ_SOLUCAO,
    maxTokens: 8000,
    pergunta: `Linguagem: ${e.linguagem}\n\n## Enunciado\n${e.enunciado}\n\n## Esqueleto\n\`\`\`\n${e.esqueleto}\n\`\`\``,
  });
}

export async function validar({ exercicios, opcoes, timeout, paralelo, soEstrutura, aoProgredir }) {
  const veredictos = await mapaConcorrente(exercicios, paralelo, async (e, i) => {
    const aprovados = [];
    const reprovados = [];
    const aoProgredirLocal = (ex, estado, detalhe, falhas) => aoProgredir?.(ex, estado, detalhe, falhas, i + 1, exercicios.length);
    {
    const problemas = conferir(e, opcoes);
    if (problemas.length) {
      aoProgredirLocal(e, 'ESTRUTURA', problemas.join('; '));
      // A camada fica gravada: é ela que diz, no fim da rodada, quanto do defeito foi
      // pego por cálculo e quanto precisou de API.
      reprovados.push({ ...e, _camada: 'estrutura', _motivo: problemas });
      return { aprovados, reprovados };
    }

    // --so-estrutura promete "sem API nem execução". Sem esta saída, o executor roda com
    // RESOLVIDO vazio e devolve "linguagem não suportada" para todo mundo — o flag
    // reprovava exatamente o que dizia não conferir.
    if (soEstrutura) {
      aoProgredirLocal(e, 'ok', 'só estrutura');
      aprovados.push(e);
      return { aprovados, reprovados };
    }

    if (e.tipo === 'resposta-expressao') {
      const r = verificarExpressao(e, timeout);
      if (r.erro) {
        aoProgredirLocal(e, 'REPROVA', r.erro);
        reprovados.push({ ...e, _motivo: [r.erro] });
      } else if (r.pulou) {
        // Sem verificação, o gabarito não foi conferido por ninguém: aprovar seria dar
        // selo de qualidade a algo não checado.
        const m = 'sem verificação (verificacao_operacao: nenhuma) — gabarito não conferido';
        aoProgredirLocal(e, 'REPROVA', m);
        reprovados.push({ ...e, _motivo: [m] });
      } else if (!r.ok) {
        const det = `gabarito "${r.gabarito}", mas a verificação calcula "${r.calculado}"`;
        aoProgredirLocal(e, 'REPROVA', det);
        reprovados.push({ ...e, _motivo: [det] });
      } else {
        aoProgredirLocal(e, 'ok', `sympy recalcula e confere: ${r.calculado}`);
        aprovados.push(e);
      }
      return { aprovados, reprovados };
    }

    if (e.tipo === 'saida-esperada') {
      const r = rodar(e.linguagem, e.codigo_dado, '', timeout);
      if (r.erro) {
        aoProgredirLocal(e, 'REPROVA', `o trecho não executa: ${r.erro}`);
        reprovados.push({ ...e, _motivo: [`o trecho não executa: ${r.erro}`] });
      } else if (r.saida !== e.resposta) {
        const det = `gabarito ${JSON.stringify(e.resposta)}, o interpretador produz ${JSON.stringify(r.saida)}`;
        aoProgredirLocal(e, 'REPROVA', det);
        reprovados.push({ ...e, _motivo: [det] });
      } else {
        aoProgredirLocal(e, 'ok', 'saída confere com o interpretador');
        aprovados.push(e);
      }
      return { aprovados, reprovados };
    }

    if (e.tipo !== 'codigo') {
      aoProgredirLocal(e, 'ok', '');
      aprovados.push(e);
      return { aprovados, reprovados };
    }

    const ref = await solucaoDeReferencia(e);
    if (ref.erro) {
      aoProgredirLocal(e, 'SOLUÇÃO', ref.erro);
      reprovados.push({ ...e, _motivo: [ref.erro] });
      return { aprovados, reprovados };
    }

    const falhas = [];
    for (const [n, t] of e.testes.entries()) {
      const r = rodar(e.linguagem, ref.solucao, t.entrada, timeout);
      if (r.erro) falhas.push({ caso: n + 1, descricao: t.descricao, motivo: r.erro });
      else if (r.saida !== t.saida_esperada)
        falhas.push({ caso: n + 1, descricao: t.descricao, motivo: 'saída diferente', esperado: t.saida_esperada, obtido: r.saida });
    }

    if (falhas.length) {
      aoProgredirLocal(e, 'REPROVA', `${falhas.length}/${e.testes.length} casos`, falhas);
      reprovados.push({ ...e, _motivo: falhas, _solucao_referencia: ref.solucao });
    } else {
      aoProgredirLocal(e, 'ok', `${e.testes.length}/${e.testes.length} casos`);
      aprovados.push({ ...e, _solucao_referencia: ref.solucao });
    }
    }
    return { aprovados, reprovados };
  });

  return {
    aprovados: veredictos.flatMap((v) => v.aprovados),
    reprovados: veredictos.flatMap((v) => v.reprovados),
  };
}

export function linguagensUsadas(exercicios) {
  const langs = new Set(
    exercicios.filter((e) => e.tipo === 'codigo' || e.tipo === 'saida-esperada').map((e) => e.linguagem).filter(Boolean),
  );
  // resposta-expressao roda sympy, que é python — mesmo num curso sem exercício de código.
  if (exercicios.some((e) => e.tipo === 'resposta-expressao')) langs.add('python');
  return [...langs];
}

export function precisaCAS(exercicios) {
  return exercicios.some((e) => e.tipo === 'resposta-expressao');
}
