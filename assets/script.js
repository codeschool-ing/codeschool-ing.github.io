/* ==========================================================================
   codeschool.ing — showcase site (data in assets/dados.js)

   ON LANGUAGE: comments and logic identifiers are in English. Three families of
   name stay in Portuguese because they are contracts, not preferences:

     · the catalogue's fields (`name`, `horas`, `topicos`, `depende`, `opcoes`…),
       which assets/catalog.js and the i18n-courses-*.js files define;
     · DOM ids, `data-*` attributes and CSS classes (`#track-panel`, `.course-node`,
       `.fork-tab`), which index.html and style.css share with this file;
     · the arguments to `txt()`, which ARE the translation keys — the Portuguese
       sentence is the lookup key across all four translation files.

   Text the visitor reads is Portuguese for the obvious reason.
   ========================================================================== */

const $ = (sel) => document.querySelector(sel);
const courseById = (id) => COURSES.find((c) => c.id === id);

/* ---------- tracks with a fork ----------
   An item of `courses` is either a course id (a string) or a choice step (an
   object with `opcoes`). Hence three different readings of the same track:
   every possible course, the chosen path, and the hours of that path. */
const isChoice = (item) => typeof item === 'object' && Array.isArray(item.options);

// every course the track can contain, adding up all the options
const allCourses = (t) =>
  t.courses.flatMap((i) => (isChoice(i) ? i.options.flatMap((o) => o.courses) : [i]));

// each track's current choice, by option index (the first one is the suggested one)
const choices = {};
const activeOption = (trackId, stepIdx) => (choices[trackId + ':' + stepIdx] || 0);

// the path the student is looking at right now
const trackPath = (t) =>
  t.courses.flatMap((i, idx) => (isChoice(i) ? i.options[activeOption(t.id, idx)].courses : [i]));

const hoursOf = (ids) => ids.reduce((s, id) => s + (courseById(id)?.hours || 0), 0);

/* ---------- a track's graph ----------
   Each course on the path becomes a node; a choice step becomes a single node
   (the block), because it is a decision, not a course. The edges come from each
   course's `depende` field, clipped to what exists in this track. A node's level
   is 1 + the highest level among its prerequisites, which puts side by side
   everything that can be done at the same time. */
function trackGraph(t) {
  const nodes = [];
  const ofCourse = {};   // course id -> id of the node containing it
  const forkMembers = {}; // course id (from any option) -> fork node id

  t.courses.forEach((item, idx) => {
    if (!isChoice(item)) {
      nodes.push({ id: item, kind: 'curso', courses: [item] });
      ofCourse[item] = item;
      return;
    }
    const nodeId = 'fork:' + idx;
    nodes.push({ id: nodeId, kind: 'fork', step: item, idx: idx, courses: item.options[activeOption(t.id, idx)].courses });
    item.options.forEach((o) => o.courses.forEach((c) => { forkMembers[c] = nodeId; }));
    item.options[activeOption(t.id, idx)].courses.forEach((c) => { ofCourse[c] = nodeId; });
  });

  // edges: prerequisite -> course, resolving inner courses to their block
  const idOfItem = (v) => (typeof v === 'number' ? nodes[v] && nodes[v].id : ofCourse[v] || forkMembers[v]);
  nodes.forEach((node, i) => {
    const deps = new Set();
    node.courses.forEach((id) => {
      (courseById(id)?.requires || []).forEach((d) => {
        const target = ofCourse[d] || forkMembers[d];
        if (target && target !== node.id) deps.add(target);
      });
      // links that exist only in this track (curriculum order, not content order)
      ((t.links || {})[id] || []).forEach((v) => {
        const target = idOfItem(v);
        if (target && target !== node.id) deps.add(target);
      });
    });
    // no prerequisite at all inside this track: the curriculum order applies,
    // otherwise courses like `nuvem` and `testes-cicd` would all land on level one
    if (!deps.size && i > 0) deps.add(nodes[i - 1].id);
    node.deps = [...deps];
  });

  // finish node: everything that is nobody's prerequisite flows into it, so the
  // graph does not end in loose courses with no outgoing arrow
  const hasSuccessor = {};
  nodes.forEach((n) => n.deps.forEach((d) => { hasSuccessor[d] = true; }));
  nodes.push({ id: '@saida', kind: 'saida', courses: [], deps: nodes.filter((n) => !hasSuccessor[n.id]).map((n) => n.id) });

  const successors = {};
  nodes.forEach((n) => n.deps.forEach((d) => { (successors[d] = successors[d] || []).push(n.id); }));

  /* Levels by iterative topological sort (Kahn). The earlier recursive version
     had a depth ceiling that blew up on the long tracks — Data Engineering and
     DevSecOps ended up with no level and did not render. */
  const level = {};
  const remaining = {};
  nodes.forEach((n) => { remaining[n.id] = n.deps.length; });
  const queue = nodes.filter((n) => !n.deps.length).map((n) => n.id);
  queue.forEach((id) => { level[id] = 0; });
  for (let i = 0; i < queue.length; i += 1) {
    const id = queue[i];
    (successors[id] || []).forEach((s) => {
      level[s] = Math.max(level[s] === undefined ? 0 : level[s], level[id] + 1);
      remaining[s] -= 1;
      if (remaining[s] <= 0) queue.push(s);
    });
  }
  /* Safety net: if the data forms a cycle (a course depending on another one
     declared after it in the track), Kahn's queue runs dry before the end.
     Instead of leaving those nodes without a level — which made the whole track
     disappear — they go in after the highest prerequisite already resolved. */
  const stuck = nodes.filter((n) => level[n.id] === undefined);
  stuck.forEach((n) => {
    const resolved = n.deps.map((d) => level[d]).filter((v) => v !== undefined);
    level[n.id] = resolved.length ? Math.max(...resolved) + 1 : 0;
    queue.push(n.id);
  });
  if (stuck.length && window.console) {
    console.warn('track "' + t.name + '": circular dependency in ' + stuck.map((n) => n.id).join(', '));
  }

  // group by level, leaving no hole in the sequence of columns
  const byLevel = {};
  nodes.forEach((n) => { (byLevel[level[n.id]] = byLevel[level[n.id]] || []).push(n); });
  const columns = Object.keys(byLevel)
    .map(Number)
    .sort((a, b) => a - b)
    .map((v) => byLevel[v]);
  columns.forEach((col, i) => col.forEach((n) => { level[n.id] = i; }));

  /* ---------- ordering within each level ----------
     This is where the graph's structural intelligence lives. NOTHING is pinned
     per track: the algorithm measures the drawing that will come out and picks
     the order that produces the fewest line crossings. A new track comes in and
     is optimised the same way, with nobody having to fix the order by hand.

     Three pieces, all from Sugiyama's method:

       1. barycentre — each node is pulled towards the average height of its
          neighbours in the next column. It gets close fast, but it gets stuck in
          local optima: some cases only improve by moving TWO columns, and no
          isolated swap improves anything on its own;
       2. transposition — swap neighbouring pairs within a column as long as that
          does not make things worse. Accepting the TIED swaps unlocks those
          two-column cases: the first swap moves sideways, the second collects
          the gain;
       3. multiple starts — the two above are pure greedy and the result depends
          on where you begin. So it restarts from several initial orders (the
          curriculum's, the reverse, and a few shuffled ones) and keeps the best
          of them all. The shuffle uses a fixed-seed generator: the output is
          always the same, the graph does not change shape between visits.

     It costs ~7 ms for all 16 tracks, once per page open. */

  const position = {};
  const reindex = () => columns.forEach((col) => col.forEach((n, i) => {
    position[n.id] = col.length > 1 ? i / (col.length - 1) : 0.5;
  }));

  /* The edges, separated by the level gap each one spans. */
  const edges = [];
  nodes.forEach((n) => n.deps.forEach((d) => {
    if (level[d] < level[n.id]) edges.push({ from: d, to: n.id, span: level[n.id] - level[d] });
  }));

  /* The cost of an ordering. THREE criteria, in priority order — compared one by
     one, not summed: the second is only consulted when the first ties, and the
     third when both tie. That way no lesser criterion can buy an extra crossing.

     1) CROSSINGS — what the drawing actually shows.
        An edge from one level to the next becomes a direct curve: two cross when
        the vertical order of their endpoints inverts.
        An edge that skips levels is not drawn straight: `drawEdges` diverts it to
        a free lane outside the graph (that is the rule "if the line would pass
        behind a course, take the line around the outside"). It then only crosses
        anything on the way out and on the way in, going up or down to that lane,
        crossing the direct edges that pass above (or below) it. The router picks
        the nearer side; the cost function picks the same.

     2) UPWARD BIAS — with up and down tied, the diversion goes up. It is a
        convention, but a uniform one: with every shortcut leaving the same side,
        the track's main body stays contiguous instead of being split by lines
        passing on both sides.

     3) CURRICULUM ORDER — among equally clean drawings, the one that keeps the
        courses in the sequence the track declares wins. Without this, each start
        of the optimiser would return an arbitrary permutation among the good
        ones, and levels like "Qualidade · Performance · Entrega" would show up out
        of order for no gain at all. */
  const curriculumOrder = {};
  nodes.forEach((n, i) => { curriculumOrder[n.id] = i; });
  const gaps = [];
  const cost = () => {
    for (let g = 0; g < columns.length - 1; g += 1) gaps[g] = [];
    edges.forEach((e) => {
      if (e.span === 1) gaps[level[e.from]].push({ a: position[e.from], b: position[e.to] });
    });
    let crossings = 0;
    gaps.forEach((list) => {
      for (let i = 0; i < list.length; i += 1) {
        for (let j = i + 1; j < list.length; j += 1) {
          if ((list[i].a - list[j].a) * (list[i].b - list[j].b) < 0) crossings += 1;
        }
      }
    });
    let bias = 0;
    edges.forEach((e) => {
      if (e.span === 1) return;
      const pu = position[e.from], pv = position[e.to];
      const out = gaps[level[e.from]], into = gaps[level[e.to] - 1];
      let above = 0, below = 0;
      out.forEach((s) => { if (s.a < pu) above += 1; else if (s.a > pu) below += 1; });
      into.forEach((s) => { if (s.b < pv) above += 1; else if (s.b > pv) below += 1; });
      crossings += Math.min(above, below);
      bias += pu + pv;
    });
    let outOfOrder = 0;
    columns.forEach((col) => {
      for (let i = 0; i < col.length; i += 1) {
        for (let j = i + 1; j < col.length; j += 1) {
          if (curriculumOrder[col[i].id] > curriculumOrder[col[j].id]) outOfOrder += 1;
        }
      }
    });
    return [crossings, bias, outOfOrder];
  };
  /* compares two costs criterion by criterion (lexicographic order) */
  const worse = (a, b) => {
    for (let i = 0; i < a.length; i += 1) {
      if (a[i] !== b[i]) return a[i] > b[i];
    }
    return false;
  };
  const same = (a, b) => a.every((v, i) => v === b[i]);

  /* mean and median of the neighbours' heights — the median usually does better
     when a node has few, widely spread neighbours, so the two alternate between
     passes */
  const MEAN = (v) => v.reduce((a, b) => a + b, 0) / v.length;
  const MEDIAN = (v) => {
    const s = v.slice().sort((a, b) => a - b);
    return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
  };
  const sortColumn = (col, neighbours, aggregate) => {
    const keys = col.map((n, i) => {
      const v = neighbours(n).map((id) => position[id]).filter((x) => x !== undefined);
      return { n: n, b: v.length ? aggregate(v) : null, i: i };
    });
    keys.sort((a, b) => (a.b === null || b.b === null ? a.i - b.i : (a.b - b.b) || (a.i - b.i)));
    return keys.map((x) => x.n);
  };

  /* swaps neighbouring pairs while it pays off; `acceptTies` lets the algorithm
     move sideways to get out of a local optimum */
  const transpose = (acceptTies) => {
    let improved = true;
    let laps = 0;
    while (improved && laps < 8) {
      improved = false;
      laps += 1;
      columns.forEach((col) => {
        for (let i = 0; i + 1 < col.length; i += 1) {
          const before = cost();
          const tmp = col[i]; col[i] = col[i + 1]; col[i + 1] = tmp;
          reindex();
          const after = cost();
          if (worse(before, after) || (acceptTies && same(before, after))) {
            if (worse(before, after)) improved = true;
          } else {
            const v = col[i]; col[i] = col[i + 1]; col[i + 1] = v;
            reindex();
          }
        }
      });
    }
  };

  reindex();
  let best = columns.map((col) => col.slice());
  let bestCost = cost();
  const keep = () => {
    const c = cost();
    if (worse(bestCost, c)) { bestCost = c; best = columns.map((col) => col.slice()); }
  };

  const initial = columns.map((col) => col.slice());
  let seed = 1;   // linear congruential generator: always shuffles the same way
  const random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const STARTS = ['curriculum', 'reversed', 'random', 'random', 'random', 'random'];

  STARTS.forEach((start) => {
    columns.length = 0;
    initial.forEach((col) => {
      if (start === 'curriculum') return columns.push(col.slice());
      if (start === 'reversed') return columns.push(col.slice().reverse());
      const a = col.slice();
      for (let i = a.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        const t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return columns.push(a);
    });
    reindex();
    /* on a shuffled start, climb the hill BEFORE the barycentre: if the
       barycentre runs first it reorders everything by neighbours and erases the
       shuffle, and the start stops being a different start */
    if (start === 'random') { transpose(true); keep(); }
    for (let pass = 0; pass < 2; pass += 1) {
      const aggregate = pass % 2 ? MEDIAN : MEAN;
      for (let v = 1; v < columns.length; v += 1) {
        columns[v] = sortColumn(columns[v], (n) => n.deps, aggregate);
        reindex();
      }
      for (let v = columns.length - 2; v >= 0; v -= 1) {
        columns[v] = sortColumn(columns[v], (n) => successors[n.id] || [], aggregate);
        reindex();
      }
      keep();
      transpose(pass % 2 === 1);
      keep();
    }
  });

  columns.length = 0;
  best.forEach((col) => columns.push(col));
  columns.forEach((col, i) => col.forEach((n) => { level[n.id] = i; }));

  return { nodes: nodes, columns: columns, level: level, realLevels: columns.length - 1 };
}

// workload range: the shortest and the longest possible path
function hoursRange(t) {
  let min = 0, max = 0;
  t.courses.forEach((i) => {
    if (!isChoice(i)) { const h = courseById(i)?.hours || 0; min += h; max += h; return; }
    const hs = i.options.map((o) => hoursOf(o.courses));
    min += Math.min(...hs);
    max += Math.max(...hs);
  });
  return { min, max };
}

// in how many tracks a course appears (the same course can serve several)
const tracksOfCourse = (id) => TRACKS.filter((t) => allCourses(t).includes(id));
// the inverse of `depende`: which courses this one unlocks
const unlockedBy = (id) => COURSES.filter((c) => (c.requires || []).includes(id));

document.getElementById('year').textContent = new Date().getFullYear();

/* ---------- the released version ----------

   IT ANSWERS ONE QUESTION, and the person asking is not a student: what is
   actually deployed right now. That is why it sits in the footer's link row,
   beside `github`, at the size the row already uses — a visitor deciding
   whether to enrol has no use for it, and it must not compete for their
   attention.

   THE PAGE NEVER INVENTS IT. The single source is the `version` meta tag, and
   the release workflow refuses a tag that disagrees with it. Anything other
   than a semantic version — `dev`, the state of every build that is not a
   release — leaves the link out of the document rather than pointing at a
   GitHub tag that does not exist.

   Written AFTER the i18n runtime has walked the DOM, which is what keeps a
   language switch from treating "v1.2.0" as a sentence to translate: the
   element is empty when the walk stores the page's text, so nothing about it
   is stored, and `applyTexts` has nothing to rewrite. */
(() => {
  const version = document.querySelector('meta[name="version"]')?.content?.trim() || '';
  if (!/^\d+\.\d+\.\d+(?:[-+][\w.]+)?$/.test(version)) return;

  const el = document.getElementById('version');
  if (!el) return;
  el.textContent = 'v' + version;
  el.href = 'https://github.com/codeschool-ing/codeschool-ing.github.io/releases/tag/v' + version;
  el.hidden = false;
})();
$('#n-courses').textContent = COURSES.length;
$('#n-tracks').textContent = TRACKS.length;
/* the catalogue's real total workload, in place of the old "5,000+ students
   graduated" — a number a new school does not have. This one grows by itself
   when a course is added, and it is true on the day the site goes up. The
   thousands separator follows the language: 5.930 in Portuguese, 5,930 in
   English. */
const TOTAL_HOURS = COURSES.reduce((s, c) => s + (c.hours || 0), 0);
const currentLocale = () => (LANGUAGES.find((i) => i.code === LANG) || {}).html || 'en';
function showHours() {
  $('#n-hours').textContent = TOTAL_HOURS.toLocaleString(currentLocale());
}
showHours();

/* ---------- the hero terminal ----------
   Four commands, and not one hand-written response: the numbers, the track names
   and the course card all come out of COURSES and TRACKS. That way the terminal
   does not go stale — a new track comes in and it counts right — and there is no
   way for it to contradict the rest of the page.

   The commands stay in English because they are a tool's name; the responses
   follow the chosen language. */
const SHOWCASE_COURSE = 'kubernetes';   // advanced and with a prerequisite: shows both things
function buildTerminal() {
  const body = $('#term-body');
  if (!body) return;
  const cmd = (s) => '<div class="term-line"><span class="pr">$</span> ' + s + '</div>';
  const arrow = (m, cls, s) => '<div class="term-line"><span class="' + cls + '">' + m + '</span> ' + s + '</div>';
  const blank = '<div class="term-gap"></div>';

  const status = arrow('✓', 'ok',
    COURSES.length + ' ' + txt('courses ·') + ' ' + TRACKS.length + ' ' + txt('tracks ·') +
    ' ' + TOTAL_HOURS.toLocaleString(currentLocale()) + ' ' + txt('hours of content'));

  const career = TRACKS.filter((t) => t.family === 'career');
  const list = career.slice(0, 3).map((t) => {
    const f = hoursRange(t);
    return arrow('→', 'pr', t.name + ' · ' + (f.min === f.max ? f.min : f.min + '–' + f.max) + 'h');
  }).join('');
  const rest = career.length - 3;
  const moreTracks = rest > 0
    ? '<div class="term-line"><span class="cm">  ' +
      txt('… and {n} more career tracks').replace('{n}', rest) + '</span></div>'
    : '';

  const c = courseById(SHOWCASE_COURSE) || COURSES.find((x) => (x.requires || []).length);
  const card = c
    ? cmd('codeschool course ' + c.id + ' --info') +
      arrow('→', 'pr', c.name + ' · ' + c.hours + 'h · ' + txt(c.level)) +
      ((c.requires || []).length
        ? arrow('↳', 'cm', txt('needs first:') + ' ' +
            c.requires.map((d) => courseById(d)?.name).filter(Boolean).join(', '))
        : '')
    : '';

  body.innerHTML =
    cmd('codeschool --status') + status + blank +
    cmd('codeschool tracks --career') + list + moreTracks + blank +
    card + blank +
    cmd('codeschool start<span class="cursor"></span>');
  // each line's position becomes its animation delay
  [...body.children].forEach((el, i) => el.style.setProperty('--i', i));
}
buildTerminal();

/* ---------- light/dark theme ----------
   The key and its two values were renamed, and both halves matter: a returning
   visitor stored `codeschool-tema: claro`, and reading only the new name would
   put them back on the dark theme they had turned off. Read the old one once,
   translate the value, write the new one, forget the old name. The same read
   lives inlined in index.html's <head>, because the anti-flash script runs
   before this file does. */
const THEME_KEY = 'codeschool-theme';
const THEME_KEY_LEGACY = 'codeschool-tema';
const THEME_LEGACY_VALUES = { claro: 'light', escuro: 'dark' };

function storedTheme() {
  try {
    const fresh = localStorage.getItem(THEME_KEY);
    if (fresh) return fresh;
    const old = localStorage.getItem(THEME_KEY_LEGACY);
    if (old) {
      const moved = THEME_LEGACY_VALUES[old] || old;
      localStorage.setItem(THEME_KEY, moved);
      localStorage.removeItem(THEME_KEY_LEGACY);
      return moved;
    }
  } catch (e) { /* private mode */ }
  return 'dark';
}

const themeBtn = $('#theme-btn');
function applyTheme(theme) {
  if (theme === 'light') document.documentElement.dataset.theme = 'light';
  else delete document.documentElement.dataset.theme;
  themeBtn.setAttribute('aria-label', theme === 'light' ? txt('Switch to the dark theme') : txt('Switch to the light theme'));
}
themeBtn.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
  applyTheme(next);
});
applyTheme(storedTheme());

/* ---------- the old section anchors ----------
   `#trilhas`, `#cursos`, `#planos`, `#alunos`, `#contato` and `#topo` are
   published: they are in the nav, in bookmarks, and possibly in links this
   repository does not control. They were renamed with everything else — keeping
   six Portuguese ids would have been the one carve-out — so the old fragment has
   to keep working. This maps it to the new one on load and on every hashchange.
   It is cheap and it never expires; an inbound link does not, either. */
const MOVED_ANCHORS = {
  '#topo': '#top', '#trilhas': '#tracks', '#cursos': '#courses',
  '#planos': '#plans', '#alunos': '#students', '#contato': '#contact',
};
function moveAnchor() {
  const to = MOVED_ANCHORS[location.hash];
  if (to) history.replaceState(null, '', to);
}
moveAnchor();
addEventListener('hashchange', moveAnchor);

/* ---------- mobile menu ---------- */
const menu = $('#menu');
$('#burger').addEventListener('click', () => menu.classList.toggle('open'));

/* ==========================================================
   TRACKS — a sequence of courses with arrows
   ========================================================== */
const panelEl = $('#track-panel');
let currentTrack = 0;
let swapT = null;

/* Two families of track: "carreira" answers which profession the student wants,
   "tecnologia" answers which tool they want to master. Each has its own row of
   tabs, with its own label and arrows — since there are only two, the switcher
   that used to be there cost more height than it conveyed. The index used
   throughout this section is still the one into TRACKS. */
const FAMILIES = ['career', 'technology'];
const familyOf = (t) => t.family || 'career';
const indicesOfFamily = (f) => TRACKS.map((t, i) => (familyOf(t) === f ? i : -1)).filter((i) => i >= 0);
const familyBox = (f) => document.querySelector('.tabs-box[data-family="' + f + '"]');
const familyTabs = (f) => $('#tabs-' + f);

/* The tracks dropdown (mobile): the two scrollable rows become a single list,
   grouped by family. Same data source, same opening function. */
const trackDrop = $('#drop-tracks');
function buildTrackDropdown() {
  const list = $('#drop-tracks-list');
  list.textContent = '';
  FAMILIES.forEach((f) => {
    const h = document.createElement('div');
    h.className = 'drop-group';
    h.textContent = txt(f === 'career' ? 'career tracks' : 'technology tracks');
    list.appendChild(h);
    indicesOfFamily(f).forEach((i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'drop-op' + (i === currentTrack ? ' on' : '');
      b.textContent = TRACKS[i].name;
      b.addEventListener('click', () => { openTrack(i); closeDropdowns(); });
      list.appendChild(b);
    });
  });
  trackDrop.querySelector('.drop-current').textContent = TRACKS[currentTrack].name;
}

function buildTabs() {
  FAMILIES.forEach((f) => {
    const el = familyTabs(f);
    el.textContent = '';
    indicesOfFamily(f).forEach((i) => {
      const b = document.createElement('button');
      b.className = 'track-tab' + (i === currentTrack ? ' on' : '');
      b.type = 'button';
      b.dataset.idx = i;
      b.setAttribute('role', 'tab');
      b.textContent = TRACKS[i].name;
      b.addEventListener('click', () => openTrack(i));
      el.appendChild(b);
    });
  });
}

/* a course's card inside the graph */
function courseCard(id, order, deps) {
  const c = courseById(id);
  if (!c) return '';
  const nT = tracksOfCourse(id).length;
  const requires = (deps || []).map((d) => courseById(d)?.name).filter(Boolean);
  return (
    '<button class="course-node" type="button" data-course="' + c.id + '" data-node="' + c.id + '">' +
      (order ? '<span class="order">' + txt('level') + ' ' + order + '</span>' : '') +
      '<span class="name">' + c.name + '</span>' +
      (nT > 1 ? '<span class="tag-shared">' + txt('in') + ' ' + nT + ' ' + txt('tracks') + '</span>' : '') +
      '<span class="meta">' + c.hours + 'h · ' + txt(c.level) + '</span>' +
      (requires.length ? '<span class="requires">' + txt('after') + ' ' + requires.join(' + ') + '</span>' : '') +
    '</button>'
  );
}

function buildTrack(t) {
  const path = trackPath(t);
  const hours = hoursOf(path);
  const { min, max } = hoursRange(t);
  const g = trackGraph(t);

  const columns = g.columns
    .map((nodes, v) => {
      const cards = nodes
        .map((node) => {
          if (node.kind === 'saida') {
            return '<div class="node-outcome" data-node="@saida">' +
              '<span class="outcome-seal" aria-hidden="true">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
                '<path d="M5 22V4M5 4h11l-2 4 2 4H5"/></svg>' +
              '</span>' +
              '<span class="outcome-text">' +
                '<span class="outcome-label">' + txt('finish') + '</span>' +
                '<span class="outcome-name">' + t.outcome + '</span>' +
              '</span>' +
            '</div>';
          }
          if (node.kind === 'curso') {
            const names = (courseById(node.id)?.requires || []).filter((d) => g.nodes.some((x) => x.courses.includes(d)));
            return courseCard(node.id, String(v + 1).padStart(2, '0'), names);
          }
          // choice step: a single block, with the options as tabs
          const item = node.step;
          const sel = activeOption(t.id, node.idx);
          const tabs = item.options
            .map((o, j) =>
              '<button class="fork-tab' + (j === sel ? ' on' : '') + '" type="button" ' +
              'data-fork="' + node.idx + '" data-option="' + j + '">' + o.name +
              '<span class="fork-h">' + hoursOf(o.courses) + 'h</span></button>')
            .join('');
          const inside = item.options[sel].courses.map((id) => courseCard(id)).join('');
          return (
            '<div class="fork" data-node="' + node.id + '">' +
              '<div class="fork-top">' +
                '<span class="fork-label">' + txt('level') + ' ' + String(v + 1).padStart(2, '0') +
                  ' · ' + txt('you choose') + ' ' + item.choice + '</span>' +
                '<div class="fork-tabs" role="tablist">' + tabs + '</div>' +
              '</div>' +
              (item.note ? '<p class="fork-note">' + item.note + '</p>' : '') +
              '<div class="fork-courses">' + inside + '</div>' +
            '</div>'
          );
        })
        .join('');
      // one sub-column only; the script splits it after measuring the real height
      return '<div class="level" data-level="' + v + '"><div class="subcol">' + cards + '</div></div>';
    })
    .join('');

  const workload = min === max
    ? '<span><b>' + hours + 'h</b>' + txt('total') + '</span>'
    : '<span><b>' + hours + 'h</b>' + txt('on this path') + ' <i>(' + min + 'h ' + txt('to') + ' ' + max + 'h)</i></span>';

  const parallel = g.columns.slice(0, -1).filter((c) => c.length > 1).length;

  return (
    '<div class="track-top">' +
      '<div>' +
        '<h3>' + t.name + '</h3>' +
        '<p>' + t.goal + '</p>' +
      '</div>' +
      '<div class="track-summary">' +
        '<span><b>' + path.length + '</b>' + txt('courses') + '</span>' +
        workload +
        '<span><b>' + g.realLevels + '</b>' + txt('levels') +
          (parallel ? '<i>' + parallel + ' ' + txt('of them in free order') + '</i>' : '') +
        '</span>' +
        '<span><b>→</b>' + t.outcome + '</span>' +
      '</div>' +
    '</div>' +
    '<div class="graph-box">' +
      '<button class="graph-arrow left" type="button" data-scroll="-1" aria-label="See the previous levels">←</button>' +
      '<div class="track-graph"><svg class="graph-edges" aria-hidden="true"></svg>' +
        '<div class="graph-levels">' + columns + '</div></div>' +
      '<button class="graph-arrow right" type="button" data-scroll="1" aria-label="See the next levels">→</button>' +
    '</div>'
  );
}

/* ---------- splits each level into sub-columns ----------
   A level with many courses must not stretch below the screen. Here the real
   height of each card is measured and a sub-column is filled up to the limit
   before the next one opens, so the graph grows horizontally — which is where
   the navigation arrows are. */
function splitLevels() {
  const scroller = panelEl.querySelector('.track-graph');
  const lane = panelEl.querySelector('.graph-levels');
  if (!scroller || !lane) return;
  // back to full size before measuring: it is the available height that decides
  // the split, not whatever was left over from the previous track
  const boxG = panelEl.querySelector('.graph-box');
  if (boxG) boxG.style.flex = '1 1 auto';
  // on a narrow screen the CSS stacks everything into one column: nothing to
  // split, and whatever an earlier measurement left goes back to one sub-column
  const asList = getComputedStyle(lane).flexDirection !== 'row';
  const gap = 10;
  // subtract the lane's real padding instead of a constant: it changed along with
  // the section header, and a magic number here would silence the gain
  const cs = getComputedStyle(lane);
  const available = scroller.clientHeight -
    (parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)) - 4;
  panelEl.querySelectorAll('.level').forEach((lvl) => {
    const items = [];
    lvl.querySelectorAll(':scope > .subcol').forEach((sc) => {
      Array.from(sc.children).forEach((el) => items.push(el));
    });
    if (items.length < 2) return;

    if (asList) {
      lvl.textContent = '';
      const sc = document.createElement('div');
      sc.className = 'subcol';
      items.forEach((el) => sc.appendChild(el));
      lvl.appendChild(sc);
      return;
    }

    const cols = [[]];
    let used = 0;
    items.forEach((el) => {
      const h = el.offsetHeight;
      const current = cols[cols.length - 1];
      if (current.length && used + gap + h > available) { cols.push([]); used = 0; }
      cols[cols.length - 1].push(el);
      used += (used ? gap : 0) + h;
    });

    lvl.textContent = '';
    cols.forEach((col) => {
      const sc = document.createElement('div');
      sc.className = 'subcol';
      col.forEach((el) => sc.appendChild(el));
      lvl.appendChild(sc);
    });
  });

  /* The lane hugs the graph instead of taking up all the height left over.
     Without this the cards sat centred in a much taller lane, and the
     name+objective block had 33px of slack to the tabs above against 103px to
     the first card below. The measuring is still done at full height — that is
     what decides how many cards fit in a column. */
  if (!asList) {
    let tallest = 0;
    panelEl.querySelectorAll('.level > .subcol').forEach((sc) => {
      tallest = Math.max(tallest, sc.offsetHeight);
    });
    const full = scroller.clientHeight;
    const cx = panelEl.querySelector('.graph-box');
    if (tallest && cx) {
      const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      cx.style.flex = '0 0 ' + Math.min(full, tallest + pad) + 'px';
    }
  }
}

/* ---------- the edges ----------
   Drawn after the layout exists: each node is measured and the prerequisite's
   right edge is joined to the left edge of whoever depends on it. */
function drawEdges(t) {
  splitLevels();
  const cont = panelEl.querySelector('.track-graph');
  const svg = cont && cont.querySelector('.graph-edges');
  if (!svg) return;
  const g = trackGraph(t);
  const base = cont.getBoundingClientRect();
  const L = cont.scrollLeft, T = cont.scrollTop;
  const boxOf = (id) => {
    const el = cont.querySelector('[data-node="' + CSS.escape(id) + '"]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left - base.left + L, y: r.top - base.top + T, w: r.width, h: r.height };
  };

  svg.setAttribute('width', cont.scrollWidth);
  svg.setAttribute('height', cont.scrollHeight);
  svg.setAttribute('viewBox', '0 0 ' + cont.scrollWidth + ' ' + cont.scrollHeight);

  /* The distance a detour line keeps from the card it goes around. It was 11px
     and some of them passed within a hair; 16 gives room without stretching the
     curve into an arc. The `.subcol` opened up alongside, otherwise the corridor
     between two stacked cards would not fit the larger clearance. */
  const CLEARANCE = 16;
  // the detour lane sits just above and just below the cards, not at the
  // container's edges: short curves instead of arcs crossing the screen
  let yTop = Infinity, yBottom = -Infinity;
  g.nodes.forEach((n) => {
    const c = boxOf(n.id);
    if (!c) return;
    yTop = Math.min(yTop, c.y);
    yBottom = Math.max(yBottom, c.y + c.h);
  });
  if (!isFinite(yTop)) { yTop = 0; yBottom = cont.scrollHeight; }
  const detourUp = Math.max(6, yTop - CLEARANCE);
  const detourDown = Math.min(cont.scrollHeight - 6, yBottom + CLEARANCE);

  /* All the boxes measured at once. The detour is not decided by counting
     skipped levels — that missed the case where a level is split into
     sub-columns and the neighbouring card sits in the corridor, even with the
     edge joining adjacent levels. Now it is geometry: if there is a card between
     the two endpoints, the line goes around the outside. */
  const boxes = g.nodes.map((n) => {
    const c = boxOf(n.id);
    return c && { id: n.id, x: c.x, y: c.y, w: c.w, h: c.h };
  }).filter(Boolean);
  const inTheWay = (xa, xb, ya, yb, ignore) => boxes.filter((c) =>
    ignore.indexOf(c.id) < 0 &&
    c.x + c.w > xa && c.x < xb &&
    c.y < yb && c.y + c.h > ya);

  /* Free horizontal clearance from an x, within the vertical band the curve
     travels through. It is what limits the width of the rise: with sub-columns
     the gap beside the card falls from 48px to 14px, and a 26px rise would pass
     straight through the neighbour. */
  const clearance = (x, ya, yb, ignore, rightwards) => {
    let lim = Infinity;
    boxes.forEach((c) => {
      if (ignore.indexOf(c.id) >= 0) return;
      if (c.y >= yb || c.y + c.h <= ya) return;
      const d = rightwards ? c.x - x : x - (c.x + c.w);
      if (d >= 0) lim = Math.min(lim, d);
    });
    return lim;
  };

  const lines = [];
  g.nodes.forEach((node) => {
    const b = boxOf(node.id);
    if (!b) return;
    node.deps.forEach((d) => {
      const a = boxOf(d);
      if (!a) return;
      const x1 = a.x + a.w, y1 = a.y + a.h / 2;
      const x2 = b.x, y2 = b.y + b.h / 2;
      let dd;

      /* the simple curve has its control points at the endpoints' height, so it
         never leaves the band between y1 and y2: that rectangle is all we check */
      const ignore = [d, node.id];
      const obstacles = inTheWay(x1 + 2, x2 - 2, Math.min(y1, y2) - 4, Math.max(y1, y2) + 4, ignore);

      if (obstacles.length) {
        /* go around the outside, on the cheaper side — above the highest card in
           the way, or below the lowest. It stays a short, local arc instead of
           one crossing the whole graph. */
        const top = Math.min.apply(null, obstacles.map((c) => c.y));
        const bottom = Math.max.apply(null, obstacles.map((c) => c.y + c.h));
        const overTheTop = (y1 - top) + (y2 - top) <= (bottom - y1) + (bottom - y2);
        let yD = overTheTop ? top - CLEARANCE : bottom + CLEARANCE;
        // the local detour may bump into another card: then the free lane above
        // or below the whole graph applies, which is always clear. The side is
        // re-evaluated — the cheaper one for the short detour rarely is the same
        if (inTheWay(x1 + 2, x2 - 2, yD - 3, yD + 3, ignore).length) {
          yD = (y1 - detourUp) + (y2 - detourUp) <= (detourDown - y1) + (detourDown - y2)
            ? detourUp : detourDown;
        }
        yD = Math.max(6, Math.min(cont.scrollHeight - 6, yD));
        // each endpoint uses the clearance it actually has: the rise out of the
        // prerequisite fits the gap to its right, the one into the dependent
        // fits the gap to its left
        const width = (x, rightwards) => {
          const ya = Math.min(rightwards ? y1 : y2, yD), yb = Math.max(rightwards ? y1 : y2, yD);
          return Math.max(5, Math.min(26, clearance(x, ya, yb, ignore, rightwards) / 2));
        };
        const eS = width(x1, true), eE = width(x2, false);
        dd = 'M' + x1 + ',' + y1 +
          ' C' + (x1 + eS) + ',' + y1 + ' ' + (x1 + eS) + ',' + yD + ' ' + (x1 + eS * 2) + ',' + yD +
          ' L' + (x2 - eE * 2) + ',' + yD +
          ' C' + (x2 - eE) + ',' + yD + ' ' + (x2 - eE) + ',' + y2 + ' ' + x2 + ',' + y2;
      } else {
        const dx = Math.max(18, (x2 - x1) / 2);
        dd = 'M' + x1 + ',' + y1 + ' C' + (x1 + dx) + ',' + y1 +
          ' ' + (x2 - dx) + ',' + y2 + ' ' + x2 + ',' + y2;
      }

      lines.push(
        '<g class="edge" data-from="' + d + '" data-to="' + node.id + '">' +
          '<title>' + nodeLabel(d, g) + ' → ' + nodeLabel(node.id, g) + '</title>' +
          '<path class="hit" d="' + dd + '"/>' +
          '<path class="row" d="' + dd + '"/>' +
          '<circle class="tip" cx="' + x2 + '" cy="' + y2 + '" r="3"/>' +
        '</g>'
      );
    });
  });
  svg.innerHTML = lines.join('');
  updateGraphArrows();
}

/* a node's readable name, for the edge's tooltip */
function nodeLabel(id, g) {
  if (id === '@saida') return txt('finish');
  const c = courseById(id);
  if (c) return c.name;
  const node = g.nodes.find((n) => n.id === id);
  return node && node.step ? 'choice: ' + node.step.choice : id;
}

/* the graph scrolls by arrows, with no scrollbar on show */
function updateGraphArrows() {
  const cx = panelEl.querySelector('.graph-box');
  const scroller = cx && cx.querySelector('.track-graph');
  if (!scroller) return;
  const overflow = scroller.scrollWidth - scroller.clientWidth;
  cx.querySelector('.graph-arrow.left').disabled = !(overflow > 4 && scroller.scrollLeft > 4);
  cx.querySelector('.graph-arrow.right').disabled = !(overflow > 4 && scroller.scrollLeft < overflow - 4);
  cx.classList.toggle('no-arrows', overflow <= 4);
  scroller.classList.toggle('fade-right', overflow > 4 && scroller.scrollLeft < overflow - 4);
  scroller.classList.toggle('fade-left', overflow > 4 && scroller.scrollLeft > 4);
  // on a narrow screen the graph is a list and scrolls downwards: the fade says there is more
  const overflowY = scroller.scrollHeight - scroller.clientHeight;
  scroller.classList.toggle('fade-down', overflowY > 4 && scroller.scrollTop < overflowY - 4);
}

/* A row scrolls when the tabs do not fit: arrows at the ends and a fade showing
   which side still has track. The same function serves both families and the
   catalogue's row of filters. */
function updateRow(box) {
  const scroller = box && box.querySelector('.track-tabs, .chips');
  if (!scroller) return;
  const overflow = scroller.scrollWidth - scroller.clientWidth;
  const hasLeft = overflow > 4 && scroller.scrollLeft > 4;
  const hasRight = overflow > 4 && scroller.scrollLeft < overflow - 4;
  scroller.classList.toggle('fade-left', hasLeft);
  scroller.classList.toggle('fade-right', hasRight);
  const left = box.querySelector('.tabs-arrow.left');
  const right = box.querySelector('.tabs-arrow.right');
  if (left) left.disabled = !hasLeft;
  if (right) right.disabled = !hasRight;
  box.classList.toggle('no-arrows', overflow <= 4);
}
function updateTabs() {
  FAMILIES.forEach((f) => updateRow(familyBox(f)));
  updateRow($('.chips-box'));
}

/* scrolls one "screenful" per click, respecting the available width */
document.addEventListener('click', (e) => {
  const b = e.target.closest('.tabs-arrow[data-scroll], #chips-left, #chips-right');
  if (!b) return;
  const box = b.closest('.tabs-box, .chips-box');
  const scroller = box.querySelector('.track-tabs, .chips');
  const step = b.id === 'chips-left' || b.dataset.scroll === '-1' ? -1 : 1;
  scroller.scrollBy({ left: step * Math.max(160, scroller.clientWidth - 80), behavior: reduceMotion ? 'auto' : 'smooth' });
});
document.addEventListener('scroll', (e) => {
  const scroller = e.target;
  if (!scroller.classList || !(scroller.classList.contains('track-tabs') || scroller.classList.contains('chips'))) return;
  updateRow(scroller.closest('.tabs-box, .chips-box'));
}, true);

function openTrack(i, noAnimation) {
  currentTrack = i;
  // both rows are always on show: it is enough to mark the right tab and bring
  // it into view inside its own row
  let active = null;
  document.querySelectorAll('.track-tab').forEach((b) => {
    const isThisOne = Number(b.dataset.idx) === i;
    b.classList.toggle('on', isThisOne);
    if (isThisOne) active = b;
  });
  if (active) {
    const scroller = active.parentElement;
    const dx = active.offsetLeft - scroller.scrollLeft;
    if (dx < 0) scroller.scrollLeft = active.offsetLeft - 8;
    else if (dx + active.offsetWidth > scroller.clientWidth)
      scroller.scrollLeft = active.offsetLeft + active.offsetWidth - scroller.clientWidth + 8;
  }
  updateTabs();
  buildTrackDropdown();
  // always cancel, including in the version with no animation: a swap pending
  // from 160ms ago would overwrite the panel that has just been built
  clearTimeout(swapT);
  if (noAnimation) {
    panelEl.classList.remove('switching');
    panelEl.innerHTML = buildTrack(TRACKS[i]);
    drawEdges(TRACKS[i]);
    return;
  }
  panelEl.classList.add('switching');
  swapT = setTimeout(() => {
    panelEl.innerHTML = buildTrack(TRACKS[i]);
    panelEl.classList.remove('switching');
    drawEdges(TRACKS[i]);
  }, 160);
}
buildTabs();
openTrack(0, true);
updateTabs();
addEventListener('resize', updateTabs);
// the edges are drawn on real measurements: redo them when the layout changes
let redrawT = null;
addEventListener('resize', () => {
  clearTimeout(redrawT);
  redrawT = setTimeout(() => drawEdges(TRACKS[currentTrack]), 120);
});
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => drawEdges(TRACKS[currentTrack]));
}

/* ==========================================================
   CATALOGUE — search + filter by area
   ========================================================== */
const grid = $('#courses-grid');
const emptyEl = $('#courses-empty');
const searchEl = $('#search');
const chipsEl = $('#chips-category');
let category = 'all';

const categories = ['all', ...new Set(COURSES.map((c) => c.category))];
function buildChips() {
  chipsEl.textContent = '';
  categories.forEach((cat) => {
    const b = document.createElement('button');
    b.className = 'chip' + (cat === category ? ' on' : '');
    b.type = 'button';
    const n = cat === 'all' ? COURSES.length : COURSES.filter((c) => c.category === cat).length;
    b.innerHTML = txt(cat) + '<span class="count">(' + n + ')</span>';
    b.addEventListener('click', () => {
      category = cat;
      chipsEl.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c === b));
      buildCatalogue();
      buildFilterDropdown();
    });
    chipsEl.appendChild(b);
  });
}
buildChips();

/* The filters dropdown (mobile), for the same reason as the tracks one */
const filterDrop = $('#drop-filters');
function buildFilterDropdown() {
  const list = $('#drop-filters-list');
  list.textContent = '';
  categories.forEach((cat) => {
    const n = cat === 'all' ? COURSES.length : COURSES.filter((c) => c.category === cat).length;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'drop-op' + (cat === category ? ' on' : '');
    b.textContent = txt(cat) + ' (' + n + ')';
    b.addEventListener('click', () => {
      category = cat;
      buildChips();
      buildCatalogue();
      buildFilterDropdown();
      closeDropdowns();
    });
    list.appendChild(b);
  });
  const nCurrent = category === 'all' ? COURSES.length : COURSES.filter((c) => c.category === category).length;
  filterDrop.querySelector('.drop-current').textContent = txt(category) + ' (' + nCurrent + ')';
}
buildFilterDropdown();

/* opens/closes, and closes on a click outside — applies to both menus */
function closeDropdowns() {
  document.querySelectorAll('.drop.is-open').forEach((d) => {
    d.classList.remove('is-open');
    d.querySelector('.drop-btn').setAttribute('aria-expanded', 'false');
  });
}
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.drop-btn');
  if (!btn) { if (!e.target.closest('.drop-list')) closeDropdowns(); return; }
  const d = btn.closest('.drop');
  const opening = !d.classList.contains('is-open');
  closeDropdowns();
  d.classList.toggle('is-open', opening);
  btn.setAttribute('aria-expanded', opening ? 'true' : 'false');
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDropdowns(); });

function buildCatalogue() {
  const term = searchEl.value.trim().toLowerCase();
  const list = COURSES.filter((c) => {
    const okCat = category === 'all' || c.category === category;
    const okTerm =
      !term ||
      c.name.toLowerCase().includes(term) ||
      c.summary.toLowerCase().includes(term) ||
      c.syllabus.join(' ').toLowerCase().includes(term) ||
      (c.topics || []).join(' ').toLowerCase().includes(term);
    return okCat && okTerm;
  });

  grid.innerHTML = list
    .map((c) => {
      const nT = tracksOfCourse(c.id).length;
      return (
        '<button class="course-card" type="button" data-course="' + c.id + '">' +
          '<span class="course-top"><span class="course-cat">/' + txt(c.category) + '</span>' +
          '<span class="course-level">' + txt(c.level) + '</span></span>' +
          '<h3>' + c.name + '</h3>' +
          '<p>' + c.summary + '</p>' +
          '<span class="course-foot"><span>' + c.hours + ' ' + txt('hours') + '</span>' +
          '<span class="tracks-count">' + (nT ? txt('in') + ' ' + nT + ' ' + txt(nT > 1 ? 'tracks' : 'trilha') : txt('standalone course')) + '</span></span>' +
        '</button>'
      );
    })
    .join('');
  emptyEl.hidden = list.length > 0;
  alignSearch();
}

/* The search box takes exactly the width of one catalogue card, so that the left
   and right edges line up. This cannot be settled in CSS: the grid is
   `auto-fill` (the number of columns changes with the width) and the scrollable
   list also subtracts the scrollbar. So a real card gets measured. With no card
   on screen (a search with no results), the last good width still applies. */
function alignSearch() {
  const box = document.querySelector('.search');
  if (!box) return;
  /* on mobile the search takes the whole line and the dropdown does the
     filtering — nothing to line up, and an inline width would get in the way */
  if (matchMedia('(max-width:700px)').matches) { box.style.width = ''; return; }
  const card = grid.querySelector('.course-card');
  if (card && card.offsetWidth) box.style.width = card.offsetWidth + 'px';
}
addEventListener('resize', alignSearch);
searchEl.addEventListener('input', buildCatalogue);
buildCatalogue();

/* ==========================================================
   TESTIMONIALS
   ========================================================== */
function buildTestimonials() {
  $('#quotes').innerHTML = TESTIMONIALS.map(
    (d) =>
      '<article class="quote"><span class="quote-marks" aria-hidden="true">“</span>' +
      '<p>' + d.text + '</p>' +
      '<span class="quote-author"><b>' + d.author + '</b><span>' + d.context + '</span></span></article>'
  ).join('');
}
buildTestimonials();

/* ==========================================================
   COURSE MODAL
   ========================================================== */
const modal = $('#modal');
const modalBody = $('#modal-body');
const modalFile = $('#modal-file');

/* There are two modals — the course one and the signup one — and the scroll
   lock, the Esc key and touch chaining all need to know which one is open rather
   than assume it is the course one. `openModal()` is what they all consult. */
const MODALS = () => [modal, $('#modal-subscribe')];
const openModal = () => MODALS().find((m) => m && !m.hidden) || null;
function closeModals() {
  MODALS().forEach((m) => { if (m) m.hidden = true; });
  document.documentElement.classList.remove('modal-open');
}

/* "faz parte de 3 tracks de carreira" + "e de 2 tracks de tecnologia"

   The whole sentence is ONE translation key, with `{n}` in place of the number —
   not a prefix plus the noun plus a suffix. Assembling it from pieces works in
   Portuguese, where the qualifier comes after ("tracks de carreira"), and breaks
   in English, where it comes before ("career tracks"): out came "part of 2 tracks
   career tracks". Word order is something only the whole sentence settles. */
function trackBlock(list, family, continuation) {
  if (!list.length) return '';
  const n = list.length;
  const key = (continuation ? 'and of {n} ' : 'part of {n} ') +
    family + (n > 1 ? ' tracks' : ' track');
  return '<div class="modal-block"><h4>' + txt(key).replace('{n}', n) +
    '</h4><div class="modal-tracks">' +
    list.map((t) => '<button type="button" data-track="' + t.id + '">' + t.name + ' →</button>').join('') +
    '</div></div>';
}

/* ---------- the course's introduction video ----------
   A facade, not an iframe: it shows the thumbnail and a button, and only swaps in
   the YouTube player when somebody clicks. That way the modal opens light, and
   whoever does not watch receives no YouTube cookie at all. With no `video` on
   the course, the frame stays reserved — publishing the video later does not
   rearrange the screen. */
function videoBlock(c) {
  if (!c.video) {
    return '<div class="modal-video is-empty" aria-hidden="true">' +
      '<span class="video-play"></span><span class="video-notice">' + txt('video coming soon') + '</span></div>';
  }
  return '<button type="button" class="modal-video" data-video="' + c.video + '" ' +
    'aria-label="' + txt('watch the course introduction') + '">' +
    '<img src="https://i.ytimg.com/vi/' + c.video + '/hqdefault.jpg" alt="" loading="lazy" />' +
    '<span class="video-play"></span></button>';
}

function openCourse(id) {
  const c = courseById(id);
  if (!c) return;
  const tracks = tracksOfCourse(id);
  const career = tracks.filter((t) => familyOf(t) === 'career');
  const technology = tracks.filter((t) => familyOf(t) === 'technology');
  modalFile.textContent = id + '.curso';
  /* Two columns wherever they fit (see style.css): on the left what convinces —
     what the course is, who speaks about it and the button; on the right what
     details it — syllabus, topics, prerequisites and tracks. In a single column,
     the HTML order is already the right reading order. */
  modalBody.innerHTML =
    '<div class="modal-col modal-col-intro">' +
    '<h3 id="modal-title">' + c.name + '</h3>' +
    '<div class="modal-meta">' +
      '<span>' + txt('area') + ': <b>' + txt(c.category) + '</b></span>' +
      '<span>' + txt('level') + ': <b>' + txt(c.level) + '</b></span>' +
      '<span>' + txt('workload') + ': <b>' + c.hours + ' ' + txt('hours') + '</b></span>' +
    '</div>' +
    videoBlock(c) +
    '<p>' + c.summary + '</p>' +
    '<div class="modal-actions"><button type="button" class="btn btn-primary" data-enrol="' + c.id + '">' +
      txt('Start now →') + '</button></div>' +
    '</div>' +
    '<div class="modal-col modal-col-detail">' +
    '<div class="modal-block"><h4>' + txt('what you learn') + '</h4><ul>' +
      c.syllabus.map((e) => '<li>' + e + '</li>').join('') +
    '</ul></div>' +
    // the full technical list — collapsed, for whoever wants to check it topic by topic
    (c.topics && c.topics.length
      ? '<details class="modal-topics"><summary>' + txt('detailed contents') +
        '<span class="count">' + c.topics.length + ' ' + txt('topics') + '</span></summary><ul>' +
        c.topics.map((t) => '<li>' + t + '</li>').join('') +
        '</ul></details>'
      : '') +
    '<div class="modal-block"><h4>' + txt('prerequisites') + '</h4>' +
      ((c.requires || []).length
        ? '<div class="modal-tracks pre-req">' +
          c.requires.map((d) => {
            const p = courseById(d);
            return p ? '<button type="button" data-course="' + p.id + '">← ' + p.name + '</button>' : '';
          }).join('') + '</div>'
        : '') +
      (c.prerequisites ? '<p class="dim">' + c.prerequisites + '</p>' : '') +
    '</div>' +
    (unlockedBy(c.id).length
      ? '<div class="modal-block"><h4>' + txt('opens the way to') + '</h4><div class="modal-tracks">' +
        unlockedBy(c.id).map((p) => '<button type="button" data-course="' + p.id + '">' + p.name + ' →</button>').join('') +
        '</div></div>'
      : '') +
    // the two families appear separately: "in 5 tracks" does not say the same
    // thing if 3 are careers and 2 are technologies
    trackBlock(career, 'career', false) +
    trackBlock(technology, 'technology', career.length > 0) +
    '</div>';
  modalBody.scrollTop = 0;
  modal.hidden = false;
  /* locks the page underneath: the class cuts the overflow of the document and
     of the current screen, and the wheel and touch handlers stop pushing the
     background. They are the two halves of the same problem — the class handles
     the scrollbar and the inertia, the handlers handle the chaining. */
  document.documentElement.classList.add('modal-open');
  fitTopics();
  $('#modal-close').focus();
}

/* ---------- the topic list takes the height that is left ----------
   In two columns the modal body does not scroll: the list is what scrolls. But
   its ceiling cannot be fixed — 48 topics with a 420px ceiling still made the
   column overflow, and the modal went back to scrolling, taking the video and
   the button out of view. Here we measure how much the column overflows and take
   that much off the list, which is the only block that can shrink without losing
   information (it scrolls). A 140px floor: below that the list stops being
   legible and it is better to let the column scroll.

   Why in JS and not in CSS: Chrome's `<details>` wraps the content in a slot, so
   the `ul` does not become a flex item and `flex:1 1 auto` on it is ignored by
   the layout. */
function fitTopics() {
  const det = modalBody.querySelector('.modal-topics');
  const list = det && det.querySelector('ul');
  if (!list) return;
  list.style.maxHeight = '';
  if (!det.open || !matchMedia('(min-width:1024px)').matches) return;
  const col = det.closest('.modal-col-detail');
  if (!col) return;
  const overflow = col.scrollHeight - col.clientHeight;
  if (overflow > 0) list.style.maxHeight = Math.max(140, list.clientHeight - overflow) + 'px';
}
addEventListener('resize', fitTopics);
modalBody.addEventListener('toggle', (e) => {
  if (e.target.classList.contains('modal-topics')) fitTopics();
}, true);

function closeModal() { closeModals(); }

/* FAQ: one question open at a time. `toggle` does not bubble, so the listener
   goes on the capture phase — and there is only one, on the container, instead
   of one per <details>: that way it covers questions added later. */
const faqEl = $('#faq .faq');
if (faqEl) {
  faqEl.addEventListener('toggle', (e) => {
    const target = e.target;
    if (target.tagName !== 'DETAILS' || !target.open) return;
    faqEl.querySelectorAll('details[open]').forEach((d) => { if (d !== target) d.open = false; });
  }, true);
}

// open from the cards and from the track nodes
document.addEventListener('click', (e) => {
  /* Graph arrows: move forwards/backwards one screenful of levels. The selector
     needs the class — the tab rows' arrows also use `data-scroll`, and with a
     loose selector a click on them scrolled the tabs (handler above) and the
     graph along with them. */
  const scroll = e.target.closest('.graph-arrow[data-scroll]');
  if (scroll) {
    const scroller = panelEl.querySelector('.track-graph');
    if (scroller) scroller.scrollBy({ left: Number(scroll.dataset.scroll) * Math.max(240, scroller.clientWidth - 120), behavior: reduceMotion ? 'auto' : 'smooth' });
    return;
  }

  // a step with a fork: swaps the path without moving from the spot
  const fork = e.target.closest('[data-fork]');
  if (fork) {
    const t = TRACKS[currentTrack];
    choices[t.id + ':' + fork.dataset.fork] = Number(fork.dataset.option);
    const scroller = panelEl.querySelector('.track-graph');
    const x = scroller ? scroller.scrollLeft : 0;
    const y = scroller ? scroller.scrollTop : 0;
    panelEl.innerHTML = buildTrack(t);
    const fresh = panelEl.querySelector('.track-graph');
    if (fresh) { fresh.scrollLeft = x; fresh.scrollTop = y; }
    drawEdges(t);
    return;
  }

  // the modal's button: a course is no longer a unit of purchase, so it does not
  // pick a plan — it travels as the origin of the request
  const enrolBtn = e.target.closest('[data-enrol]');
  if (enrolBtn) { openSignup('', enrolBtn.dataset.enrol); return; }

  // the three plan cards' buttons: they carry the chosen plan into the select
  const planBtn = e.target.closest('.plan-btn');
  if (planBtn) {
    e.preventDefault();
    openSignup(planBtn.closest('.plan').querySelector('.plan-name').textContent.trim());
    return;
  }

  // the video thumbnail: now it does load the player, already playing
  const thumb = e.target.closest('[data-video]');
  if (thumb) {
    const frame = document.createElement('div');
    frame.className = 'modal-video playing';
    frame.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + thumb.dataset.video +
      '?autoplay=1&rel=0" title="' + txt('course introduction') + '" allowfullscreen ' +
      'allow="accelerometer; autoplay; encrypted-media; picture-in-picture"></iframe>';
    thumb.replaceWith(frame);
    return;
  }

  const target = e.target.closest('[data-course]');
  if (target) { openCourse(target.dataset.course); return; }

  // inside the modal: jump to the track mentioned
  const trackBtn = e.target.closest('[data-track]');
  if (trackBtn) {
    const i = TRACKS.findIndex((t) => t.id === trackBtn.dataset.track);
    if (i > -1) {
      closeModal();
      openTrack(i, true);
      goTo(screens.findIndex((t) => t.id === 'tracks'));
    }
    return;
  }

  if (e.target.closest('[data-close]')) closeModal();
});

$('#modal-close').addEventListener('click', closeModals);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModals(); });
$('#subscribe-close').addEventListener('click', closeModals);
$('#modal-subscribe').addEventListener('click', (e) => {
  if (e.target === $('#modal-subscribe')) closeModals();
});
$('#cta-subscribe').addEventListener('click', () => openSignup());


/* ==========================================================
   ENROLMENT
   Paste your form's POST URL into ENROL_URL (Formspree,
   Web3Forms, Brevo...). Empty = demonstration mode.
   ========================================================== */
const ENROL_URL = '';

/* The select lists the plans, and the list comes from the plan screen's own
   cards — not from a parallel array here. So changing the cards in `index.html`
   (adding a fourth plan, renaming one, removing one) adjusts the form by itself,
   and there is no chance of the two disagreeing. Since it runs after
   `applyTexts()`, the names already come in the current language. */
const planSelect = $('#m-plan');
const plansOnScreen = () =>
  [...document.querySelectorAll('#plans .plan-name')].map((h) => h.textContent.trim());

function buildPlanSelect() {
  const before = planSelect.value;
  planSelect.innerHTML =
    '<option value="">' + txt('not sure yet — I would like guidance') + '</option>' +
    plansOnScreen().map((n) => '<option value="' + n + '">' + n + '</option>').join('');
  planSelect.value = before;
}
buildPlanSelect();

/* Where the person came from, when they came from a course. The course is no
   longer a unit of purchase, so it does not become an option in the select — but
   knowing the request was born looking at "Kubernetes" is worth something to
   whoever handles it. */
let sourceCourse = '';

/* Opens the signup modal. It comes from three places, and what changes between
   them is only how much the form still has to ask:

   - a plan's button   → the plan is the heading and the selector disappears.
                         Two fields are left, which is the shortest possible form.
   - "Comece agora"    → nobody has chosen a plan yet, so the selector appears,
                         starting at "ainda não sei".
   - a course modal's  → like the one above, but it keeps the course the person
     button              was looking at so it travels along with the submission.

   Focus goes to the × and not to the name field: on mobile, focusing an input on
   open throws the virtual keyboard over the modal before the person has read
   what it says. */
const signupModal = $('#modal-subscribe');
const signupPlan = $('#subscribe-plan');
const planField = $('#field-plan');

function openSignup(plan, origin) {
  closeModals();
  sourceCourse = origin || '';
  enrolStatus.textContent = '';
  const known = plan && plansOnScreen().includes(plan);
  if (known) {
    $('#subscribe-plan-name').textContent = plan;
    planSelect.value = plan;
  } else {
    planSelect.value = '';
  }
  signupPlan.hidden = !known;
  planField.hidden = !!known;
  signupModal.hidden = false;
  document.documentElement.classList.add('modal-open');
  $('#subscribe-close').focus();
}

const enrolForm = $('#form-enrol');
const enrolStatus = $('#form-status');

/* ---------- the field accepts a whatsapp number OR an e-mail ----------
   As long as what has been typed could be a phone number, the mask applies by
   itself: (45) 90000-0000 for a nine-digit mobile, (45) 0000-0000 for a
   landline. The moment a letter or an @ shows up, the mask comes undone and the
   field goes back to being free text — otherwise "123abc@..." would turn into
   "(12) 3abc@...". An international number (starting with +) also stays intact. */
const contactEl = $('#m-contact');
const digitsOnly = (s) => s.replace(/\D/g, '');
const MASK_CHARS = /[()\s-]/g;

function withPhoneMask(d) {
  d = d.slice(0, 11);
  if (d.length <= 2) return d ? '(' + d : '';
  const rest = d.slice(2);
  if (!rest.length) return '(' + d.slice(0, 2) + ') ';
  if (rest.length <= 4) return '(' + d.slice(0, 2) + ') ' + rest;
  const cut = rest.length > 8 ? 5 : 4;   // a mobile has nine digits, a landline eight
  return '(' + d.slice(0, 2) + ') ' + rest.slice(0, cut) + '-' + rest.slice(cut);
}

contactEl.addEventListener('input', () => {
  const v = contactEl.value;
  const looksLikePhone = !/[^\d()\s-]/.test(v);
  if (!looksLikePhone) {
    // an e-mail (or an international number): strip whatever mask has crept in
    const stripped = v.replace(MASK_CHARS, '');
    if (stripped !== v && !/\s/.test(stripped)) contactEl.value = stripped;
    return;
  }
  const pos = contactEl.selectionStart;
  const digitsBefore = digitsOnly(v.slice(0, pos)).length;
  const next = withPhoneMask(digitsOnly(v));
  if (next === v) return;
  contactEl.value = next;
  // put the caret back after the same digit it was on
  let i = 0;
  for (let seen = 0; i < next.length && seen < digitsBefore; i += 1) {
    if (/\d/.test(next[i])) seen += 1;
  }
  contactEl.setSelectionRange(i, i);
});

enrolForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('#m-name').value.trim();
  const contact = $('#m-contact').value.trim();
  if (!name || !contact) {
    enrolStatus.textContent = txt('✗ fill in your name and contact');
    return;
  }
  const data = {
    name: name,
    contact: contact,
    plan: planSelect.value || 'no preference',
  };
  if (sourceCourse) data.origin = 'course:' + sourceCourse;
  if (!ENROL_URL) {
    enrolStatus.textContent = txt('✓ request recorded') + ' — ' + name + ' ' + txt('(demonstration mode: set ENROL_URL)');
    enrolForm.reset();
    return;
  }
  enrolStatus.textContent = txt('… sending');
  fetch(ENROL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
    .then(() => {
      enrolStatus.textContent = txt('✓ we have your details — we will be in touch soon!');
      enrolForm.reset();
    })
    .catch(() => {
      enrolStatus.textContent = txt('✗ could not send — write to contact@codeschool.ing');
    });
});

/* ==========================================================
   NEWSLETTER
   Paste the provider's POST URL into NEWSLETTER_URL (Brevo,
   Mailchimp, MailerLite...). Empty = demonstration mode.
   ========================================================== */
const NEWSLETTER_URL = '';

const newsForm = $('#news-form');
const newsEmail = $('#news-email');
const newsStatus = $('#news-status');

newsForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = newsEmail.value.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    newsStatus.textContent = txt('✗ enter a valid e-mail');
    return;
  }
  if (!NEWSLETTER_URL) {
    newsStatus.textContent = txt('✓ subscription recorded') + ' — ' + email + ' ' + txt('(demonstration mode)');
    newsForm.reset();
    return;
  }
  newsStatus.textContent = txt('… sending');
  const data = new FormData();
  data.append('EMAIL', email);
  fetch(NEWSLETTER_URL, { method: 'POST', mode: 'no-cors', body: data })
    .then(() => {
      newsStatus.textContent = txt('✓ subscription confirmed — welcome aboard!');
      newsForm.reset();
    })
    .catch(() => {
      newsStatus.textContent = txt('✗ could not send — try again in a moment');
    });
});

/* ==========================================================
   FULLPAGE — each section fills the screen; scrolling jumps between them
   ========================================================== */
const screens = Array.from(document.querySelectorAll('.screen'));
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let current = 0;
let locked = false;
let lockT = null;

/* the side indicators */
const dots = document.createElement('div');
dots.className = 'dots';
screens.forEach((screen, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.setAttribute('aria-label', txt('Go to section') + ' ' + (i + 1));
  b.addEventListener('click', () => goTo(i));
  dots.appendChild(b);
});
document.body.appendChild(dots);

const menuLinks = Array.from(document.querySelectorAll('.navlinks a[href^="#"]'));

function markActive() {
  dots.querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', i === current));
  const id = '#' + screens[current].id;
  menuLinks.forEach((a) => a.classList.toggle('on', a.getAttribute('href') === id));
}

function goTo(i) {
  i = Math.max(0, Math.min(screens.length - 1, i));
  const destination = screens[i].offsetTop;
  if (i === current && Math.abs(window.scrollY - destination) < 4) return;
  locked = true;
  current = i;
  window.scrollTo({ top: destination, behavior: reduceMotion ? 'auto' : 'smooth' });
  markActive();
  clearTimeout(lockT);
  lockT = setTimeout(() => { locked = false; }, 950);
}

/* can the current screen still scroll internally in that direction? */
function atEdge(screen, right) {
  if (screen.scrollHeight <= screen.clientHeight + 4) return true;
  return right > 0
    ? screen.scrollTop + screen.clientHeight >= screen.scrollHeight - 4
    : screen.scrollTop <= 4;
}

/* hovering a course lights up the edges arriving at it and leaving it */
panelEl.addEventListener('mouseover', (e) => {
  const node = e.target.closest('[data-node]');
  if (!node) return;
  const id = node.dataset.node;
  panelEl.querySelectorAll('.edge').forEach((a) => {
    a.classList.toggle('on', a.dataset.from === id || a.dataset.to === id);
  });
});
panelEl.addEventListener('mouseout', (e) => {
  if (e.target.closest('[data-node]')) panelEl.querySelectorAll('.edge.on').forEach((a) => a.classList.remove('on'));
});

/* the graph tells the arrows when it is dragged directly */
panelEl.addEventListener('scroll', (e) => {
  if (e.target.classList && e.target.classList.contains('track-graph')) updateGraphArrows();
}, true);

/* panels with their own scrolling (catalogue, track on mobile, testimonials) */
function innerScrollable(target, right, screen) {
  let el = target instanceof Element ? target : null;
  while (el && el !== screen && el !== document.body) {
    if (el.scrollHeight > el.clientHeight + 4) {
      const can = right > 0
        ? el.scrollTop + el.clientHeight < el.scrollHeight - 4
        : el.scrollTop > 4;
      if (can) return el;
    }
    el = el.parentElement;
  }
  return null;
}

/* mouse wheel / trackpad */
window.addEventListener('wheel', (e) => {
  const open = openModal();
  if (open) {
    // inside the modal, whatever has its own scrolling keeps scrolling; the rest
    // does not push the page underneath (a bare `return` let it through)
    const d = e.deltaY > 0 ? 1 : -1;
    if (!innerScrollable(e.target, d, open)) e.preventDefault();
    return;
  }
  e.preventDefault();
  if (locked) return;
  const right = e.deltaY > 0 ? 1 : -1;
  const screen = screens[current];
  const inner = innerScrollable(e.target, right, screen);
  if (inner) { inner.scrollTop += e.deltaY; return; }
  if (!atEdge(screen, right)) { screen.scrollTop += e.deltaY; return; }
  if (Math.abs(e.deltaY) < 8) return;
  goTo(current + right);
}, { passive: false });

/* keyboard */
window.addEventListener('keydown', (e) => {
  if (openModal()) {
    if (e.key === 'Escape') closeModals();
    return;
  }
  if (/^(INPUT|TEXTAREA|SELECT|BUTTON|SUMMARY)$/.test(e.target.tagName)) return;
  const down = ['ArrowDown', 'PageDown', ' '].includes(e.key);
  const up = ['ArrowUp', 'PageUp'].includes(e.key);
  if (down || up) {
    e.preventDefault();
    if (!locked) goTo(current + (down ? 1 : -1));
  } else if (e.key === 'Home') {
    e.preventDefault(); goTo(0);
  } else if (e.key === 'End') {
    e.preventDefault(); goTo(screens.length - 1);
  } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && screens[current].id === 'tracks') {
    e.preventDefault();
    // the arrows move within the open track's family, not through the whole list
    const ofFamily = indicesOfFamily(familyOf(TRACKS[currentTrack]));
    const pos = ofFamily.indexOf(currentTrack) + (e.key === 'ArrowRight' ? 1 : -1);
    openTrack(ofFamily[Math.max(0, Math.min(ofFamily.length - 1, pos))]);
  }
});

/* touch (mobile and tablet) */
let touchY = null;
let touchTarget = null;
window.addEventListener('touchstart', (e) => {
  touchY = e.touches[0].clientY;
  touchTarget = e.target;
}, { passive: true });
window.addEventListener('touchmove', (e) => {
  if (touchY === null) return;
  const openT = openModal();
  if (openT) {
    const d = touchY - e.touches[0].clientY > 0 ? 1 : -1;
    if (!innerScrollable(touchTarget, d, openT)) e.preventDefault();
    return;
  }
  const right = touchY - e.touches[0].clientY > 0 ? 1 : -1;
  if (innerScrollable(touchTarget, right, screens[current])) return;
  if (touchTarget instanceof Element && touchTarget.closest('.track-flow')) return;
  if (atEdge(screens[current], right)) e.preventDefault();
}, { passive: false });
window.addEventListener('touchend', (e) => {
  if (touchY === null || openModal()) return;
  const delta = touchY - e.changedTouches[0].clientY;
  const target = touchTarget;
  touchY = null;
  touchTarget = null;
  if (locked || Math.abs(delta) < 50) return;
  const right = delta > 0 ? 1 : -1;
  if (innerScrollable(target, right, screens[current])) return;
  if (atEdge(screens[current], right)) goTo(current + right);
});

/* internal anchors (menu, hero buttons, modal) */
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    const i = screens.indexOf(target.closest('.screen') || target);
    if (i > -1) {
      e.preventDefault();
      menu.classList.remove('open');
      goTo(i);
    }
  });
});

/* resyncs if the scrollbar is dragged */
let syncT = null;
window.addEventListener('scroll', () => {
  if (locked) return;
  clearTimeout(syncT);
  syncT = setTimeout(() => {
    let best = 0, shortest = Infinity;
    screens.forEach((screen, i) => {
      const d = Math.abs(screen.offsetTop - window.scrollY);
      if (d < shortest) { shortest = d; best = i; }
    });
    if (best !== current) { current = best; markActive(); }
  }, 120);
});

window.addEventListener('resize', () => window.scrollTo({ top: screens[current].offsetTop }));

/* an anchor in the URL on load (e.g. /#courses) */
if (location.hash) {
  const target = document.querySelector(location.hash);
  const i = screens.indexOf(target ? target.closest('.screen') || target : null);
  if (i > -1) { current = i; window.scrollTo({ top: screens[i].offsetTop }); }
}

/* footer: the track links open the tracks screen already on the chosen one */
markActive();

/* ==========================================================
   LANGUAGE — see assets/i18n-runtime.js
   Switching redoes everything born of text: the static nodes, the translated
   data and the three screens built from them.
   ========================================================== */
function redrawAll() {
  buildTabs();
  buildChips();
  buildFilterDropdown();
  buildCatalogue();
  buildTestimonials();
  buildPlanSelect();
  openTrack(currentTrack, true);
  updateTabs();
  showHours();
  buildTerminal();
}

const langBox = $('#lang');
langBox.querySelector('.lang-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  const open = langBox.classList.toggle('is-open');
  e.currentTarget.setAttribute('aria-expanded', open ? 'true' : 'false');
});
document.addEventListener('click', (e) => { if (!e.target.closest('#lang')) closeLanguageMenu(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLanguageMenu(); });

saveBase();
mapTexts();
applyLanguage();
