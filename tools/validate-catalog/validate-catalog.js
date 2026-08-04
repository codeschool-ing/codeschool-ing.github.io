/* Checks assets/dados.js: broken prerequisites, cycles, and courses a track lists before
 * something they depend on.
 *
 * The catalogue's field names stay in Portuguese — they are the website's data contract. So do
 * the messages: they are read next to the data they point at.
 */
const fs = require('fs');
const src = fs.readFileSync(require('path').join(__dirname, '..', '..', 'assets', 'dados.js'), 'utf8');
const { CURSOS, TRILHAS } = (new Function(src + '; return {CURSOS, TRILHAS};'))();
const ids = new Set(CURSOS.map(c => c.id));
let errors = 0;
CURSOS.forEach(c => {
  if (!Array.isArray(c.depende)) { console.log('sem depende:', c.id); errors++; return; }
  c.depende.forEach(d => { if (!ids.has(d)) { console.log('dep inexistente:', c.id, '->', d); errors++; } });
});
// cycles
const seen = {};
function dfs(id, stack) {
  if (stack.includes(id)) { console.log('CICLO:', stack.join(' -> '), '->', id); errors++; return; }
  if (seen[id]) return; seen[id] = 1;
  (CURSOS.find(c => c.id === id)?.depende || []).forEach(d => dfs(d, stack.concat(id)));
}
CURSOS.forEach(c => dfs(c.id, []));
console.log(errors === 0 ? 'OK — sem dependências quebradas nem ciclos' : errors + ' problemas');
// how many courses have 2+ dependencies (that is what justifies the graph)
console.log('cursos com 2+ pré-requisitos:', CURSOS.filter(c => c.depende.length > 1).map(c => c.id).join(' '));

/* A dependency declared AFTER the course that requires it makes a cycle in the track's graph —
   and before the fix it stopped the whole track from rendering. */
const isChoice = (i) => typeof i === 'object' && Array.isArray(i.opcoes);
let outOfOrder = 0;
TRILHAS.forEach(t => {
  const pos = {};
  t.cursos.forEach((it, i) => (isChoice(it) ? it.opcoes.flatMap(o => o.cursos) : [it])
    .forEach(c => { if (pos[c] === undefined) pos[c] = i; }));
  Object.keys(pos).forEach(c => (CURSOS.find(x => x.id === c) || {}).depende
    ?.forEach(d => {
      if (pos[d] !== undefined && pos[d] > pos[c]) {
        console.log('ORDEM:', t.nome, '—', c, 'depende de', d, 'que vem depois na trilha');
        outOfOrder++;
      }
    }));
});
console.log(outOfOrder ? outOfOrder + ' dependências fora de ordem' : 'OK — nenhuma dependência fora de ordem nas trilhas');
