/* Checks assets/catalog.js: broken prerequisites, cycles, courses a track lists before
 * something they depend on, and prerequisites that are not on the track showing them.
 *
 * IT EXITS NON-ZERO WHEN SOMETHING IS WRONG. It used to print and return 0, which meant
 * the CI step that runs it could never fail — a check nobody could break is not a check.
 */
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

const isChoice = (i) => typeof i === 'object' && Array.isArray(i.options);
const allOf = (t) => [...new Set(t.courses.flatMap(i => (isChoice(i) ? i.options.flatMap(o => o.courses) : [i])))];

/* A CONTINUATION TRACK DOES NOT REPEAT ITS BASE.
 *
 * `continues` names the track a student has to have finished first. Software Architecture
 * and Technical Leadership have always said that in prose, in `goal`, and it cost them
 * nothing because their courses depend on almost nothing. Data Platform cannot: every one
 * of its seven courses names a prerequisite that lives in Data Engineering, and listing
 * those back would rebuild the entry track inside the continuation — 520h of it.
 *
 * So the field is the declaration, and the checks below read it. It is followed to the end
 * of the chain, and a track that continues itself, or continues nothing, is an error.
 *
 * The base goes in as ALL of its paths rather than one at a time, which is looser than the
 * per-path check below it: a continuation course requiring a course that only exists on one
 * branch of the base's fork would pass here and be wrong for two students in three. Nothing
 * does that today, and the honest fix if something ever does is to make the branch a
 * prerequisite of the whole continuation, not to cross-product the two tracks' paths. */
const trackById = Object.fromEntries(TRACKS.map(t => [t.id, t]));
const inherited = (t, seen = new Set([t.id])) => {
  const base = trackById[t.continues];
  if (!t.continues) return [];
  if (!base) { console.log('missing continues:', t.id, '->', t.continues); errors++; return []; }
  if (seen.has(base.id)) { console.log('CYCLE in continues:', [...seen].join(' -> '), '->', base.id); errors++; return []; }
  seen.add(base.id);
  return allOf(base).concat(inherited(base, seen));
};

/* A dependency declared AFTER the course that requires it makes a cycle in the track's graph —
   and before the fix it stopped the whole track from rendering. */
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

/* THE PREREQUISITE THAT IS NOT THERE.
 *
 * `requires` names what the student has to know before the course. The site draws it as an
 * arrow on the course card — "← Docker" — in every track that shows the course. When the
 * named course is not on that track, the arrow points at nothing: the student reads a
 * prerequisite they have no way to take without leaving.
 *
 * It has one of two causes, and both are worth catching:
 *   - the edge is really curriculum order, not content, and belongs in the track's `links`;
 *   - the edge is real and the track has a hole, and the missing course should go in.
 *
 * Either way it is a decision somebody has to make, and it is invisible in a diff.
 *
 * It is checked per PATH, not per track. Once a track forks, "on this track" is
 * too weak: React sits on the Front-end track but not on the path of the student
 * who chose Svelte, and a course after the fork requiring it would point at
 * something that student never takes. Every complete way through the track is
 * checked separately. */
const certificateSets = (t) => {
  let sets = [[]];
  t.courses.forEach(i => {
    sets = isChoice(i)
      ? sets.flatMap(s => i.options.map(o => s.concat(o.courses)))
      : sets.map(s => s.concat(i));
  });
  return sets.map(s => [...new Set(s)]);
};
let dangling = 0;
TRACKS.forEach(t => {
  const paths = certificateSets(t);
  const base = inherited(t);
  paths.forEach((path, i) => {
    const has = new Set(path.concat(base));
    path.forEach(id => (COURSES.find(c => c.id === id) || {}).requires
      ?.forEach(d => {
        if (!has.has(d)) {
          console.log('ABSENT:', t.id + (paths.length > 1 ? ' [path ' + (i + 1) + ' of ' + paths.length + ']' : ''),
            '—', id, 'requires', d, 'which is not on it');
          dangling++;
        }
      }));
  });
});
console.log(dangling ? dangling + ' prerequisites absent from the track showing them'
  : 'OK — every prerequisite is on every track that shows the course');

const total = errors + outOfOrder + dangling;
if (total) {
  console.log('\n' + total + ' problem' + (total > 1 ? 's' : '') + ' — see above');
  process.exit(1);
}
