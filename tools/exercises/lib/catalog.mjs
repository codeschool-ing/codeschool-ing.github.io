/* Catalogue access. Single source: assets/catalog.js, the same file the website uses.
 *
 * This module is the ONLY place that reads the catalogue's field names. That was worth
 * keeping when they were Portuguese and the rest of the tool was English; it is still worth
 * keeping now that both are English, because the catalogue is shared with
 * codeschool-ing/portal-frontend and its shape is a contract with that repository.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(HERE, '..', '..', '..', 'assets', 'catalog.js');

let cache = null;

export function load() {
  if (!cache) {
    const g = {};
    new Function('g', fs.readFileSync(DATA, 'utf8') + '\ng.COURSES=COURSES; g.TRACKS=TRACKS;')(g);
    cache = { courses: g.COURSES, tracks: g.TRACKS };
  }
  return cache;
}

/* The two catalogue fields the rest of the pipeline needs, behind an accessor.
 *
 * They are here, and not read directly, so that the claim at the top of this file stays true:
 * five other places used to reach for `course.topics` and `course.name` themselves, which
 * quietly made the adapter five files wide. Topic order is load-bearing everywhere downstream
 * — it is what "an exercise for topic N may only require topics 1..N" is checked against — so
 * this is the field that would hurt most to have scattered. */
export const courseTopics = (course) => course.topics ?? [];
export const courseName = (course) => course.name;

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
  const all = course.topics;
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
  return `# Curso: ${course.name}

**Categoria:** ${course.category} · **Nível:** ${course.level} · **Carga:** ${course.hours}h

**Resumo:** ${course.summary}

**Ementa:** ${course.syllabus}

${course.prerequisites ? `**Pré-requisitos:** ${course.prerequisites}` : ''}

${topicList(course, upTo)}`;
}
