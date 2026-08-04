/* ==========================================================================
   codeschool.ing — showcase site (data in assets/dados.js)

   ON LANGUAGE: comments and logic identifiers are in English. Three families of
   name stay in Portuguese because they are contracts, not preferences:

     · the catalogue's fields (`nome`, `horas`, `topicos`, `depende`, `opcoes`…),
       which assets/dados.js and the four i18n-cursos-*.js files define;
     · DOM ids, `data-*` attributes and CSS classes (`#trilha-painel`, `.curso-no`,
       `.garfo-aba`), which index.html and style.css share with this file;
     · the arguments to `txt()`, which ARE the translation keys — the Portuguese
       sentence is the lookup key across all four translation files.

   Text the visitor reads is Portuguese for the obvious reason.
   ========================================================================== */

const $ = (sel) => document.querySelector(sel);
const courseById = (id) => CURSOS.find((c) => c.id === id);

/* ---------- tracks with a fork ----------
   An item of `cursos` is either a course id (a string) or a choice step (an
   object with `opcoes`). Hence three different readings of the same track:
   every possible course, the chosen path, and the hours of that path. */
const isChoice = (item) => typeof item === 'object' && Array.isArray(item.opcoes);

// every course the track can contain, adding up all the options
const allCourses = (t) =>
  t.cursos.flatMap((i) => (isChoice(i) ? i.opcoes.flatMap((o) => o.cursos) : [i]));

// each track's current choice, by option index (the first one is the suggested one)
const choices = {};
const activeOption = (trackId, stepIdx) => (choices[trackId + ':' + stepIdx] || 0);

// the path the student is looking at right now
const trackPath = (t) =>
  t.cursos.flatMap((i, idx) => (isChoice(i) ? i.opcoes[activeOption(t.id, idx)].cursos : [i]));

const hoursOf = (ids) => ids.reduce((s, id) => s + (courseById(id)?.horas || 0), 0);

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

  t.cursos.forEach((item, idx) => {
    if (!isChoice(item)) {
      nodes.push({ id: item, kind: 'curso', courses: [item] });
      ofCourse[item] = item;
      return;
    }
    const nodeId = 'garfo:' + idx;
    nodes.push({ id: nodeId, kind: 'garfo', step: item, idx: idx, courses: item.opcoes[activeOption(t.id, idx)].cursos });
    item.opcoes.forEach((o) => o.cursos.forEach((c) => { forkMembers[c] = nodeId; }));
    item.opcoes[activeOption(t.id, idx)].cursos.forEach((c) => { ofCourse[c] = nodeId; });
  });

  // edges: prerequisite -> course, resolving inner courses to their block
  const idOfItem = (v) => (typeof v === 'number' ? nodes[v] && nodes[v].id : ofCourse[v] || forkMembers[v]);
  nodes.forEach((node, i) => {
    const deps = new Set();
    node.courses.forEach((id) => {
      (courseById(id)?.depende || []).forEach((d) => {
        const target = ofCourse[d] || forkMembers[d];
        if (target && target !== node.id) deps.add(target);
      });
      // links that exist only in this track (curriculum order, not content order)
      ((t.ligacoes || {})[id] || []).forEach((v) => {
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
    console.warn('track "' + t.nome + '": circular dependency in ' + stuck.map((n) => n.id).join(', '));
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
  t.cursos.forEach((i) => {
    if (!isChoice(i)) { const h = courseById(i)?.horas || 0; min += h; max += h; return; }
    const hs = i.opcoes.map((o) => hoursOf(o.cursos));
    min += Math.min(...hs);
    max += Math.max(...hs);
  });
  return { min, max };
}

// in how many tracks a course appears (the same course can serve several)
const tracksOfCourse = (id) => TRILHAS.filter((t) => allCourses(t).includes(id));
// the inverse of `depende`: which courses this one unlocks
const unlockedBy = (id) => CURSOS.filter((c) => (c.depende || []).includes(id));

document.getElementById('ano').textContent = new Date().getFullYear();
$('#n-cursos').textContent = CURSOS.length;
$('#n-trilhas').textContent = TRILHAS.length;
/* the catalogue's real total workload, in place of the old "5,000+ students
   graduated" — a number a new school does not have. This one grows by itself
   when a course is added, and it is true on the day the site goes up. The
   thousands separator follows the language: 5.930 in Portuguese, 5,930 in
   English. */
const TOTAL_HOURS = CURSOS.reduce((s, c) => s + (c.horas || 0), 0);
const currentLocale = () => (LANGUAGES.find((i) => i.cod === LANG) || {}).html || 'pt-BR';
function showHours() {
  $('#n-horas').textContent = TOTAL_HOURS.toLocaleString(currentLocale());
}
showHours();

/* ---------- the hero terminal ----------
   Four commands, and not one hand-written response: the numbers, the track names
   and the course card all come out of CURSOS and TRILHAS. That way the terminal
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
  const blank = '<div class="term-vao"></div>';

  const status = arrow('✓', 'ok',
    CURSOS.length + ' ' + txt('cursos ·') + ' ' + TRILHAS.length + ' ' + txt('trilhas ·') +
    ' ' + TOTAL_HOURS.toLocaleString(currentLocale()) + ' ' + txt('horas de conteúdo'));

  const career = TRILHAS.filter((t) => t.familia === 'carreira');
  const list = career.slice(0, 3).map((t) => {
    const f = hoursRange(t);
    return arrow('→', 'pr', t.nome + ' · ' + (f.min === f.max ? f.min : f.min + '–' + f.max) + 'h');
  }).join('');
  const rest = career.length - 3;
  const moreTracks = rest > 0
    ? '<div class="term-line"><span class="cm">  ' +
      txt('… e mais {n} trilhas de carreira').replace('{n}', rest) + '</span></div>'
    : '';

  const c = courseById(SHOWCASE_COURSE) || CURSOS.find((x) => (x.depende || []).length);
  const card = c
    ? cmd('codeschool course ' + c.id + ' --info') +
      arrow('→', 'pr', c.nome + ' · ' + c.horas + 'h · ' + txt(c.nivel)) +
      ((c.depende || []).length
        ? arrow('↳', 'cm', txt('precisa antes:') + ' ' +
            c.depende.map((d) => courseById(d)?.nome).filter(Boolean).join(', '))
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

/* ---------- light/dark theme ---------- */
const themeBtn = $('#tema-btn');
function applyTheme(theme) {
  if (theme === 'claro') document.documentElement.dataset.tema = 'claro';
  else delete document.documentElement.dataset.tema;
  themeBtn.setAttribute('aria-label', theme === 'claro' ? 'Mudar para tema escuro' : 'Mudar para tema claro');
}
themeBtn.addEventListener('click', () => {
  const next = document.documentElement.dataset.tema === 'claro' ? 'escuro' : 'claro';
  try { localStorage.setItem('codeschool-tema', next); } catch (e) {}
  applyTheme(next);
});
try { applyTheme(localStorage.getItem('codeschool-tema') || 'escuro'); } catch (e) { applyTheme('escuro'); }

/* ---------- mobile menu ---------- */
const menu = $('#menu');
$('#burger').addEventListener('click', () => menu.classList.toggle('open'));

/* ==========================================================
   TRACKS — a sequence of courses with arrows
   ========================================================== */
const panelEl = $('#trilha-painel');
let currentTrack = 0;
let swapT = null;

/* Two families of track: "carreira" answers which profession the student wants,
   "tecnologia" answers which tool they want to master. Each has its own row of
   tabs, with its own label and arrows — since there are only two, the switcher
   that used to be there cost more height than it conveyed. The index used
   throughout this section is still the one into TRILHAS. */
const FAMILIES = ['carreira', 'tecnologia'];
const familyOf = (t) => t.familia || 'carreira';
const indicesOfFamily = (f) => TRILHAS.map((t, i) => (familyOf(t) === f ? i : -1)).filter((i) => i >= 0);
const familyBox = (f) => document.querySelector('.abas-caixa[data-familia="' + f + '"]');
const familyTabs = (f) => $('#abas-' + f);

/* The tracks dropdown (mobile): the two scrollable rows become a single list,
   grouped by family. Same data source, same opening function. */
const trackDrop = $('#drop-trilhas');
function buildTrackDropdown() {
  const list = $('#drop-trilhas-lista');
  list.textContent = '';
  FAMILIES.forEach((f) => {
    const h = document.createElement('div');
    h.className = 'drop-grupo';
    h.textContent = txt(f === 'carreira' ? 'trilhas por carreira' : 'trilhas por tecnologia');
    list.appendChild(h);
    indicesOfFamily(f).forEach((i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'drop-op' + (i === currentTrack ? ' on' : '');
      b.textContent = TRILHAS[i].nome;
      b.addEventListener('click', () => { openTrack(i); closeDropdowns(); });
      list.appendChild(b);
    });
  });
  trackDrop.querySelector('.drop-atual').textContent = TRILHAS[currentTrack].nome;
}

function buildTabs() {
  FAMILIES.forEach((f) => {
    const el = familyTabs(f);
    el.textContent = '';
    indicesOfFamily(f).forEach((i) => {
      const b = document.createElement('button');
      b.className = 'trilha-aba' + (i === currentTrack ? ' on' : '');
      b.type = 'button';
      b.dataset.idx = i;
      b.setAttribute('role', 'tab');
      b.textContent = TRILHAS[i].nome;
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
  const requires = (deps || []).map((d) => courseById(d)?.nome).filter(Boolean);
  return (
    '<button class="curso-no" type="button" data-curso="' + c.id + '" data-no="' + c.id + '">' +
      (order ? '<span class="ordem">' + txt('nível') + ' ' + order + '</span>' : '') +
      '<span class="nome">' + c.nome + '</span>' +
      (nT > 1 ? '<span class="tag-compartilhado">' + txt('em') + ' ' + nT + ' ' + txt('trilhas') + '</span>' : '') +
      '<span class="meta">' + c.horas + 'h · ' + txt(c.nivel) + '</span>' +
      (requires.length ? '<span class="requer">' + txt('depois de') + ' ' + requires.join(' + ') + '</span>' : '') +
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
            return '<div class="no-saida" data-no="@saida">' +
              '<span class="saida-selo" aria-hidden="true">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
                '<path d="M5 22V4M5 4h11l-2 4 2 4H5"/></svg>' +
              '</span>' +
              '<span class="saida-txt">' +
                '<span class="saida-rotulo">' + txt('chegada') + '</span>' +
                '<span class="saida-nome">' + t.saida + '</span>' +
              '</span>' +
            '</div>';
          }
          if (node.kind === 'curso') {
            const names = (courseById(node.id)?.depende || []).filter((d) => g.nodes.some((x) => x.courses.includes(d)));
            return courseCard(node.id, String(v + 1).padStart(2, '0'), names);
          }
          // choice step: a single block, with the options as tabs
          const item = node.step;
          const sel = activeOption(t.id, node.idx);
          const tabs = item.opcoes
            .map((o, j) =>
              '<button class="garfo-aba' + (j === sel ? ' on' : '') + '" type="button" ' +
              'data-garfo="' + node.idx + '" data-opcao="' + j + '">' + o.nome +
              '<span class="garfo-h">' + hoursOf(o.cursos) + 'h</span></button>')
            .join('');
          const inside = item.opcoes[sel].cursos.map((id) => courseCard(id)).join('');
          return (
            '<div class="garfo" data-no="' + node.id + '">' +
              '<div class="garfo-topo">' +
                '<span class="garfo-rotulo">' + txt('nível') + ' ' + String(v + 1).padStart(2, '0') +
                  ' · ' + txt('você escolhe') + ' ' + item.escolha + '</span>' +
                '<div class="garfo-abas" role="tablist">' + tabs + '</div>' +
              '</div>' +
              (item.nota ? '<p class="garfo-nota">' + item.nota + '</p>' : '') +
              '<div class="garfo-cursos">' + inside + '</div>' +
            '</div>'
          );
        })
        .join('');
      // one sub-column only; the script splits it after measuring the real height
      return '<div class="nivel" data-nivel="' + v + '"><div class="subcol">' + cards + '</div></div>';
    })
    .join('');

  const workload = min === max
    ? '<span><b>' + hours + 'h</b>' + txt('de carga') + '</span>'
    : '<span><b>' + hours + 'h</b>' + txt('neste caminho') + ' <i>(' + min + 'h ' + txt('a') + ' ' + max + 'h)</i></span>';

  const parallel = g.columns.slice(0, -1).filter((c) => c.length > 1).length;

  return (
    '<div class="trilha-topo">' +
      '<div>' +
        '<h3>' + t.nome + '</h3>' +
        '<p>' + t.objetivo + '</p>' +
      '</div>' +
      '<div class="trilha-resumo">' +
        '<span><b>' + path.length + '</b>' + txt('cursos') + '</span>' +
        workload +
        '<span><b>' + g.realLevels + '</b>' + txt('níveis') +
          (parallel ? '<i>' + parallel + ' ' + txt('deles com ordem livre') + '</i>' : '') +
        '</span>' +
        '<span><b>→</b>' + t.saida + '</span>' +
      '</div>' +
    '</div>' +
    '<div class="grafo-caixa">' +
      '<button class="grafo-seta esq" type="button" data-rolar="-1" aria-label="Ver níveis anteriores">←</button>' +
      '<div class="trilha-grafo"><svg class="grafo-arestas" aria-hidden="true"></svg>' +
        '<div class="grafo-niveis">' + columns + '</div></div>' +
      '<button class="grafo-seta dir" type="button" data-rolar="1" aria-label="Ver próximos níveis">→</button>' +
    '</div>'
  );
}

/* ---------- splits each level into sub-columns ----------
   A level with many courses must not stretch below the screen. Here the real
   height of each card is measured and a sub-column is filled up to the limit
   before the next one opens, so the graph grows horizontally — which is where
   the navigation arrows are. */
function splitLevels() {
  const scroller = panelEl.querySelector('.trilha-grafo');
  const lane = panelEl.querySelector('.grafo-niveis');
  if (!scroller || !lane) return;
  // back to full size before measuring: it is the available height that decides
  // the split, not whatever was left over from the previous track
  const boxG = panelEl.querySelector('.grafo-caixa');
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
  panelEl.querySelectorAll('.nivel').forEach((lvl) => {
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
    panelEl.querySelectorAll('.nivel > .subcol').forEach((sc) => {
      tallest = Math.max(tallest, sc.offsetHeight);
    });
    const full = scroller.clientHeight;
    const cx = panelEl.querySelector('.grafo-caixa');
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
  const cont = panelEl.querySelector('.trilha-grafo');
  const svg = cont && cont.querySelector('.grafo-arestas');
  if (!svg) return;
  const g = trackGraph(t);
  const base = cont.getBoundingClientRect();
  const L = cont.scrollLeft, T = cont.scrollTop;
  const boxOf = (id) => {
    const el = cont.querySelector('[data-no="' + CSS.escape(id) + '"]');
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
        '<g class="aresta" data-de="' + d + '" data-para="' + node.id + '">' +
          '<title>' + nodeLabel(d, g) + ' → ' + nodeLabel(node.id, g) + '</title>' +
          '<path class="hit" d="' + dd + '"/>' +
          '<path class="linha" d="' + dd + '"/>' +
          '<circle class="ponta" cx="' + x2 + '" cy="' + y2 + '" r="3"/>' +
        '</g>'
      );
    });
  });
  svg.innerHTML = lines.join('');
  updateGraphArrows();
}

/* a node's readable name, for the edge's tooltip */
function nodeLabel(id, g) {
  if (id === '@saida') return txt('chegada');
  const c = courseById(id);
  if (c) return c.nome;
  const node = g.nodes.find((n) => n.id === id);
  return node && node.step ? 'escolha ' + node.step.escolha : id;
}

/* the graph scrolls by arrows, with no scrollbar on show */
function updateGraphArrows() {
  const cx = panelEl.querySelector('.grafo-caixa');
  const scroller = cx && cx.querySelector('.trilha-grafo');
  if (!scroller) return;
  const overflow = scroller.scrollWidth - scroller.clientWidth;
  cx.querySelector('.grafo-seta.esq').disabled = !(overflow > 4 && scroller.scrollLeft > 4);
  cx.querySelector('.grafo-seta.dir').disabled = !(overflow > 4 && scroller.scrollLeft < overflow - 4);
  cx.classList.toggle('sem-setas', overflow <= 4);
  scroller.classList.toggle('fade-dir', overflow > 4 && scroller.scrollLeft < overflow - 4);
  scroller.classList.toggle('fade-esq', overflow > 4 && scroller.scrollLeft > 4);
  // on a narrow screen the graph is a list and scrolls downwards: the fade says there is more
  const overflowY = scroller.scrollHeight - scroller.clientHeight;
  scroller.classList.toggle('fade-baixo', overflowY > 4 && scroller.scrollTop < overflowY - 4);
}

/* A row scrolls when the tabs do not fit: arrows at the ends and a fade showing
   which side still has track. The same function serves both families and the
   catalogue's row of filters. */
function updateRow(box) {
  const scroller = box && box.querySelector('.trilha-abas, .chips');
  if (!scroller) return;
  const overflow = scroller.scrollWidth - scroller.clientWidth;
  const hasLeft = overflow > 4 && scroller.scrollLeft > 4;
  const hasRight = overflow > 4 && scroller.scrollLeft < overflow - 4;
  scroller.classList.toggle('fade-esq', hasLeft);
  scroller.classList.toggle('fade-dir', hasRight);
  const left = box.querySelector('.abas-seta.esq');
  const right = box.querySelector('.abas-seta.dir');
  if (left) left.disabled = !hasLeft;
  if (right) right.disabled = !hasRight;
  box.classList.toggle('sem-setas', overflow <= 4);
}
function updateTabs() {
  FAMILIES.forEach((f) => updateRow(familyBox(f)));
  updateRow($('.chips-caixa'));
}

/* scrolls one "screenful" per click, respecting the available width */
document.addEventListener('click', (e) => {
  const b = e.target.closest('.abas-seta[data-rolar], #chips-esq, #chips-dir');
  if (!b) return;
  const box = b.closest('.abas-caixa, .chips-caixa');
  const scroller = box.querySelector('.trilha-abas, .chips');
  const step = b.id === 'chips-esq' || b.dataset.rolar === '-1' ? -1 : 1;
  scroller.scrollBy({ left: step * Math.max(160, scroller.clientWidth - 80), behavior: reduceMotion ? 'auto' : 'smooth' });
});
document.addEventListener('scroll', (e) => {
  const scroller = e.target;
  if (!scroller.classList || !(scroller.classList.contains('trilha-abas') || scroller.classList.contains('chips'))) return;
  updateRow(scroller.closest('.abas-caixa, .chips-caixa'));
}, true);

function openTrack(i, noAnimation) {
  currentTrack = i;
  // both rows are always on show: it is enough to mark the right tab and bring
  // it into view inside its own row
  let active = null;
  document.querySelectorAll('.trilha-aba').forEach((b) => {
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
    panelEl.classList.remove('trocando');
    panelEl.innerHTML = buildTrack(TRILHAS[i]);
    drawEdges(TRILHAS[i]);
    return;
  }
  panelEl.classList.add('trocando');
  swapT = setTimeout(() => {
    panelEl.innerHTML = buildTrack(TRILHAS[i]);
    panelEl.classList.remove('trocando');
    drawEdges(TRILHAS[i]);
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
  redrawT = setTimeout(() => drawEdges(TRILHAS[currentTrack]), 120);
});
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => drawEdges(TRILHAS[currentTrack]));
}

/* ==========================================================
   CATALOGUE — search + filter by area
   ========================================================== */
const grid = $('#cursos-grade');
const emptyEl = $('#cursos-vazio');
const searchEl = $('#busca');
const chipsEl = $('#chips-cat');
let category = 'todas';

const categories = ['todas', ...new Set(CURSOS.map((c) => c.categoria))];
function buildChips() {
  chipsEl.textContent = '';
  categories.forEach((cat) => {
    const b = document.createElement('button');
    b.className = 'chip' + (cat === category ? ' on' : '');
    b.type = 'button';
    const n = cat === 'todas' ? CURSOS.length : CURSOS.filter((c) => c.categoria === cat).length;
    b.innerHTML = txt(cat) + '<span class="qtd">(' + n + ')</span>';
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
const filterDrop = $('#drop-filtros');
function buildFilterDropdown() {
  const list = $('#drop-filtros-lista');
  list.textContent = '';
  categories.forEach((cat) => {
    const n = cat === 'todas' ? CURSOS.length : CURSOS.filter((c) => c.categoria === cat).length;
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
  const nCurrent = category === 'todas' ? CURSOS.length : CURSOS.filter((c) => c.categoria === category).length;
  filterDrop.querySelector('.drop-atual').textContent = txt(category) + ' (' + nCurrent + ')';
}
buildFilterDropdown();

/* opens/closes, and closes on a click outside — applies to both menus */
function closeDropdowns() {
  document.querySelectorAll('.drop.aberto').forEach((d) => {
    d.classList.remove('aberto');
    d.querySelector('.drop-btn').setAttribute('aria-expanded', 'false');
  });
}
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.drop-btn');
  if (!btn) { if (!e.target.closest('.drop-lista')) closeDropdowns(); return; }
  const d = btn.closest('.drop');
  const opening = !d.classList.contains('aberto');
  closeDropdowns();
  d.classList.toggle('aberto', opening);
  btn.setAttribute('aria-expanded', opening ? 'true' : 'false');
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDropdowns(); });

function buildCatalogue() {
  const term = searchEl.value.trim().toLowerCase();
  const list = CURSOS.filter((c) => {
    const okCat = category === 'todas' || c.categoria === category;
    const okTerm =
      !term ||
      c.nome.toLowerCase().includes(term) ||
      c.resumo.toLowerCase().includes(term) ||
      c.ementa.join(' ').toLowerCase().includes(term) ||
      (c.topicos || []).join(' ').toLowerCase().includes(term);
    return okCat && okTerm;
  });

  grid.innerHTML = list
    .map((c) => {
      const nT = tracksOfCourse(c.id).length;
      return (
        '<button class="curso-card" type="button" data-curso="' + c.id + '">' +
          '<span class="curso-topo"><span class="curso-cat">/' + txt(c.categoria) + '</span>' +
          '<span class="curso-nivel">' + txt(c.nivel) + '</span></span>' +
          '<h3>' + c.nome + '</h3>' +
          '<p>' + c.resumo + '</p>' +
          '<span class="curso-rodape"><span>' + c.horas + ' ' + txt('horas') + '</span>' +
          '<span class="trilhas-qtd">' + (nT ? txt('em') + ' ' + nT + ' ' + txt(nT > 1 ? 'trilhas' : 'trilha') : txt('curso avulso')) + '</span></span>' +
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
  const box = document.querySelector('.busca');
  if (!box) return;
  /* on mobile the search takes the whole line and the dropdown does the
     filtering — nothing to line up, and an inline width would get in the way */
  if (matchMedia('(max-width:700px)').matches) { box.style.width = ''; return; }
  const card = grid.querySelector('.curso-card');
  if (card && card.offsetWidth) box.style.width = card.offsetWidth + 'px';
}
addEventListener('resize', alignSearch);
searchEl.addEventListener('input', buildCatalogue);
buildCatalogue();

/* ==========================================================
   TESTIMONIALS
   ========================================================== */
function buildTestimonials() {
  $('#depos').innerHTML = DEPOIMENTOS.map(
    (d) =>
      '<article class="depo"><span class="depo-aspas" aria-hidden="true">“</span>' +
      '<p>' + d.texto + '</p>' +
      '<span class="depo-autor"><b>' + d.autor + '</b><span>' + d.contexto + '</span></span></article>'
  ).join('');
}
buildTestimonials();

/* ==========================================================
   COURSE MODAL
   ========================================================== */
const modal = $('#modal');
const modalBody = $('#modal-corpo');
const modalFile = $('#modal-arquivo');

/* There are two modals — the course one and the signup one — and the scroll
   lock, the Esc key and touch chaining all need to know which one is open rather
   than assume it is the course one. `openModal()` is what they all consult. */
const MODALS = () => [modal, $('#modal-assinar')];
const openModal = () => MODALS().find((m) => m && !m.hidden) || null;
function closeModals() {
  MODALS().forEach((m) => { if (m) m.hidden = true; });
  document.documentElement.classList.remove('modal-aberto');
}

/* "faz parte de 3 trilhas de carreira" + "e de 2 trilhas de tecnologia"

   The whole sentence is ONE translation key, with `{n}` in place of the number —
   not a prefix plus the noun plus a suffix. Assembling it from pieces works in
   Portuguese, where the qualifier comes after ("trilhas de carreira"), and breaks
   in English, where it comes before ("career tracks"): out came "part of 2 tracks
   career tracks". Word order is something only the whole sentence settles. */
function trackBlock(list, family, continuation) {
  if (!list.length) return '';
  const n = list.length;
  const key = (continuation ? 'e de {n} ' : 'faz parte de {n} ') +
    (n > 1 ? 'trilhas' : 'trilha') + ' de ' + family;
  return '<div class="modal-bloco"><h4>' + txt(key).replace('{n}', n) +
    '</h4><div class="modal-trilhas">' +
    list.map((t) => '<button type="button" data-trilha="' + t.id + '">' + t.nome + ' →</button>').join('') +
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
    return '<div class="modal-video vazio" aria-hidden="true">' +
      '<span class="video-play"></span><span class="video-aviso">' + txt('vídeo em breve') + '</span></div>';
  }
  return '<button type="button" class="modal-video" data-video="' + c.video + '" ' +
    'aria-label="' + txt('assistir à apresentação do curso') + '">' +
    '<img src="https://i.ytimg.com/vi/' + c.video + '/hqdefault.jpg" alt="" loading="lazy" />' +
    '<span class="video-play"></span></button>';
}

function openCourse(id) {
  const c = courseById(id);
  if (!c) return;
  const tracks = tracksOfCourse(id);
  const career = tracks.filter((t) => familyOf(t) === 'carreira');
  const technology = tracks.filter((t) => familyOf(t) === 'tecnologia');
  modalFile.textContent = id + '.curso';
  /* Two columns wherever they fit (see style.css): on the left what convinces —
     what the course is, who speaks about it and the button; on the right what
     details it — syllabus, topics, prerequisites and tracks. In a single column,
     the HTML order is already the right reading order. */
  modalBody.innerHTML =
    '<div class="modal-col modal-col-apresenta">' +
    '<h3 id="modal-titulo">' + c.nome + '</h3>' +
    '<div class="modal-meta">' +
      '<span>' + txt('área') + ': <b>' + txt(c.categoria) + '</b></span>' +
      '<span>' + txt('nível') + ': <b>' + txt(c.nivel) + '</b></span>' +
      '<span>' + txt('carga') + ': <b>' + c.horas + ' ' + txt('horas') + '</b></span>' +
    '</div>' +
    videoBlock(c) +
    '<p>' + c.resumo + '</p>' +
    '<div class="modal-acoes"><button type="button" class="btn btn-primary" data-matricular="' + c.id + '">' +
      txt('Comece agora →') + '</button></div>' +
    '</div>' +
    '<div class="modal-col modal-col-detalhe">' +
    '<div class="modal-bloco"><h4>' + txt('o que você aprende') + '</h4><ul>' +
      c.ementa.map((e) => '<li>' + e + '</li>').join('') +
    '</ul></div>' +
    // the full technical list — collapsed, for whoever wants to check it topic by topic
    (c.topicos && c.topicos.length
      ? '<details class="modal-topicos"><summary>' + txt('conteúdo detalhado') +
        '<span class="qtd">' + c.topicos.length + ' ' + txt('tópicos') + '</span></summary><ul>' +
        c.topicos.map((t) => '<li>' + t + '</li>').join('') +
        '</ul></details>'
      : '') +
    '<div class="modal-bloco"><h4>' + txt('pré-requisitos') + '</h4>' +
      ((c.depende || []).length
        ? '<div class="modal-trilhas pre-req">' +
          c.depende.map((d) => {
            const p = courseById(d);
            return p ? '<button type="button" data-curso="' + p.id + '">← ' + p.nome + '</button>' : '';
          }).join('') + '</div>'
        : '') +
      (c.requisitos ? '<p class="dim">' + c.requisitos + '</p>' : '') +
    '</div>' +
    (unlockedBy(c.id).length
      ? '<div class="modal-bloco"><h4>' + txt('abre caminho para') + '</h4><div class="modal-trilhas">' +
        unlockedBy(c.id).map((p) => '<button type="button" data-curso="' + p.id + '">' + p.nome + ' →</button>').join('') +
        '</div></div>'
      : '') +
    // the two families appear separately: "in 5 tracks" does not say the same
    // thing if 3 are careers and 2 are technologies
    trackBlock(career, 'carreira', false) +
    trackBlock(technology, 'tecnologia', career.length > 0) +
    '</div>';
  modalBody.scrollTop = 0;
  modal.hidden = false;
  /* locks the page underneath: the class cuts the overflow of the document and
     of the current screen, and the wheel and touch handlers stop pushing the
     background. They are the two halves of the same problem — the class handles
     the scrollbar and the inertia, the handlers handle the chaining. */
  document.documentElement.classList.add('modal-aberto');
  fitTopics();
  $('#modal-fechar').focus();
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
  const det = modalBody.querySelector('.modal-topicos');
  const list = det && det.querySelector('ul');
  if (!list) return;
  list.style.maxHeight = '';
  if (!det.open || !matchMedia('(min-width:1024px)').matches) return;
  const col = det.closest('.modal-col-detalhe');
  if (!col) return;
  const overflow = col.scrollHeight - col.clientHeight;
  if (overflow > 0) list.style.maxHeight = Math.max(140, list.clientHeight - overflow) + 'px';
}
addEventListener('resize', fitTopics);
modalBody.addEventListener('toggle', (e) => {
  if (e.target.classList.contains('modal-topicos')) fitTopics();
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
     needs the class — the tab rows' arrows also use `data-rolar`, and with a
     loose selector a click on them scrolled the tabs (handler above) and the
     graph along with them. */
  const scroll = e.target.closest('.grafo-seta[data-rolar]');
  if (scroll) {
    const scroller = panelEl.querySelector('.trilha-grafo');
    if (scroller) scroller.scrollBy({ left: Number(scroll.dataset.rolar) * Math.max(240, scroller.clientWidth - 120), behavior: reduceMotion ? 'auto' : 'smooth' });
    return;
  }

  // a step with a fork: swaps the path without moving from the spot
  const fork = e.target.closest('[data-garfo]');
  if (fork) {
    const t = TRILHAS[currentTrack];
    choices[t.id + ':' + fork.dataset.garfo] = Number(fork.dataset.opcao);
    const scroller = panelEl.querySelector('.trilha-grafo');
    const x = scroller ? scroller.scrollLeft : 0;
    const y = scroller ? scroller.scrollTop : 0;
    panelEl.innerHTML = buildTrack(t);
    const fresh = panelEl.querySelector('.trilha-grafo');
    if (fresh) { fresh.scrollLeft = x; fresh.scrollTop = y; }
    drawEdges(t);
    return;
  }

  // the modal's button: a course is no longer a unit of purchase, so it does not
  // pick a plan — it travels as the origin of the request
  const enrolBtn = e.target.closest('[data-matricular]');
  if (enrolBtn) { openSignup('', enrolBtn.dataset.matricular); return; }

  // the three plan cards' buttons: they carry the chosen plan into the select
  const planBtn = e.target.closest('.plano-btn');
  if (planBtn) {
    e.preventDefault();
    openSignup(planBtn.closest('.plano').querySelector('.plano-nome').textContent.trim());
    return;
  }

  // the video thumbnail: now it does load the player, already playing
  const thumb = e.target.closest('[data-video]');
  if (thumb) {
    const frame = document.createElement('div');
    frame.className = 'modal-video tocando';
    frame.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + thumb.dataset.video +
      '?autoplay=1&rel=0" title="' + txt('apresentação do curso') + '" allowfullscreen ' +
      'allow="accelerometer; autoplay; encrypted-media; picture-in-picture"></iframe>';
    thumb.replaceWith(frame);
    return;
  }

  const target = e.target.closest('[data-curso]');
  if (target) { openCourse(target.dataset.curso); return; }

  // inside the modal: jump to the track mentioned
  const trackBtn = e.target.closest('[data-trilha]');
  if (trackBtn) {
    const i = TRILHAS.findIndex((t) => t.id === trackBtn.dataset.trilha);
    if (i > -1) {
      closeModal();
      openTrack(i, true);
      goTo(screens.findIndex((t) => t.id === 'trilhas'));
    }
    return;
  }

  if (e.target.closest('[data-fechar]')) closeModal();
});

$('#modal-fechar').addEventListener('click', closeModals);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModals(); });
$('#assinar-fechar').addEventListener('click', closeModals);
$('#modal-assinar').addEventListener('click', (e) => {
  if (e.target === $('#modal-assinar')) closeModals();
});
$('#cta-assinar').addEventListener('click', () => openSignup());


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
const planSelect = $('#m-plano');
const plansOnScreen = () =>
  [...document.querySelectorAll('#planos .plano-nome')].map((h) => h.textContent.trim());

function buildPlanSelect() {
  const before = planSelect.value;
  planSelect.innerHTML =
    '<option value="">' + txt('ainda não sei — quero orientação') + '</option>' +
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
const signupModal = $('#modal-assinar');
const signupPlan = $('#assinar-plano');
const planField = $('#campo-plano');

function openSignup(plan, origin) {
  closeModals();
  sourceCourse = origin || '';
  enrolStatus.textContent = '';
  const known = plan && plansOnScreen().includes(plan);
  if (known) {
    $('#assinar-plano-nome').textContent = plan;
    planSelect.value = plan;
  } else {
    planSelect.value = '';
  }
  signupPlan.hidden = !known;
  planField.hidden = !!known;
  signupModal.hidden = false;
  document.documentElement.classList.add('modal-aberto');
  $('#assinar-fechar').focus();
}

const enrolForm = $('#form-matricula');
const enrolStatus = $('#form-status');

/* ---------- the field accepts a whatsapp number OR an e-mail ----------
   As long as what has been typed could be a phone number, the mask applies by
   itself: (45) 90000-0000 for a nine-digit mobile, (45) 0000-0000 for a
   landline. The moment a letter or an @ shows up, the mask comes undone and the
   field goes back to being free text — otherwise "123abc@..." would turn into
   "(12) 3abc@...". An international number (starting with +) also stays intact. */
const contactEl = $('#m-contato');
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
  const name = $('#m-nome').value.trim();
  const contact = $('#m-contato').value.trim();
  if (!name || !contact) {
    enrolStatus.textContent = '✗ preencha nome e contato';
    return;
  }
  const data = {
    nome: name,
    contato: contact,
    plano: planSelect.value || 'sem preferência',
  };
  if (sourceCourse) data.origem = 'curso:' + sourceCourse;
  if (!ENROL_URL) {
    enrolStatus.textContent = '✓ pedido registrado — ' + name + ' (modo demonstração: configure ENROL_URL)';
    enrolForm.reset();
    return;
  }
  enrolStatus.textContent = '… enviando';
  fetch(ENROL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
    .then(() => {
      enrolStatus.textContent = '✓ recebemos seu contato — falaremos com você em breve!';
      enrolForm.reset();
    })
    .catch(() => {
      enrolStatus.textContent = '✗ falha ao enviar — escreva para contact@codeschool.ing';
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
    newsStatus.textContent = '✗ informe um e-mail válido';
    return;
  }
  if (!NEWSLETTER_URL) {
    newsStatus.textContent = '✓ inscrição registrada — ' + email + ' (modo demonstração)';
    newsForm.reset();
    return;
  }
  newsStatus.textContent = '… enviando';
  const data = new FormData();
  data.append('EMAIL', email);
  fetch(NEWSLETTER_URL, { method: 'POST', mode: 'no-cors', body: data })
    .then(() => {
      newsStatus.textContent = '✓ inscrição confirmada — bem-vindo(a) a bordo!';
      newsForm.reset();
    })
    .catch(() => {
      newsStatus.textContent = '✗ falha ao enviar — tente novamente em instantes';
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
  b.setAttribute('aria-label', 'Ir para a seção ' + (i + 1));
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
function atEdge(screen, dir) {
  if (screen.scrollHeight <= screen.clientHeight + 4) return true;
  return dir > 0
    ? screen.scrollTop + screen.clientHeight >= screen.scrollHeight - 4
    : screen.scrollTop <= 4;
}

/* hovering a course lights up the edges arriving at it and leaving it */
panelEl.addEventListener('mouseover', (e) => {
  const node = e.target.closest('[data-no]');
  if (!node) return;
  const id = node.dataset.no;
  panelEl.querySelectorAll('.aresta').forEach((a) => {
    a.classList.toggle('on', a.dataset.de === id || a.dataset.para === id);
  });
});
panelEl.addEventListener('mouseout', (e) => {
  if (e.target.closest('[data-no]')) panelEl.querySelectorAll('.aresta.on').forEach((a) => a.classList.remove('on'));
});

/* the graph tells the arrows when it is dragged directly */
panelEl.addEventListener('scroll', (e) => {
  if (e.target.classList && e.target.classList.contains('trilha-grafo')) updateGraphArrows();
}, true);

/* panels with their own scrolling (catalogue, track on mobile, testimonials) */
function innerScrollable(target, dir, screen) {
  let el = target instanceof Element ? target : null;
  while (el && el !== screen && el !== document.body) {
    if (el.scrollHeight > el.clientHeight + 4) {
      const can = dir > 0
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
  const dir = e.deltaY > 0 ? 1 : -1;
  const screen = screens[current];
  const inner = innerScrollable(e.target, dir, screen);
  if (inner) { inner.scrollTop += e.deltaY; return; }
  if (!atEdge(screen, dir)) { screen.scrollTop += e.deltaY; return; }
  if (Math.abs(e.deltaY) < 8) return;
  goTo(current + dir);
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
  } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && screens[current].id === 'trilhas') {
    e.preventDefault();
    // the arrows move within the open track's family, not through the whole list
    const ofFamily = indicesOfFamily(familyOf(TRILHAS[currentTrack]));
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
  const dir = touchY - e.touches[0].clientY > 0 ? 1 : -1;
  if (innerScrollable(touchTarget, dir, screens[current])) return;
  if (touchTarget instanceof Element && touchTarget.closest('.trilha-fluxo')) return;
  if (atEdge(screens[current], dir)) e.preventDefault();
}, { passive: false });
window.addEventListener('touchend', (e) => {
  if (touchY === null || openModal()) return;
  const delta = touchY - e.changedTouches[0].clientY;
  const target = touchTarget;
  touchY = null;
  touchTarget = null;
  if (locked || Math.abs(delta) < 50) return;
  const dir = delta > 0 ? 1 : -1;
  if (innerScrollable(target, dir, screens[current])) return;
  if (atEdge(screens[current], dir)) goTo(current + dir);
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

/* an anchor in the URL on load (e.g. /#cursos) */
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

const langBox = $('#idioma');
langBox.querySelector('.idioma-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  const open = langBox.classList.toggle('aberto');
  e.currentTarget.setAttribute('aria-expanded', open ? 'true' : 'false');
});
document.addEventListener('click', (e) => { if (!e.target.closest('#idioma')) closeLanguageMenu(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLanguageMenu(); });

savePtBase();
mapTexts();
applyLanguage();
