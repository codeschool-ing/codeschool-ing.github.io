/* Checks the four catalogue dictionaries against assets/catalog.js.
 *
 * WHY IT EXISTS. The dictionaries are keyed by id, and a missing key is not an error at
 * runtime — the field falls back to the English source. That is the right behaviour for a
 * half-finished translation and the wrong one for a mistake: the page renders, nothing
 * throws, and one line of the site is silently in another language. It has to be a check,
 * because it is invisible from the outside.
 *
 * The bug that made it a tool: inserting a course into a track moves the positions after it,
 * and a track's `steps` are keyed BY POSITION. Back-end's fork moved from index 3 to 4 and
 * Data's from 17 to 18, the dictionaries kept the old keys, and the label of both forks fell
 * back to English in all four languages. Nothing failed. It shipped.
 *
 * Exits non-zero when something is wrong.
 */
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', '..', 'assets');
const read = (f) => fs.readFileSync(path.join(dir, f), 'utf8');
const { COURSES, TRACKS } = (new Function(read('catalog.js') + '; return {COURSES, TRACKS};'))();

const LANGS = ['pt', 'es', 'fr', 'it'];
const isChoice = (i) => typeof i === 'object' && Array.isArray(i.options);

global.window = { I18N: {} };
LANGS.forEach((lang) => eval(read('i18n-courses-' + lang + '.js')));

let problems = 0;
const bad = (...msg) => { console.log(...msg); problems++; };

const byId = Object.fromEntries(COURSES.map((c) => [c.id, c]));

LANGS.forEach((lang) => {
  const dict = (global.window.I18N || {})[lang];
  if (!dict) { bad(lang + ': no dictionary at all'); return; }
  const courses = dict.courses || {};
  const tracks = dict.tracks || {};

  // a course in the catalogue with no entry shows its whole card in English
  COURSES.forEach((c) => {
    const t = courses[c.id];
    if (!t) { bad(lang + ': no entry for course', c.id); return; }
    ['name', 'summary'].forEach((f) => {
      if (!t[f]) bad(lang + ':', c.id, 'has no', f);
    });
    if (c.prerequisites && !t.prerequisites) bad(lang + ':', c.id, 'has no prerequisites sentence');
    // a shorter list is not an error at runtime: the modal simply shows fewer lines
    ['syllabus', 'topics'].forEach((f) => {
      if (!c[f]) return;
      if (!Array.isArray(t[f])) { bad(lang + ':', c.id, 'has no', f); return; }
      if (t[f].length !== c[f].length) {
        bad(lang + ':', c.id, f, 'has', t[f].length, 'lines against', c[f].length, 'in the source');
      }
    });
  });
  // an entry for an id that no longer exists is dead weight nobody will notice
  Object.keys(courses).forEach((id) => {
    if (!byId[id]) bad(lang + ': entry for', id + ', which is not in the catalogue');
  });

  TRACKS.forEach((track) => {
    const t = tracks[track.id];
    if (!t) { bad(lang + ': no entry for track', track.id); return; }
    ['name', 'goal', 'outcome'].forEach((f) => {
      if (!t[f]) bad(lang + ': track', track.id, 'has no', f);
    });

    // the fork: keyed by position in `courses`, which moves whenever a step is inserted
    const steps = t.steps || {};
    const positions = [];
    track.courses.forEach((item, i) => { if (isChoice(item)) positions.push(String(i)); });

    positions.forEach((pos) => {
      const s = steps[pos];
      if (!s) {
        bad(lang + ': track', track.id, 'forks at step', pos, 'and has no translation for it' +
          (Object.keys(steps).length ? ' (it has ' + JSON.stringify(Object.keys(steps)) + ')' : ''));
        return;
      }
      if (!s.choice) bad(lang + ': track', track.id, 'step', pos, 'has no choice label');
      if (!s.note) bad(lang + ': track', track.id, 'step', pos, 'has no note');
      const opts = track.courses[Number(pos)].options.length;
      if (!Array.isArray(s.options) || s.options.length !== opts) {
        bad(lang + ': track', track.id, 'step', pos, 'has',
          (s.options || []).length, 'option names against', opts, 'in the source');
      }
    });
    Object.keys(steps).forEach((pos) => {
      if (!positions.includes(pos)) {
        bad(lang + ': track', track.id, 'has a translated step at', pos + ', where the source does not fork');
      }
    });
  });
});

/* ---------- the plan card's two numbers ----------

   THE SENTENCE THAT SAID 86 AND 16. The catalogue passed 122 and 19 and the
   sales page went on undercounting itself by a third, in five files, because
   somebody had typed the size of the catalogue into a sentence sitting next to
   the file that knows it. `script.js` fills `{courses}` and `{tracks}` in now.

   What can undo that is a translator — or a future edit — helpfully replacing a
   placeholder with the number it happened to render as. Then that one language
   freezes at today's catalogue and nothing says so. So: the English key must
   carry both placeholders, every translation of it must carry both, and no
   dictionary may name a bare count. */
const PLAN_KEY = 'All {courses} courses and {tracks} tracks';
{
  global.window.I18N = global.window.I18N || {};
  ['i18n.js', 'i18n-pt.js'].forEach((f) => eval(read(f)));

  const html = fs.readFileSync(path.join(dir, '..', 'index.html'), 'utf8');
  if (!html.includes(PLAN_KEY)) {
    bad('index.html: the plan card does not carry "' + PLAN_KEY + '" —',
      'a hard-coded count is how it went stale the first time');
  }
  LANGS.forEach((lang) => {
    const ui = ((global.window.I18N || {})[lang] || {}).ui || {};
    const line = ui[PLAN_KEY];
    if (!line) { bad(lang + ': no translation for the plan card\'s catalogue line'); return; }
    if (!line.includes('{courses}') || !line.includes('{tracks}')) {
      bad(lang + ': the plan card line lost a placeholder —', JSON.stringify(line) + ',',
        'so that language is frozen at whatever the catalogue was that day');
    }
  });
}

console.log(problems
  ? '\n' + problems + ' problem' + (problems > 1 ? 's' : '') + ' — see above'
  : 'OK — ' + COURSES.length + ' courses and ' + TRACKS.length + ' tracks, complete in ' + LANGS.length + ' languages');
if (problems) process.exit(1);
