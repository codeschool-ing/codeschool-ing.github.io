/* Acesso ao catálogo. Única fonte: assets/dados.js, o mesmo arquivo que o site usa. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const DADOS = path.join(AQUI, '..', '..', '..', 'assets', 'dados.js');

let cache = null;

export function carregar() {
  if (!cache) {
    const g = {};
    new Function('g', fs.readFileSync(DADOS, 'utf8') + '\ng.CURSOS=CURSOS; g.TRILHAS=TRILHAS;')(g);
    cache = g;
  }
  return cache;
}

export function acharCurso(id) {
  const { CURSOS } = carregar();
  const curso = CURSOS.find((c) => c.id === id);
  if (!curso) {
    const e = new Error(`curso "${id}" não existe no catálogo`);
    e.ids = CURSOS.map((c) => c.id);
    throw e;
  }
  return curso;
}

/* Contexto do curso para o prompt. A ordem dos tópicos é restrição, não decoração:
 * exercício do tópico N só pode exigir o que os tópicos 1..N ensinaram.
 *
 * `ate` corta a lista no tópico N. Quem GERA recebe cortado; quem CRITICA recebe inteiro,
 * porque precisa reconhecer uma referência adiante para poder reprová-la.
 *
 * O corte existe porque a regra em prosa não bastava: numa rodada, "exige conteúdo de tópico
 * posterior" foi a segunda maior causa de rejeição paga, com exercícios do tópico 1 pedindo
 * namespaces, cgroups e limites de recurso — todos visíveis na ementa que o gerador recebia
 * inteira. É o princípio do oráculo cego outra vez: não se pede a alguém que ignore o que
 * está lendo, tira-se da vista. */
function lista(curso, ate) {
  const todos = curso.topicos;
  if (!Number.isInteger(ate) || ate >= todos.length) {
    return `**Todos os tópicos do curso, na ordem em que são ensinados:**\n${todos.map((t, i) => `${i + 1}. ${t}`).join('\n')}`;
  }
  return `**Os tópicos ensinados até aqui, na ordem:**
${todos.slice(0, ate).map((t, i) => `${i + 1}. ${t}`).join('\n')}

O curso continua depois destes, e **o que vem depois você não está vendo, de propósito**.
Nenhum exercício pode exigir conceito, comando ou vocabulário que não esteja na lista acima.
Se um exercício parece precisar de algo que não foi ensinado até aqui, ele é do tópico errado:
troque a tarefa em vez de supor que o aluno já viu.`;
}

export function contexto(curso, { ate } = {}) {
  return `# Curso: ${curso.nome}

**Categoria:** ${curso.categoria} · **Nível:** ${curso.nivel} · **Carga:** ${curso.horas}h

**Resumo:** ${curso.resumo}

**Ementa:** ${curso.ementa}

${curso.requisitos ? `**Pré-requisitos:** ${curso.requisitos}` : ''}

${lista(curso, ate)}`;
}
