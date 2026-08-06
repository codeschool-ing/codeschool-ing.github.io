/* Checks assets/catalog.js: broken prerequisites, cycles, and courses a track lists before
 * something they depend on. */
const fs = require('fs');
const src = fs.readFileSync(require('path').join(__dirname, '..', '..', 'assets', 'catalog.js'), 'utf8');
const { COURSES, TRACKS } = (new Function(src + '; return {COURSES, TRACKS};'))();
const ids = new Set(COURSES.map(c => c.id));
let errors = 0;
COURSES.forEach(c => {
  if (!Array.isArray(c.requires)) { console.log('no requires:', c.id); errors++; return; }
  c.requires.forEach(d => { if (!ids.has(d)) { console.log('missing dep:', c.id, '->', d); errors++; } });
});
// cycles
const seen = {};
function dfs(id, stack) {
  if (stack.includes(id)) { console.log('CYCLE:', stack.join(' -> '), '->', id); errors++; return; }
  if (seen[id]) return; seen[id] = 1;
  (COURSES.find(c => c.id === id)?.requires || []).forEach(d => dfs(d, stack.concat(id)));
}
COURSES.forEach(c => dfs(c.id, []));
console.log(errors === 0 ? 'OK — no broken dependencies and no cycles' : errors + ' problems');
// how many courses have 2+ dependencies (that is what justifies the graph)
console.log('courses with 2+ prerequisites:', COURSES.filter(c => c.requires.length > 1).map(c => c.id).join(' '));

/* A dependency declared AFTER the course that requires it makes a cycle in the track's graph —
   and before the fix it stopped the whole track from rendering. */
const isChoice = (i) => typeof i === 'object' && Array.isArray(i.options);
let outOfOrder = 0;
TRACKS.forEach(t => {
  const pos = {};
  t.courses.forEach((it, i) => (isChoice(it) ? it.options.flatMap(o => o.courses) : [it])
    .forEach(c => { if (pos[c] === undefined) pos[c] = i; }));
  Object.keys(pos).forEach(c => (COURSES.find(x => x.id === c) || {}).requires
    ?.forEach(d => {
      if (pos[d] !== undefined && pos[d] > pos[c]) {
        console.log('ORDER:', t.name, '—', c, 'requires', d, 'which comes later in the track');
        outOfOrder++;
      }
    }));
});
console.log(outOfOrder ? outOfOrder + ' dependencies out of order' : 'OK — no dependency out of order in any track');
