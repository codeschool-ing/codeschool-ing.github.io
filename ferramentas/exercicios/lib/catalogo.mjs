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
 * exercício do tópico N só pode exigir o que os tópicos 1..N ensinaram. */
export function contexto(curso) {
  return `# Curso: ${curso.nome}

**Categoria:** ${curso.categoria} · **Nível:** ${curso.nivel} · **Carga:** ${curso.horas}h

**Resumo:** ${curso.resumo}

**Ementa:** ${curso.ementa}

${curso.requisitos ? `**Pré-requisitos:** ${curso.requisitos}` : ''}

**Todos os tópicos do curso, na ordem em que são ensinados:**
${curso.topicos.map((t, i) => `${i + 1}. ${t}`).join('\n')}`;
}
