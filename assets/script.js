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

/* ---------- the certificate sets ----------
   Every complete way through a track: the fixed steps plus one branch of each
   choice. It is what "all the courses of the track" has to mean once a track
   forks — Back-end lists 21 courses and nobody takes 21. */
function certificateSets(t) {
  let sets = [[]];
  t.courses.forEach((i) => {
    sets = isChoice(i)
      ? sets.flatMap((s) => i.options.map((o) => s.concat(o.courses)))
      : sets.map((s) => s.concat(i));
  });
  return sets.map((s) => Array.from(new Set(s)));
}

/* ---------- the tracks finished on the way ----------

   NOTHING DECLARES THIS, and nothing should: a track whose every course
   already sits on this one's path is completed by whoever finishes this one,
   and that is a fact about the catalogue, not an editorial decision. Prompt
   Engineering sits whole inside AI Engineering, and SQL and Databases inside
   Business Intelligence — both were built that way and neither said so.

   It is the intermediate milestone these tracks were missing. A career track
   runs from 590h to 1,040h with the certificate at the very end; this hands
   the student a second one with a name of its own, part of the way in.

   A forked track counts as earned as soon as ONE of its branches fits. */
function tracksOnTheWay(t, path, g) {
  const has = new Set(path);
  const levelOf = (c) => g.level[(g.nodes.find((n) => n.courses.includes(c)) || {}).id];
  return TRACKS
    .filter((m) => m.id !== t.id)
    .map((m) => {
      const fits = certificateSets(m).find((s) => s.every((c) => has.has(c)));
      if (!fits) return null;
      const levels = fits.map(levelOf).filter((v) => v !== undefined);
      return levels.length ? { track: m, level: Math.max(...levels) + 1 } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.level - b.level);
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

  const list = TRACKS.slice(0, 3).map((t) => {
    const f = hoursRange(t);
    return arrow('→', 'pr', t.name + ' · ' + (f.min === f.max ? f.min : f.min + '–' + f.max) + 'h');
  }).join('');
  const rest = TRACKS.length - 3;
  const moreTracks = rest > 0
    ? '<div class="term-line"><span class="cm">  ' +
      txt('… and {n} more tracks').replace('{n}', rest) + '</span></div>'
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
    cmd('codeschool tracks') + list + moreTracks + blank +
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

/* One row of tracks, because every track is a career. There were two families
   and two rows — the other one asked which technology you wanted to master —
   and dropping it gave the remaining row the 104px the label was taking.

/* The tracks dropdown (mobile): the scrollable row becomes a list. Same data
   source, same opening function. */
const trackDrop = $('#drop-tracks');
function buildTrackDropdown() {
  const list = $('#drop-tracks-list');
  list.textContent = '';
  TRACKS.forEach((t, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'drop-op' + (i === currentTrack ? ' on' : '');
    b.textContent = t.name;
    b.addEventListener('click', () => { openTrack(i); closeDropdowns(); });
    list.appendChild(b);
  });
  trackDrop.querySelector('.drop-current').textContent = TRACKS[currentTrack].name;
}

function buildTabs() {
  const el = $('#tabs');
  el.textContent = '';
  TRACKS.forEach((t, i) => {
    const b = document.createElement('button');
    b.className = 'track-tab' + (i === currentTrack ? ' on' : '');
    b.type = 'button';
    b.dataset.idx = i;
    b.setAttribute('role', 'tab');
    b.textContent = t.name;
    b.addEventListener('click', () => openTrack(i));
    el.appendChild(b);
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

  const onTheWay = tracksOnTheWay(t, path, g);
  const milestones = onTheWay.length
    ? '<p class="track-milestones">' +
        '<span class="milestone-seal" aria-hidden="true">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
          'stroke-linecap="round" stroke-linejoin="round">' +
          '<circle cx="12" cy="9" r="5"/><path d="M8.5 13.5 7 22l5-2.5L17 22l-1.5-8.5"/></svg>' +
        '</span>' +
        '<span>' + txt('finished on the way') + ' ' +
          onTheWay
            .map((m) => '<button type="button" class="milestone-go" data-goto-track="' +
              TRACKS.indexOf(m.track) + '">' + m.track.name + '</button> <i>' +
              txt('at level') + ' ' + String(m.level).padStart(2, '0') + '</i>')
            .join(' · ') +
        '</span>' +
      '</p>'
    : '';

  return (
    '<div class="track-top">' +
      '<div>' +
        '<h3>' + t.name + '</h3>' +
        '<p class="goal">' + t.goal + '</p>' +
        '<button class="goal-more" type="button" data-goal-more hidden>' +
          txt('read the whole objective') + '</button>' +
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
    milestones +
    '<div class="graph-box">' +
      '<button class="graph-full-toggle" type="button" data-graph-full ' +
        'aria-label="' + txt('see the graph on the whole screen') + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ' +
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path class="i-open" d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>' +
        '<path class="i-close" d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>' +
      '</button>' +
      '<button class="graph-arrow left" type="button" data-scroll="-1" aria-label="See the previous levels">←</button>' +
      '<div class="track-graph"><svg class="graph-edges" aria-hidden="true"></svg>' +
        '<div class="graph-levels">' + columns + '</div></div>' +
      '<button class="graph-arrow right" type="button" data-scroll="1" aria-label="See the next levels">→</button>' +
    '</div>'
  );
}

/* ---------- which way the graph flows ----------
   Three layouts, and the CSS decides which one is in force — the JS only reads
   it back, so there is one breakpoint to change and not two:

     right — levels side by side, cards stacked inside each level. The desktop
             landscape layout, and what the whole router was written for.
     down  — levels stacked, cards side by side inside each level. A portrait
             monitor: 1080 wide and 1920 tall, where marching to the right hides
             two thirds of the track behind a scrollbar and leaves the height
             empty. It is the same graph transposed, edges included.
     list  — one column, no edges, `requires` shown as text. The phone.

   The flags are the flex directions themselves: the lane says whether the
   levels stack, and a sub-column says whether the cards inside one do. */
function graphFlow() {
  const lane = panelEl.querySelector('.graph-levels');
  if (!lane) return 'right';
  if (getComputedStyle(lane).flexDirection === 'row') return 'right';
  const sub = lane.querySelector('.subcol');
  return sub && getComputedStyle(sub).flexDirection === 'row' ? 'down' : 'list';
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
  const flow = graphFlow();
  const asList = flow === 'list';
  // flowing down, a level breaks when the cards run out of WIDTH, and what it
  // breaks into is another row. Same algorithm, other axis.
  const across = flow === 'down';
  const gap = 10;
  // subtract the lane's real padding instead of a constant: it changed along with
  // the section header, and a magic number here would silence the gain.
  // The scroller's own padding counts too. clientHeight includes it and the
  // cards never get it, so a column packed by this number is that much taller
  // than the box that holds it. It is 4px on the track screen and 38px on the
  // whole screen, and there it pushed the last card out of the bottom of the
  // graph — where the lane an edge detours through was clamped back inside the
  // container and drew the edge straight through that card.
  const cs = getComputedStyle(lane);
  const sp = getComputedStyle(scroller);
  const pad = (s) => across
    ? parseFloat(s.paddingLeft) + parseFloat(s.paddingRight)
    : parseFloat(s.paddingTop) + parseFloat(s.paddingBottom);
  // measured again on every pass, because packing changes the box: a column
  // that fitted at the height the graph had before the split can stop fitting
  // at the height it has after it
  const measure = () => (across ? scroller.clientWidth : scroller.clientHeight) -
    pad(cs) - pad(sp) - 2;
  let available = measure();
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

    /* Packed against the sizes the cards have RIGHT NOW — and re-packed if the
       result does not fit, because a card can change size by being moved. A fork
       block re-wraps when its column changes width and comes out taller than it
       measured; the column then overflowed the lane, `align-items:center`
       centred the overflow, and a block ended up at y = -1. Above it there was
       no room left for the lane an edge detours through, and the edge was drawn
       through the block. Two passes settle every case in the catalogue; the
       third is there so a future one cannot loop. */
    for (let pass = 0; pass < 3; pass++) {
      available = measure();
      const cols = [[]];
      let used = 0;
      items.forEach((el) => {
        const h = across ? el.offsetWidth : el.offsetHeight;
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

      let over = 0;
      lvl.querySelectorAll(':scope > .subcol').forEach((sc) => {
        over = Math.max(over, (across ? sc.offsetWidth : sc.offsetHeight) - available);
      });
      if (over <= 0) break;
    }
  });

  /* The lane hugs the graph instead of taking up all the height left over.
     Without this the cards sat centred in a much taller lane, and the
     name+objective block had 33px of slack to the tabs above against 103px to
     the first card below. The measuring is still done at full height — that is
     what decides how many cards fit in a column.

     Not on the whole screen: there the space below the graph belongs to nothing
     else, and hugging left 350px of empty window under a graph that had just
     been asked to take it. */
  // and only where the graph is as tall as it needs to be: flowing down it is
  // taller than the box on purpose, and hugging would cut it off
  if (flow === 'right' && !document.body.classList.contains('graph-full')) {
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
  /* Before anything is measured. "Read the whole objective" only appears where
     there is something left to read — today that is all eighteen tracks, since
     the shortest objective still runs past three lines, but a shorter one would
     get a link that opens nothing. It goes first because showing or hiding it
     changes the height of the block above the graph, and the split downstream
     is decided by the height the graph is left with. */
  const goal = panelEl.querySelector('.track-top p.goal');
  const more = panelEl.querySelector('.goal-more');
  if (goal && more && !goal.classList.contains('open')) {
    more.hidden = goal.scrollHeight <= goal.clientHeight + 2;
  }
  splitLevels();
  const cont = panelEl.querySelector('.track-graph');
  const svg = cont && cont.querySelector('.graph-edges');
  if (!svg) return;
  const g = trackGraph(t);
  const base = cont.getBoundingClientRect();
  const L = cont.scrollLeft, T = cont.scrollTop;
  /* THE ROUTER RUNS IN ONE AXIS AND SERVES BOTH. Everything below this line
     thinks the graph goes left to right: an edge leaves a card's right side,
     crosses a corridor and comes in on the next card's left. Flowing down, the
     boxes go in with x and y swapped and every point comes out swapped back —
     so "the lane above the cards" is the margin to their left, and not one line
     of the routing had to be written twice. */
  const down = graphFlow() === 'down';
  const boxOf = (id) => {
    const el = cont.querySelector('[data-node="' + CSS.escape(id) + '"]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const b = { x: r.left - base.left + L, y: r.top - base.top + T, w: r.width, h: r.height };
    return down ? { x: b.y, y: b.x, w: b.h, h: b.w } : b;
  };
  // the far edge of the drawing, in the same swapped coordinates
  const far = down ? cont.scrollWidth : cont.scrollHeight;
  // a point, written the way the SVG has to read it
  const P = (x, y) => (down ? y + ',' + x : x + ',' + y);

  svg.setAttribute('width', cont.scrollWidth);
  svg.setAttribute('height', cont.scrollHeight);
  svg.setAttribute('viewBox', '0 0 ' + cont.scrollWidth + ' ' + cont.scrollHeight);

  /* The distance a detour line keeps from the card it goes around. It was 11px
     and some of them passed within a hair; 16 gives room without stretching the
     curve into an arc. The `.subcol` opened up alongside, otherwise the corridor
     between two stacked cards would not fit the larger clearance. */
  const CLEARANCE = 16;
  /* The narrowest gap between two cards a line may thread. It is not CLEARANCE:
     that is how far a detour stays from a card it goes AROUND, with open space
     on the other side. Threading needs only enough room to read as a corridor —
     half of this on each side of a 1.5px line — and the gap the layout actually
     leaves between a fork block and the card under it is around 17px. Demanding
     32 there rejected every real corridor and sent the edge over the top. */
  const CORRIDOR = 14;
  // the detour lane sits just above and just below the cards, not at the
  // container's edges: short curves instead of arcs crossing the screen
  let yTop = Infinity, yBottom = -Infinity;
  g.nodes.forEach((n) => {
    const c = boxOf(n.id);
    if (!c) return;
    yTop = Math.min(yTop, c.y);
    yBottom = Math.max(yBottom, c.y + c.h);
  });
  if (!isFinite(yTop)) { yTop = 0; yBottom = far; }
  const detourUp = Math.max(6, yTop - CLEARANCE);
  const detourDown = Math.min(far - 6, yBottom + CLEARANCE);

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
  /* The horizontal corridors that cross a span with nothing in them: above the
     cards in the way, below them, and every gap between them wide enough to
     take the line plus its clearance on both sides. Overlapping cards are
     merged first, or the gap between two cards in the same column would be
     offered as a corridor when a third card spans across it. */
  const freeLanes = (xa, xb, ignore) => {
    const spans = boxes
      .filter((c) => ignore.indexOf(c.id) < 0 && c.x + c.w > xa && c.x < xb)
      .map((c) => [c.y, c.y + c.h])
      .sort((a, b) => a[0] - b[0]);
    if (!spans.length) return [];
    const merged = [spans[0].slice()];
    spans.forEach((s) => {
      const last = merged[merged.length - 1];
      if (s[0] <= last[1]) last[1] = Math.max(last[1], s[1]);
      else merged.push(s.slice());
    });
    const lanes = [merged[0][0] - CLEARANCE, merged[merged.length - 1][1] + CLEARANCE];
    for (let i = 0; i < merged.length - 1; i++) {
      if (merged[i + 1][0] - merged[i][1] >= CORRIDOR) {
        lanes.push((merged[i][1] + merged[i + 1][0]) / 2);
      }
    }
    return lanes;
  };

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
        /* WHICH LANE TO CROSS IN.
           The first version knew two: above every card in the way, or below
           every one of them. That is what sent an edge riding over the whole
           fork block when there was a clear corridor between that block and the
           card beneath it — a longer and more crooked line than the geometry
           asked for, and one that only appeared at some window heights, because
           it depends on how the levels split into sub-columns.

           Every free horizontal corridor across the span is a candidate now:
           above the cards in the way, below them, and each gap between them
           wide enough to hold the line and its clearance. The one that deviates
           least from the two endpoints wins — which is any corridor lying
           between them, since the cost is then exactly the height difference
           the edge had to cover anyway. */
        const lanes = freeLanes(x1 + 2, x2 - 2, ignore);
        let yD = null, cheapest = Infinity;
        lanes.forEach((y) => {
          if (inTheWay(x1 + 2, x2 - 2, y - 3, y + 3, ignore).length) return;
          const cost = Math.abs(y1 - y) + Math.abs(y2 - y) +
            Math.abs(y - (y1 + y2) / 2) / 1000;
          if (cost < cheapest) { cheapest = cost; yD = y; }
        });
        // nothing free between the two: the lane above or below the whole graph
        // is, and it always is
        if (yD === null) {
          yD = (y1 - detourUp) + (y2 - detourUp) <= (detourDown - y1) + (detourDown - y2)
            ? detourUp : detourDown;
        }
        // the clamp keeps the lane inside the drawing, and can therefore push it
        // into a card that sits against the edge. When it does, the other side
        // is tried before a line is drawn through anything.
        const clamp = (y) => Math.max(6, Math.min(far - 6, y));
        yD = clamp(yD);
        if (inTheWay(x1 + 2, x2 - 2, yD - 3, yD + 3, ignore).length) {
          const other = clamp(yD <= (detourUp + detourDown) / 2 ? detourDown : detourUp);
          if (!inTheWay(x1 + 2, x2 - 2, other - 3, other + 3, ignore).length) yD = other;
        }
        // each endpoint uses the clearance it actually has: the rise out of the
        // prerequisite fits the gap to its right, the one into the dependent
        // fits the gap to its left
        const width = (x, rightwards) => {
          const ya = Math.min(rightwards ? y1 : y2, yD), yb = Math.max(rightwards ? y1 : y2, yD);
          return Math.max(5, Math.min(26, clearance(x, ya, yb, ignore, rightwards) / 2));
        };
        const eS = width(x1, true), eE = width(x2, false);
        dd = 'M' + P(x1, y1) +
          ' C' + P(x1 + eS, y1) + ' ' + P(x1 + eS, yD) + ' ' + P(x1 + eS * 2, yD) +
          ' L' + P(x2 - eE * 2, yD) +
          ' C' + P(x2 - eE, yD) + ' ' + P(x2 - eE, y2) + ' ' + P(x2, y2);
      } else {
        const dx = Math.max(18, (x2 - x1) / 2);
        dd = 'M' + P(x1, y1) + ' C' + P(x1 + dx, y1) +
          ' ' + P(x2 - dx, y2) + ' ' + P(x2, y2);
      }

      lines.push(
        '<g class="edge" data-from="' + d + '" data-to="' + node.id + '">' +
          '<title>' + nodeLabel(d, g) + ' → ' + nodeLabel(node.id, g) + '</title>' +
          '<path class="hit" d="' + dd + '"/>' +
          '<path class="row" d="' + dd + '"/>' +
          '<circle class="tip" cx="' + (down ? y2 : x2) + '" cy="' + (down ? x2 : y2) + '" r="3"/>' +
        '</g>'
      );
    });
  });
  svg.innerHTML = lines.join('');
  updateGraphArrows();
  // the panel is rebuilt whenever a fork changes branch, and it can be rebuilt
  // while the graph owns the window: the button that came back says what it
  // does now, not what it did the first time it was built
  const toggle = panelEl.querySelector('.graph-full-toggle');
  if (toggle) {
    toggle.setAttribute('aria-label', txt(document.body.classList.contains('graph-full')
      ? 'leave the whole screen' : 'see the graph on the whole screen'));
  }
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
  // and if there is anywhere to go on either axis, it can be dragged there
  scroller.classList.toggle('can-pan', overflow > 4 || overflowY > 4);
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
  updateRow($('.tabs-box'));
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

/* ---------- a click pages, a hold glides ----------

   A screenful per click is right for crossing a long track and wrong for the
   last stretch of it: it overshoots, and the card you were trying to reach ends
   up cut in half against the edge. Holding the arrow down scrolls continuously
   instead, and stops the instant you let go — so the fine adjustment the click
   cannot make is made by not letting go yet.

   The two do not fight. Nothing happens until HOLD_DELAY has passed, so a normal
   click is untouched; once the glide has started, the click that the release
   would otherwise produce is swallowed, so a long press never also pages.

   It ramps. Starting at the full speed would overshoot exactly like the click
   does; starting slow gives a few pixels of control, and holding on gets you
   across the graph without a second press. */
const HOLD_DELAY = 300;   // ms before a press stops counting as a click
const HOLD_FROM = 0.22;   // px per ms at the moment the glide starts
const HOLD_TO = 0.95;     // px per ms it works up to
const HOLD_RAMP = 700;    // ms to get from one to the other

const holding = { timer: 0, raf: 0, active: false, swallow: false };

/* Which scroller an arrow drives, and in which direction. Both families of
   arrow — the graph's and the tab rows' — answer the same question, and the
   catalogue's filter chips use ids instead of `data-scroll`. */
function arrowTarget(b) {
  if (b.classList.contains('graph-arrow')) {
    return { scroller: panelEl.querySelector('.track-graph'), dir: Number(b.dataset.scroll) };
  }
  const box = b.closest('.tabs-box, .chips-box');
  return {
    scroller: box && box.querySelector('.track-tabs, .chips'),
    dir: (b.id === 'chips-left' || b.dataset.scroll === '-1') ? -1 : 1,
  };
}

function stopHold() {
  clearTimeout(holding.timer);
  cancelAnimationFrame(holding.raf);
  holding.timer = 0;
  holding.raf = 0;
  holding.active = false;
}

function glide(scroller, dir) {
  const started = performance.now();
  let last = started;
  const step = (now) => {
    // a tab that was in the background comes back with a huge delta: clamp it,
    // or the graph jumps the width of the wait
    const dt = Math.min(64, now - last);
    last = now;
    const ramp = Math.min(1, (now - started) / HOLD_RAMP);
    const before = scroller.scrollLeft;
    scroller.scrollLeft = before + dir * (HOLD_FROM + (HOLD_TO - HOLD_FROM) * ramp) * dt;
    // the end of the track: nothing moved, so there is nothing left to do
    if (scroller.scrollLeft === before) { stopHold(); return; }
    holding.raf = requestAnimationFrame(step);
  };
  holding.raf = requestAnimationFrame(step);
}

document.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  const b = e.target.closest('.graph-arrow[data-scroll], .tabs-arrow[data-scroll], #chips-left, #chips-right');
  if (!b || b.disabled) return;
  holding.swallow = false;
  const { scroller, dir } = arrowTarget(b);
  if (!scroller) return;
  holding.timer = setTimeout(() => {
    holding.timer = 0;
    holding.active = true;
    holding.swallow = true;
    // keep receiving the release even if the pointer wanders off the button
    if (b.setPointerCapture) { try { b.setPointerCapture(e.pointerId); } catch (err) { /* not captured */ } }
    glide(scroller, dir);
  }, HOLD_DELAY);
});

['pointerup', 'pointercancel'].forEach((type) =>
  document.addEventListener(type, stopHold));
// a press that scrolls away from the button still ends the glide when released
window.addEventListener('blur', stopHold);

/* The release fires a click. After a glide that click would page on top of what
   the hold already did, so it is stopped here — in the capture phase, before the
   two handlers that would act on it. */
document.addEventListener('click', (e) => {
  if (!holding.swallow) return;
  holding.swallow = false;
  if (e.target.closest('.graph-arrow, .tabs-arrow, #chips-left, #chips-right')) {
    e.stopPropagation();
    e.preventDefault();
  }
}, true);

// on a touchscreen a long press opens the callout menu; while gliding it must not
document.addEventListener('contextmenu', (e) => {
  if (holding.active && e.target.closest('.graph-arrow, .tabs-arrow, #chips-left, #chips-right')) {
    e.preventDefault();
  }
});

/* ---------- and a drag pans ----------

   The arrows page and a hold glides, and both make you find a button first.
   Taking hold of the graph itself says the same thing directly, and it is what
   a map has taught everybody to try.

   It costs one threshold. A press on a card has to stay a click that opens the
   course, so nothing moves until the pointer has travelled DRAG_FROM pixels;
   past that the press is a drag, and the click the release would fire is
   swallowed the same way the glide's is.

   Touch is left alone on purpose: the graph is an ordinary scroller there, and
   the browser's own inertia is better than anything reimplemented here. This is
   for the mouse and the pen, which have no such gesture of their own.

   Both axes move, which is what makes it work in portrait too — the graph flows
   down there and the same drag follows it, with no mode to ask about. */
const DRAG_FROM = 5;   // px of travel before a press stops being a click

const dragging = { on: false, el: null, id: -1, x: 0, y: 0, left: 0, top: 0, swallow: false };

function endDrag() {
  if (dragging.el) {
    if (dragging.el.releasePointerCapture) {
      try { dragging.el.releasePointerCapture(dragging.id); } catch (err) { /* already released */ }
    }
    dragging.el.classList.remove('is-dragging');
  }
  dragging.on = false;
  dragging.el = null;
  dragging.id = -1;
}

document.addEventListener('pointerdown', (e) => {
  // touch scrolls natively, and a middle or right button is not a drag
  if (e.button !== 0 || e.pointerType === 'touch') return;
  const el = e.target.closest('.track-graph.can-pan');
  if (!el) return;
  dragging.swallow = false;
  dragging.el = el;
  dragging.id = e.pointerId;
  dragging.x = e.clientX;
  dragging.y = e.clientY;
  dragging.left = el.scrollLeft;
  dragging.top = el.scrollTop;
  dragging.on = false;
});

document.addEventListener('pointermove', (e) => {
  if (!dragging.el || e.pointerId !== dragging.id) return;
  const dx = e.clientX - dragging.x;
  const dy = e.clientY - dragging.y;
  if (!dragging.on) {
    if (Math.hypot(dx, dy) < DRAG_FROM) return;
    dragging.on = true;
    dragging.swallow = true;
    dragging.el.classList.add('is-dragging');
    // keep the move and the release even when the pointer leaves the graph
    if (dragging.el.setPointerCapture) {
      try { dragging.el.setPointerCapture(e.pointerId); } catch (err) { /* not captured */ }
    }
  }
  dragging.el.scrollLeft = dragging.left - dx;
  dragging.el.scrollTop = dragging.top - dy;
});

['pointerup', 'pointercancel'].forEach((type) => document.addEventListener(type, endDrag));
window.addEventListener('blur', endDrag);

/* The release fires a click, and after a drag that click would open whatever
   card the pointer happened to land on. Swallowed in the capture phase, before
   the handler that opens a course sees it. */
document.addEventListener('click', (e) => {
  if (!dragging.swallow) return;
  dragging.swallow = false;
  if (e.target.closest('.track-graph')) {
    e.stopPropagation();
    e.preventDefault();
  }
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
const searchClear = $('#search-clear');
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
      /* the id is searchable because it is the name the rest of the project uses:
         it is in the modal's file line, in the URL a track links to, and in every
         conversation about the catalogue. It does not get translated, so it also
         finds a course when you only remember the English. */
      c.id.toLowerCase().includes(term) ||
      c.name.toLowerCase().includes(term) ||
      c.summary.toLowerCase().includes(term) ||
      c.syllabus.join(' ').toLowerCase().includes(term) ||
      (c.topics || []).join(' ').toLowerCase().includes(term);
    return okCat && okTerm;
  });
  searchClear.hidden = !searchEl.value;

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
          '<span class="tracks-count">' + (nT ? txt('in') + ' ' + nT + ' ' + txt(nT > 1 ? 'tracks' : 'track') : txt('standalone course')) + '</span></span>' +
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

/* Clearing the filter is one click instead of selecting and deleting. The focus
   goes back to the field, because whoever cleared it is about to type again, and
   Escape does the same thing from the keyboard — the dropdowns already answer to
   Escape, and this one only takes it when the field has something in it. */
searchClear.addEventListener('click', () => {
  searchEl.value = '';
  buildCatalogue();
  searchEl.focus();
});
searchEl.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && searchEl.value) {
    e.stopPropagation();
    searchEl.value = '';
    buildCatalogue();
  }
});

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

/* "faz parte de 3 trilhas"

   The whole sentence is ONE translation key, with `{n}` in place of the number —
   not a prefix plus a noun. It used to be assembled from pieces, and that works
   in Portuguese, where the qualifier comes after, and breaks in English, where it
   comes before: out came "part of 2 tracks career tracks". Word order is
   something only the whole sentence settles. */
function trackBlock(list) {
  if (!list.length) return '';
  const n = list.length;
  const key = 'part of {n} track' + (n > 1 ? 's' : '');
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
  modalFile.textContent = id + '.curso';
  /* Two columns wherever they fit (see style.css): on the left what convinces —
     what the course is, the video, what you will learn and the button; on the
     right what details it — the topic by topic list, prerequisites and tracks.
     In a single column, the HTML order is already the right reading order. */
  modalBody.innerHTML =
    '<div class="modal-col modal-col-intro">' +
    '<h3 id="modal-title">' + c.name + '</h3>' +
    '<div class="modal-meta">' +
      '<span>' + txt('area') + ': <b>' + txt(c.category) + '</b></span>' +
      '<span>' + txt('level') + ': <b>' + txt(c.level) + '</b></span>' +
      '<span>' + txt('workload') + ': <b>' + c.hours + ' ' + txt('hours') + '</b></span>' +
    '</div>' +
    videoBlock(c) +
    /* The syllabus sits under the video, where the one-line summary used to.
       The summary said in a sentence what the video is there to say properly,
       and it is still on the catalogue card that got you here; what belongs
       beside the enrolment button is what you will actually learn. It balances
       the two columns as a side effect — the left was the shorter one. */
    '<div class="modal-block modal-syllabus"><h4>' + txt('what you learn') + '</h4><ul>' +
      c.syllabus.map((e) => '<li>' + e + '</li>').join('') +
    '</ul></div>' +
    '<div class="modal-actions"><a class="btn btn-primary" href="https://app.codeschool.ing">' +
      txt('Start now →') + '</a></div>' +
    '</div>' +
    '<div class="modal-col modal-col-detail">' +
    // the full technical list — collapsed, for whoever wants to check it topic by topic
    (c.topics && c.topics.length
      ? '<details class="modal-topics"' + (twoColumns() ? ' open' : '') + '><summary>' + txt('detailed contents') +
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
    trackBlock(tracks) +
    '</div>';
  modalBody.scrollTop = 0;
  modal.hidden = false;
  /* locks the page underneath: the class cuts the overflow of the document and
     of the current screen, and the wheel and touch handlers stop pushing the
     background. They are the two halves of the same problem — the class handles
     the scrollbar and the inertia, the handlers handle the chaining. */
  document.documentElement.classList.add('modal-open');
  fitModal();
  $('#modal-close').focus();
}

/* ---------- one height for every course ----------

   The box is a fixed height (`--modal-h`), so opening one course after another
   does not resize the window's worth of dark panel each time. What varies is
   which part of each column absorbs the difference, and both are measured here
   because both depend on a width only the layout knows.

   THE LEFT is a title, the meta line, the frame, the syllabus and the button.
   Everything but the frame is set by the course, and it ranges over 160px across
   the catalogue — more than the auto margin above the button can hide. So the
   frame takes it: it grows to 4:3 where the course is short, and is squeezed
   towards 2.3:1 where it is long. 745px is the tallest the left column gets at
   16:9, which is why it is the height chosen: on any screen tall enough, no
   frame is ever squeezed at all.

   THE RIGHT is the topic list, the prerequisites and two rows of chips. The list
   is the part that can be any height, so it is given exactly the room the others
   leave — which is what keeps the column from ending early, and from scrolling.

   Below 1024px there is one column and none of this applies: the inline heights
   are cleared and the page scrolls, which is what a phone wants. */
const VIDEO_FLAT = 2.3;   // the widest the frame may be squeezed to
const VIDEO_TALL = 4 / 3; // and the tallest it may grow into slack
const LIST_FLOOR = 140;   // below this the list is not worth scrolling inside

function twoColumns() { return matchMedia('(min-width:1024px)').matches; }

function fitModal() {
  const intro = modalBody.querySelector('.modal-col-intro');
  const detail = modalBody.querySelector('.modal-col-detail');
  const video = modalBody.querySelector('.modal-video');
  const list = modalBody.querySelector('.modal-topics[open] > ul');
  const syllabus = modalBody.querySelector('.modal-syllabus ul');
  if (video) video.style.height = '';
  if (list) list.style.height = '';
  if (syllabus) syllabus.style.height = '';
  if (!intro || !detail || !twoColumns()) return;

  if (video && video.clientWidth) {
    /* HOW MUCH ROOM THE COLUMN REALLY HAS.
       Not `scrollHeight`, which never reports less than the column; and not the
       gap above the button, which also contains that block's own bottom margin
       and the button's padding — growing the frame by the whole gap ate both and
       clipped the last line of the syllabus.
       The button's `margin-top:auto` is zeroed for the measurement, the bottom
       of the content is read against the top of the column, and the margin is
       put straight back. One reflow, and the number is exact. */
    const actions = intro.querySelector('.modal-actions');
    if (actions) actions.style.marginTop = '0px';
    const contentH = actions
      ? actions.getBoundingClientRect().bottom - intro.getBoundingClientRect().top + intro.scrollTop
      : intro.scrollHeight;
    if (actions) actions.style.marginTop = '';

    const w = video.clientWidth;
    const now = video.getBoundingClientRect().height;
    const diff = intro.clientHeight - contentH;   // positive: slack. negative: overflow.
    video.style.height = Math.round(diff > 0
      ? Math.min(w * VIDEO_TALL, now + diff)
      : Math.max(w / VIDEO_FLAT, now + diff)) + 'px';
  }

  /* Last resort, and only on a short screen: with the frame already at its
     flattest the longest syllabuses still overrun the column by up to 55px, and
     what that pushes out of sight is the button. So the syllabus scrolls — the
     one block on this side that can lose a line without losing the argument,
     since every line of it is repeated in the topic list opposite. */
  if (syllabus) {
    const over = intro.scrollHeight - intro.clientHeight;
    if (over > 0) {
      syllabus.style.height =
        Math.round(Math.max(60, syllabus.getBoundingClientRect().height - over)) + 'px';
    }
  }

  if (list) {
    // everything in the column that is not the list, taken off the column
    /* What the blocks under the list need is ADDED UP, margins included, with
       the list collapsed to nothing. Neither subtracting the list from
       `scrollHeight` nor reading `scrollHeight` with the list at zero works:
       `scrollHeight` never reports less than the column's own height, so where
       the column does not overflow both give the column back and the list is
       left exactly as it was — which is what kept it 363px short.
       And the height is always set, even below the floor. Skipping there was the
       other half of the same bug: `python` kept its natural 622px list in a
       column with 135px for it and scrolled by 486. Clamped, it overflows by
       four pixels. */
    list.style.height = '0px';
    const others = [...detail.children].reduce((sum, el) => {
      const cs = getComputedStyle(el);
      return sum + el.getBoundingClientRect().height +
        parseFloat(cs.marginTop || 0) + parseFloat(cs.marginBottom || 0);
    }, 0);
    const room = detail.clientHeight - others;
    /* Below the floor the list is not worth scrolling inside, and forcing it to
       the floor is what made the column overflow. It closes instead: the summary
       bar still says how many topics there are, and opening it by hand is a
       choice the reader made, at which point the column may scroll. */
    if (room < LIST_FLOOR) { list.style.height = ''; list.parentElement.open = false; return; }
    list.style.height = Math.round(room) + 'px';
  }
}
addEventListener('resize', fitModal);
modalBody.addEventListener('toggle', (e) => {
  // opening the list changes the box's height, and with it what the frame may take
  if (e.target.classList.contains('modal-topics')) fitModal();
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

  // a track finished on the way: opens it, because naming it and leaving the
  // student to find it in the tab row is worse than not naming it
  const goto = e.target.closest('[data-goto-track]');
  if (goto) { openTrack(Number(goto.dataset.gotoTrack)); return; }

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


/* ==========================================================
   NEWSLETTER

   Brevo's subscription-form endpoint. NOT a secret — it is designed to sit in
   public markup, and it only accepts a subscription; it reads nothing back.
   Empty would put the form in demonstration mode, which is what it was in until
   this URL existed.

   DOUBLE OPT-IN IS ON, and it is what the message below has to respect: the
   address is NOT subscribed when this POST returns. Brevo sends a confirmation
   link and adds the contact only when it is clicked — which is also the record
   that proves consent, the legal basis the privacy policy declares for this
   list.
   ========================================================== */
const NEWSLETTER_URL = 'https://8b3d65a8.sibforms.com/serve/MUIFAM5syFfU88XAFU01XQjwn3TcF079HC8nNn8FCguQlixQ8pT_0g_6YeMjx058TPi6_oH9FXk9MoOsLor7d9MFPyyENqUVcK7MyA-dzwrWUW5qA7KQZY_MPllsyRaSxate1yLIt4wkDiJcOm6jvtG1J33_8NuUFryYQHwEOIlpI0ae126hn69lCbRI0TIyi8H6rSM1PcvCJdYhYg==';

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
  /* `no-cors` means the response is opaque: this resolves whether Brevo accepted
     the address or refused it, and only a dead network rejects. So the message
     cannot claim success — it says what was attempted and what the person still
     has to do, which is true either way and is the same shape the password-reset
     endpoint uses for the same reason. */
  fetch(NEWSLETTER_URL, { method: 'POST', mode: 'no-cors', body: data })
    .then(() => {
      newsStatus.textContent = txt('✓ check your inbox — click the link to confirm');
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
  if (document.body.classList.contains('graph-full')) return;
  if (!atEdge(screen, right)) { screen.scrollTop += e.deltaY; return; }
  if (Math.abs(e.deltaY) < 8) return;
  goTo(current + right);
}, { passive: false });

/* ---------- the graph on the whole screen ----------

   On the track screen the graph gets what is left after the name, the objective
   and the numbers have taken theirs: 390px of height at 1920×950, with 45% to
   73% of its width behind a sideways scroll. The graph is not short, it is wide
   — it always uses exactly the height it needs — so the panel's 1300px cap costs
   it more than the heading does, and both are gone here.

   It opens at its own size and stays there. A mode that scaled the whole track
   down until it fit was tried and dropped: the tracks that need it are the ones
   that only fit at 45%, which is a size nobody reads, and the arrows already
   answer what comes next.

   Not a second page and not the Fullscreen API: the panel is the same DOM moved
   to a fixed layer, so nothing is rebuilt, the nav stays where it is, and Escape
   gets you out. */
function graphFullscreen(on) {
  const body = document.body;
  if (body.classList.contains('graph-full') === on) return;
  body.classList.toggle('graph-full', on);
  // the graph is laid out on measurements, and the measurements just changed:
  // the levels split by the height they are given, and that is the whole point.
  // drawEdges also relabels the button, which now means the opposite.
  requestAnimationFrame(() => {
    drawEdges(TRACKS[currentTrack]);
    const b = panelEl.querySelector('.graph-full-toggle');
    if (b) b.focus({ preventScroll: true });
  });
}

document.addEventListener('click', (e) => {
  if (e.target.closest('[data-graph-full]')) {
    graphFullscreen(!document.body.classList.contains('graph-full'));
    return;
  }
  const more = e.target.closest('[data-goal-more]');
  if (more) {
    const p = more.previousElementSibling;
    const open = p.classList.toggle('open');
    more.textContent = txt(open ? 'shorten the objective' : 'read the whole objective');
    drawEdges(TRACKS[currentTrack]);
  }
});

// the window changed size under a graph that is measuring itself against it
addEventListener('resize', () => {
  if (document.body.classList.contains('graph-full')) drawEdges(TRACKS[currentTrack]);
});

/* keyboard */
window.addEventListener('keydown', (e) => {
  if (document.body.classList.contains('graph-full')) {
    if (e.key === 'Escape') { e.preventDefault(); graphFullscreen(false); }
    // while the graph owns the window the arrows drive it, not the screens
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const g = panelEl.querySelector('.track-graph');
      if (g) { e.preventDefault(); g.scrollLeft += (e.key === 'ArrowLeft' ? -1 : 1) * 320; }
    }
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' ', 'Home', 'End'].includes(e.key)) {
      e.preventDefault();
    }
    return;
  }
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
    const pos = currentTrack + (e.key === 'ArrowRight' ? 1 : -1);
    openTrack(Math.max(0, Math.min(TRACKS.length - 1, pos)));
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
