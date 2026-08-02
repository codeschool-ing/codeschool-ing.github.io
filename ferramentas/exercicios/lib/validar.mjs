/* Etapa 2: conferir estrutura e executar o que dá para executar.
 *
 * `codigo`         → escreve uma solução de referência SEM ver os casos e roda contra eles.
 * `saida-esperada` → executa o próprio trecho mostrado e compara com o gabarito. Este é o
 *                    mais forte do pipeline: não depende de julgamento nenhum, só do
 *                    interpretador. Pega precedência errada, formatação errada, \n faltando.
 */
import { execFileSync } from 'node:child_process';
import { perguntar } from './claude.mjs';
import { conferir } from './tipos.mjs';

const EXECUTORES = {
  python: { candidatos: ['python3', 'python', 'python3.12', 'python3.11'], args: (src) => ['-c', src] },
  javascript: { candidatos: ['node', 'nodejs'], args: (src) => ['-e', src] },
};

const RESOLVIDO = {};

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

export async function validar({ exercicios, opcoes, timeout, aoProgredir }) {
  const aprovados = [];
  const reprovados = [];

  for (const e of exercicios) {
    const problemas = conferir(e, opcoes);
    if (problemas.length) {
      aoProgredir?.(e, 'ESTRUTURA', problemas.join('; '));
      reprovados.push({ ...e, _motivo: problemas });
      continue;
    }

    if (e.tipo === 'saida-esperada') {
      const r = rodar(e.linguagem, e.codigo_dado, '', timeout);
      if (r.erro) {
        aoProgredir?.(e, 'REPROVA', `o trecho não executa: ${r.erro}`);
        reprovados.push({ ...e, _motivo: [`o trecho não executa: ${r.erro}`] });
      } else if (r.saida !== e.resposta) {
        const det = `gabarito ${JSON.stringify(e.resposta)}, o interpretador produz ${JSON.stringify(r.saida)}`;
        aoProgredir?.(e, 'REPROVA', det);
        reprovados.push({ ...e, _motivo: [det] });
      } else {
        aoProgredir?.(e, 'ok', 'saída confere com o interpretador');
        aprovados.push(e);
      }
      continue;
    }

    if (e.tipo !== 'codigo') {
      aoProgredir?.(e, 'ok', '');
      aprovados.push(e);
      continue;
    }

    const ref = await solucaoDeReferencia(e);
    if (ref.erro) {
      aoProgredir?.(e, 'SOLUÇÃO', ref.erro);
      reprovados.push({ ...e, _motivo: [ref.erro] });
      continue;
    }

    const falhas = [];
    for (const [n, t] of e.testes.entries()) {
      const r = rodar(e.linguagem, ref.solucao, t.entrada, timeout);
      if (r.erro) falhas.push({ caso: n + 1, descricao: t.descricao, motivo: r.erro });
      else if (r.saida !== t.saida_esperada)
        falhas.push({ caso: n + 1, descricao: t.descricao, motivo: 'saída diferente', esperado: t.saida_esperada, obtido: r.saida });
    }

    if (falhas.length) {
      aoProgredir?.(e, 'REPROVA', `${falhas.length}/${e.testes.length} casos`, falhas);
      reprovados.push({ ...e, _motivo: falhas, _solucao_referencia: ref.solucao });
    } else {
      aoProgredir?.(e, 'ok', `${e.testes.length}/${e.testes.length} casos`);
      aprovados.push({ ...e, _solucao_referencia: ref.solucao });
    }
  }

  return { aprovados, reprovados };
}

export function linguagensUsadas(exercicios) {
  return [...new Set(exercicios.filter((e) => e.tipo === 'codigo' || e.tipo === 'saida-esperada').map((e) => e.linguagem).filter(Boolean))];
}
