/* Every track's graph, rendered, checked for an edge that crosses a card.
 *
 * WHY IT EXISTS. The site draws the prerequisite graph as curves over real card
 * positions, measured after layout. Nothing about that is guaranteed by the CSS:
 * a course moving one level, a track gaining a step, a card growing a line of
 * text — any of them can push a curve through a card it has nothing to do with,
 * and the diff shows none of it. The README claimed this was verified; it was
 * not, by anything that ran. Now it is.
 *
 * WHAT IT CHECKS. For each track, at six viewport sizes — four landscape and
 * two portrait, where the graph flows down instead of right — once per branch of
 * a forked track, and twice over: in the panel and on the whole screen. It samples
 * every drawn edge along its length and fails if a sample lands inside a card
 * that is not one of that edge's two endpoints. Endpoints are excluded because
 * an edge starts and ends on them by construction.
 *
 * Both layouts, because the whole screen is not the same graph made bigger: the
 * levels re-split against a taller box and the cards spread through it. The
 * first thing this caught there was an edge drawn straight through a card, on a
 * track that was clean in the panel at every size.
 *
 * The tolerance is 1px inside the card's box: a curve grazing the border is the
 * design (the detour lane sits 16px out), a curve 2px inside it is a bug.
 *
 * Needs Playwright and Chromium. It is the only thing in the repository that
 * needs a dependency, which is why it is a separate CI job.
 *
 *   npm ci && npx playwright install --with-deps chromium
 *   node tools/graph-test/graph-test.js
 *
 * CHROMIUM_PATH overrides the browser binary, for a machine that already has one
 * and does not want Playwright downloading its own.
 */
const path = require('path');
const { chromium } = require('playwright');

const PAGE = 'file://' + path.join(__dirname, '..', '..', 'index.html');
const SIZES = [
  { w: 1920, h: 950 },
  { w: 1600, h: 900 },
  { w: 1366, h: 768 },
  { w: 1280, h: 800 },
  // portrait monitors: the graph flows down there, which is the same router
  // running in swapped coordinates. An edge that only crosses a card in that
  // layout would be invisible to every landscape size above.
  { w: 1080, h: 1920 },
  { w: 1200, h: 1600 },
];
const SAMPLES = 120;
const TOLERANCE = 1;

(async () => {
  const browser = await chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  let checked = 0, crossings = 0, drawnTotal = 0, directTotal = 0;
  const crookedest = [];

  for (const size of SIZES) {
    const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(PAGE, { waitUntil: 'load' });
    await page.waitForTimeout(400);

    const plan = await page.evaluate(() =>
      TRACKS.map((t, i) => ({
        i,
        id: t.id,
        branches: t.courses.reduce((n, c) => Math.max(n, (c && c.options) ? c.options.length : 1), 1),
      })));

    for (const t of plan) {
      for (let branch = 0; branch < t.branches; branch++) {
       // twice, because the whole screen is a second layout of the same graph:
       // the levels re-split against a taller box and the cards spread through
       // it, so an edge that is clear in the panel is not thereby clear there
       for (const full of [false, true]) {
        const found = await page.evaluate(async ({ i, branch, full, SAMPLES, TOLERANCE }) => {
          const wait = (ms) => new Promise((r) => setTimeout(r, ms));
          openTrack(i, true);
          if (document.body.classList.contains('graph-full') !== full) {
            document.querySelector('.graph-full-toggle').click();
            await wait(60);   // it redraws on the next frame, on the new size
          }
          const tabs = document.querySelectorAll('#track-panel .fork-tab');
          if (tabs.length && tabs[branch]) { tabs[branch].click(); await wait(30); }

          const cont = document.querySelector('#track-panel .track-graph');
          const svg = cont && cont.querySelector('.graph-edges');
          if (!svg) return { edges: 0, hits: [] };
          const base = cont.getBoundingClientRect();
          const L = cont.scrollLeft, T = cont.scrollTop;

          // every card, in the same coordinates the edges are drawn in
          const cards = [...cont.querySelectorAll('[data-node]')].map((el) => {
            const r = el.getBoundingClientRect();
            return {
              id: el.dataset.node,
              x: r.left - base.left + L, y: r.top - base.top + T,
              w: r.width, h: r.height,
            };
          });

          const hits = [];
          // how far the drawn line is from the straight line between its two
          // ends: 1.0 is dead straight, and a graph that gets more crooked
          // shows up here before anyone notices it on the screen
          let drawn = 0, direct = 0;
          const crooked = [];
          const edges = svg.querySelectorAll('.edge');
          edges.forEach((g) => {
            const from = g.dataset.from, to = g.dataset.to;
            const p = g.querySelector('path.row');
            if (!p) return;
            const len = p.getTotalLength();
            if (!len) return;
            const a = p.getPointAtLength(0), z = p.getPointAtLength(len);
            const line = Math.max(1, Math.hypot(z.x - a.x, z.y - a.y));
            drawn += len; direct += line;
            if (len / line > 1.5) crooked.push({ from, to, ratio: +(len / line).toFixed(2) });
            for (let s = 0; s <= SAMPLES; s++) {
              const pt = p.getPointAtLength((len * s) / SAMPLES);
              for (const c of cards) {
                if (c.id === from || c.id === to) continue;
                if (pt.x > c.x + TOLERANCE && pt.x < c.x + c.w - TOLERANCE &&
                    pt.y > c.y + TOLERANCE && pt.y < c.y + c.h - TOLERANCE) {
                  hits.push({ from, to, through: c.id, at: Math.round((s / SAMPLES) * 100) });
                  return; // one report per edge is enough
                }
              }
            }
          });
          return { edges: edges.length, hits, drawn, direct, crooked };
        }, { i: t.i, branch, full, SAMPLES, TOLERANCE });

        checked += found.edges;
        drawnTotal += found.drawn; directTotal += found.direct;
        found.crooked.forEach((c) => crookedest.push({ size: size.w + '×' + size.h, track: t.id, ...c }));
        for (const h of found.hits) {
          console.log('CROSSING: ' + size.w + '×' + size.h + '  ' + t.id +
            (t.branches > 1 ? ' [branch ' + (branch + 1) + ']' : '') +
            (full ? ' [whole screen]' : '') +
            '  ' + h.from + ' → ' + h.to + '  passes through ' + h.through +
            ' at ' + h.at + '% of the curve');
          crossings++;
        }
       }
      }
    }
    await page.evaluate(() => graphFullscreen(false));

    if (errors.length) {
      console.log('PAGE ERROR at ' + size.w + '×' + size.h + ': ' + errors.join(' | '));
      crossings++;
    }
    await ctx.close();
  }

  await browser.close();
  console.log(checked + ' edges sampled at ' + SAMPLES + ' points, across ' + SIZES.length + ' screen sizes');
  console.log('crookedness ' + (drawnTotal / directTotal).toFixed(4) +
    ' — the drawn length over the straight line between the ends, 1.0 being every edge straight');
  if (crookedest.length) {
    crookedest.sort((a, b) => b.ratio - a.ratio);
    console.log(crookedest.length + ' edge' + (crookedest.length > 1 ? 's' : '') + ' over 1.5×:');
    crookedest.slice(0, 6).forEach((c) =>
      console.log('  ' + c.ratio + '×  ' + c.size + '  ' + c.track + '  ' + c.from + ' → ' + c.to));
  }
  console.log(crossings ? crossings + ' crossings' : 'OK — no edge crosses a card it does not belong to');
  if (crossings) process.exit(1);
})();
