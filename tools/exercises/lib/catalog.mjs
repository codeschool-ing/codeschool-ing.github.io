/* Catalogue access. Single source: assets/dados.js, the same file the website uses.
 *
 * This module is the ONLY place that touches the catalogue's Portuguese field names
 * (`nome`, `topicos`, `ementa`…). They belong to the website's data contract, not to this
 * tool, so renaming them here would break the live site. Keeping the adapter in one file
 * means that when the site itself is translated, only this file has to follow.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(HERE, '..', '..', '..', 'assets', 'dados.js');

let cache = null;

export function load() {
  if (!cache) {
    const g = {};
    new Function('g', fs.readFileSync(DATA, 'utf8') + '\ng.CURSOS=CURSOS; g.TRILHAS=TRILHAS;')(g);
    cache = { courses: g.CURSOS, tracks: g.TRILHAS };
  }
  return cache;
}

/* The two catalogue fields the rest of the pipeline needs, behind an accessor.
 *
 * They are here, and not read directly, so that the claim at the top of this file stays true:
 * five other places used to reach for `course.topicos` and `course.nome` themselves, which
 * quietly made the adapter five files wide. Topic order is load-bearing everywhere downstream
 * — it is what "an exercise for topic N may only require topics 1..N" is checked against — so
 * this is the field that would hurt most to have scattered. */
export const courseTopics = (course) => course.topicos ?? [];
export const courseName = (course) => course.nome;

export function findCourse(id) {
  const { courses } = load();
  const course = courses.find((c) => c.id === id);
  if (!course) {
    const e = new Error(`course "${id}" is not in the catalogue`);
    e.ids = courses.map((c) => c.id);
    throw e;
  }
  return course;
}

/* Course context for the prompt. Topic order is a constraint, not decoration: an exercise
 * for topic N may only require what topics 1..N have taught.
 *
 * `upTo` cuts the list at topic N. Whoever GENERATES gets the cut list; whoever CRITIQUES
 * gets the whole thing, because it has to recognise a forward reference in order to fail one.
 *
 * The cut exists because the rule in prose was not enough: in one round "requires content
 * from a later topic" was the second largest cause of paid rejection, with topic-1 exercises
 * asking for namespaces, cgroups and resource limits — all of them visible in the syllabus
 * the generator received whole. It is the blind-oracle principle again: you do not ask
 * someone to ignore what they are reading, you take it out of sight.
 *
 * The prompt text stays in Portuguese here because it is interleaved with Portuguese course
 * data and read by a model that must answer in Portuguese; see RULES.md, section on language.
 */
function topicList(course, upTo) {
  const all = course.topicos;
  if (!Number.isInteger(upTo) || upTo >= all.length) {
    return `**Todos os tópicos do curso, na ordem em que são ensinados:**\n${all.map((t, i) => `${i + 1}. ${t}`).join('\n')}`;
  }
  return `**Os tópicos ensinados até aqui, na ordem:**
${all.slice(0, upTo).map((t, i) => `${i + 1}. ${t}`).join('\n')}

O curso continua depois destes, e **o que vem depois você não está vendo, de propósito**.
Nenhum exercício pode exigir conceito, comando ou vocabulário que não esteja na lista acima.
Se um exercício parece precisar de algo que não foi ensinado até aqui, ele é do tópico errado:
troque a tarefa em vez de supor que o aluno já viu.`;
}

export function courseContext(course, { upTo } = {}) {
  return `# Curso: ${course.nome}

**Categoria:** ${course.categoria} · **Nível:** ${course.nivel} · **Carga:** ${course.horas}h

**Resumo:** ${course.resumo}

**Ementa:** ${course.ementa}

${course.requisitos ? `**Pré-requisitos:** ${course.requisitos}` : ''}

${topicList(course, upTo)}`;
}
