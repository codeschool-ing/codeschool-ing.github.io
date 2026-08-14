/* Every course's modal, opened, measured and then clicked.
 *
 * WHY IT EXISTS. The modal is laid out by measurement, not by CSS: the box is a
 * fixed height and two blocks are sized in JavaScript to fill it — the video
 * frame on the left, the topic list on the right. Nothing about that is
 * guaranteed by a stylesheet, and none of it is visible in a diff. A course
 * gaining three topics, a track gaining a chip, a syllabus line wrapping: any of
 * them changes what the arithmetic has to solve.
 *
 * It exists because of a bug that shipped. On five courses — the ones where the
 * right column has less room than the list's floor — clicking "detailed
 * contents" opened the panel and the same pass shut it again in the same frame.
 * NOTHING THREW. The sweep that measured all 122 courses saw nothing, because
 * the opening state was correct and only a real click revealed it: the click
 * worked, and the answer to it undid itself. That is the shape of defect this
 * file is for — the one where the page is not broken, it just does not obey.
 *
 * WHAT IT CHECKS, for all 122 courses at three two-column widths:
 *
 *   one height   every course's box is the same height at a given viewport,
 *                which is the whole point of the fixed height: opening one
 *                course after another must not resize the panel;
 *   no scrollbar neither column overflows on open — the right one especially,
 *                which is what the two measured blocks are there to prevent;
 *   the frame    stays between 4:3 and 2.3:1. Outside that it is not a video
 *                any more, and 3:1 is what it reached before it was pinned;
 *   the toggle   the detailed contents opens when clicked and closes when
 *                clicked again, whichever state it started in.
 *
 * And once at phone width, where none of it applies: no inline height may be
 * left behind on any of the three blocks, because there the page scrolls.
 *
 * It was checked by putting the bug back: with the close rule allowed to run from
 * the toggle again, it reports 10 problems and exits non-zero, naming the five
 * courses. That is the only reason to believe the pass.
 *
 * A column is allowed SLACK pixels of overflow. Browsers round fractional
 * layout, and a column reporting 1px over is rounding, not a scrollbar.
 *
 * Needs Playwright and Chromium, like the graph test, and for the same reason:
 * the numbers only exist once something has laid the page out.
 *
 *   npm ci && npx playwright install --with-deps chromium
 *   node tools/modal-test/modal-test.js
 *
 * CHROMIUM_PATH overrides the browser binary.
 */
const path = require('path');
const { chromium } = require('playwright');

const PAGE = 'file://' + path.join(__dirname, '..', '..', 'index.html');
const SIZES = [
  { w: 1920, h: 950 },
  { w: 1366, h: 768 },
  { w: 1280, h: 800 },
];
const NARROW = { w: 390, h: 844 };
const VIDEO_TALLEST = 4 / 3;   // ratio, width over height
const VIDEO_FLATTEST = 2.3;
const SLACK = 2;

(async () => {
  const browser = await chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const problems = [];
  let opened = 0;

  for (const size of SIZES) {
    const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(PAGE, { waitUntil: 'load' });
    await page.waitForTimeout(400);

    const rows = await page.evaluate(async ({ tallest, flattest }) => {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const out = [];
      for (const c of COURSES) {
        openCourse(c.id);
        await wait(80);
        const box = document.querySelector('.modal-box');
        const intro = document.querySelector('.modal-col-intro');
        const detail = document.querySelector('.modal-col-detail');
        const video = document.querySelector('.modal-video');
        const det = document.querySelector('.modal-topics');
        const v = video.getBoundingClientRect();
        const row = {
          id: c.id,
          box: Math.round(box.getBoundingClientRect().height),
          overIntro: intro.scrollHeight - intro.clientHeight,
          overDetail: detail.scrollHeight - detail.clientHeight,
          ratio: +(v.width / v.height).toFixed(2),
        };
        // the click, twice: it must flip, and flip back
        if (det) {
          const started = det.open;
          det.querySelector('summary').click();
          await wait(70);
          row.afterFirst = det.open;
          det.querySelector('summary').click();
          await wait(70);
          row.afterSecond = det.open;
          row.started = started;
        }
        out.push(row);
        document.querySelector('.modal-close').click();
        await wait(50);
      }
      return out;
    }, { tallest: VIDEO_TALLEST, flattest: VIDEO_FLATTEST });

    opened += rows.length;
    const at = size.w + '×' + size.h;

    const heights = [...new Set(rows.map((r) => r.box))];
    if (heights.length > 1) {
      // name the odd ones out rather than the majority
      const common = heights
        .map((h) => ({ h, n: rows.filter((r) => r.box === h).length }))
        .sort((a, b) => b.n - a.n)[0].h;
      rows.filter((r) => r.box !== common).slice(0, 6).forEach((r) =>
        problems.push(at + '  ' + r.id + '  box is ' + r.box + 'px where every other course is ' + common));
    }

    rows.forEach((r) => {
      if (r.overIntro > SLACK) problems.push(at + '  ' + r.id + '  the left column scrolls by ' + r.overIntro + 'px on open');
      if (r.overDetail > SLACK) problems.push(at + '  ' + r.id + '  the right column scrolls by ' + r.overDetail + 'px on open');
      if (r.ratio < VIDEO_TALLEST - 0.02 || r.ratio > VIDEO_FLATTEST + 0.02) {
        problems.push(at + '  ' + r.id + '  the frame is ' + r.ratio + ':1, outside 1.33–2.30');
      }
      if (r.started !== undefined) {
        if (r.afterFirst === r.started) {
          problems.push(at + '  ' + r.id + '  the detailed contents did not ' +
            (r.started ? 'close' : 'open') + ' when clicked');
        } else if (r.afterSecond !== r.started) {
          problems.push(at + '  ' + r.id + '  the detailed contents did not go back when clicked again');
        }
      }
    });

    errors.forEach((e) => problems.push(at + '  page error: ' + e));
    await ctx.close();
  }

  // one column: the measured heights must not follow the reader down there
  {
    const ctx = await browser.newContext({ viewport: { width: NARROW.w, height: NARROW.h } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(PAGE, { waitUntil: 'load' });
    await page.waitForTimeout(400);
    const left = await page.evaluate(async () => {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const bad = [];
      for (const c of COURSES) {
        openCourse(c.id);
        await wait(50);
        const inline = [
          ['the frame', document.querySelector('.modal-video')],
          ['the syllabus', document.querySelector('.modal-syllabus ul')],
          ['the topic list', document.querySelector('.modal-topics ul')],
        ];
        inline.forEach(([what, el]) => {
          if (el && el.style.height) bad.push(c.id + '  ' + what + ' keeps an inline height (' + el.style.height + ')');
        });
        document.querySelector('.modal-close').click();
        await wait(30);
      }
      return bad;
    });
    left.slice(0, 6).forEach((b) => problems.push(NARROW.w + '×' + NARROW.h + '  ' + b));
    errors.forEach((e) => problems.push(NARROW.w + '×' + NARROW.h + '  page error: ' + e));
    await ctx.close();
  }

  await browser.close();

  console.log(opened + ' modals opened, measured and clicked, across ' + SIZES.length +
    ' two-column sizes, plus one column at ' + NARROW.w + 'px');
  if (problems.length) {
    problems.forEach((p) => console.log('PROBLEM: ' + p));
    console.log('\n' + problems.length + ' problem' + (problems.length > 1 ? 's' : '') + ' — see above');
    process.exit(1);
  }
  console.log('OK — one height per size, no column scrolling on open, and every ' +
    'detailed contents opens and closes when clicked');
})();
