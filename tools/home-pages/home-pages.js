/* The front page, once per language, at an address of its own.
 *
 * `tools/pages/pages.js` gave every COURSE an address in five languages. This
 * gives the front page the same, which is what makes `index.html`'s `hreflang`
 * able to say anything: an alternate has to point at a page that exists.
 *
 *     /            English — this file does not write it; index.html is it
 *     /pt/ /es/ /fr/ /it/     the four translations
 *
 * # THE TRANSLATION IS THE SITE'S OWN, BECAUSE A SECOND ONE WOULD DIVERGE
 *
 * `assets/i18n-runtime.js` translates by walking the DOM and replacing the text
 * of every leaf, keyed by the English string. Reimplementing that walk here
 * would be a second implementation of the only thing that matters, and the two
 * would disagree on the first edge case — a heading with a `<strong>` inside it,
 * an attribute nobody remembered.
 *
 * So the page is rendered in a real browser, with the language set before a
 * script runs, and the DOM the SITE produced is what gets written out. There is
 * no second translator to keep in step, which is the same argument
 * `tools/graph-test` makes for measuring a layout instead of computing one.
 *
 * # WHAT IS PUT BACK BEFORE IT IS SAVED
 *
 * Eleven containers on this page are built by JavaScript from the catalogue —
 * the course grid, the track panel, the quotes. Serialising them would put the
 * whole catalogue into every language's front page, four times, to be thrown
 * away and rebuilt by the same script on load. So each is restored to what
 * `index.html` has, from `index.html`, and the page stays the size of the page.
 *
 * The list is `i18n-runtime.js`'s `DYNAMIC` and is checked against it rather
 * than copied and hoped for: a container added there and not here would be
 * frozen into four files in whatever language they were generated in.
 *
 *     node tools/home-pages/home-pages.js            # write them
 *     node tools/home-pages/home-pages.js --check    # fail if they differ
 */
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const ORIGIN = 'https://codeschool.ing';
const ROOT = path.join(__dirname, '..', '..');

/* English is `index.html` at the root and is not written by this tool: the
   domain's own address is the English page, which is where every existing link
   and every published anchor already points. */
const LANGUAGES = [
  { code: 'en', html: 'en', at: '/' },
  { code: 'pt', html: 'pt-BR', at: '/pt/' },
  { code: 'es', html: 'es', at: '/es/' },
  { code: 'fr', html: 'fr', at: '/fr/' },
  { code: 'it', html: 'it', at: '/it/' },
];
const TRANSLATED = LANGUAGES.filter((l) => l.code !== 'en');

/* Mirrors `DYNAMIC` in assets/i18n-runtime.js. `sameAsTheRuntime` below fails
   if it stops mirroring it. */
const DYNAMIC = [
  '#track-panel', '#courses-grid', '#chips-category', '#modal-body',
  '#tabs-career', '#tabs-technology', '#quotes', '#m-interest',
  '#drop-tracks-list', '#drop-filters-list', '.drop-current',
];

function sameAsTheRuntime() {
  const src = fs.readFileSync(path.join(ROOT, 'assets', 'i18n-runtime.js'), 'utf8');
  const block = src.match(/const DYNAMIC = window\.I18N_DYNAMIC \|\| \[([\s\S]*?)\];/);
  if (!block) throw new Error('assets/i18n-runtime.js no longer declares DYNAMIC the way this reads it');
  const theirs = [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  const missing = theirs.filter((s) => !DYNAMIC.includes(s));
  const extra = DYNAMIC.filter((s) => !theirs.includes(s));
  if (missing.length || extra.length) {
    throw new Error('DYNAMIC has drifted from assets/i18n-runtime.js: ' +
      [missing.length ? 'missing ' + missing.join(' ') : '',
        extra.length ? 'not there any more ' + extra.join(' ') : ''].filter(Boolean).join('; '));
  }
}

/* A static server over the working tree. `file://` would do for the HTML and
   not for `localStorage`, which is what pins the language, and not for the
   absolute asset paths the generated pages use. */
function serve(dir) {
  const types = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.xml': 'application/xml',
  };
  const server = http.createServer((req, res) => {
    let rel = decodeURIComponent(req.url.split('?')[0]);
    if (rel.endsWith('/')) rel += 'index.html';
    const full = path.join(dir, path.normalize(rel));
    if (!full.startsWith(dir)) { res.writeHead(403).end(); return; }
    fs.readFile(full, (err, body) => {
      if (err) { res.writeHead(404).end(); return; }
      res.writeHead(200, { 'Content-Type': types[path.extname(full)] || 'application/octet-stream' });
      res.end(body);
    });
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

/* What goes in the head of a translated page, replacing what the English one
   carries. Every page names all five alternates, itself included; `x-default`
   is the English page, which is the one to send somebody whose language is not
   among them. */
function head(lang) {
  const alt = LANGUAGES.map((l) =>
    `<link rel="alternate" hreflang="${l.html}" href="${ORIGIN}${l.at}" />`).join('\n');
  return `<link rel="canonical" href="${ORIGIN}${lang.at}" />
${alt}
<link rel="alternate" hreflang="x-default" href="${ORIGIN}/" />`;
}

/* THE LANGUAGE IS PINNED BEFORE A SCRIPT RUNS, and the page's own runtime does
   the rest. It reads `codeschool-language` from `localStorage` and prefers it
   over browser detection, so writing it here is asking the site for this
   language rather than overriding it — which is also why the visitor keeps it:
   somebody who opened /pt/ has chosen Portuguese as surely as if they had used
   the picker. */
const pin = (code) => `<script>try{localStorage.setItem('codeschool-language','${code}')}catch(e){}</script>`;

/* THE PICKER IS NOT INJECTED HERE, and it used to be. It has to MOVE between
   the five addresses rather than rewrite the words in place, and that is now in
   `index.html` itself — so it arrives in these four the way every other line of
   the page does, by being rendered. One copy, in the file the site serves, with
   its own reason written beside it.

   It also stands down off a server, which only the copy in `index.html` can
   know to do: `showcase.html` is this page inlined into one file and opened
   from a disk, where /pt/ is not a place. */

async function render(port, lang) {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
  try {
    const page = await browser.newPage();
    await page.addInitScript((code) => {
      try { localStorage.setItem('codeschool-language', code); } catch (e) { /* private mode */ }
    }, lang.code);
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });
    await page.waitForTimeout(900);

    // the containers the script builds, back to what the source file has
    await page.evaluate(async (selectors) => {
      const source = new DOMParser().parseFromString(
        await (await fetch('/index.html')).text(), 'text/html');
      for (const s of selectors) {
        const here = document.querySelectorAll(s);
        const there = source.querySelectorAll(s);
        here.forEach((el, i) => { if (there[i]) el.innerHTML = there[i].innerHTML; });
      }
    }, DYNAMIC);

    /* The page's own words for the card. See `dress`.

       `innerText` and not `textContent`: the heading is broken across lines
       with markup inside it, and concatenating the text nodes closed the gap —
       the first card read "no seu ritmo,com a trilha", with the comma against
       the next word. innerText renders the break as a newline, which collapses
       to the space that was always there on screen. */
    const hero = await page.evaluate(() => {
      const h = document.querySelector('h1');
      return h ? h.innerText.replace(/\s+/g, ' ').trim() : '';
    });
    const html = await page.evaluate(() => '<!DOCTYPE html>\n' + document.documentElement.outerHTML);
    return { html, hero };
  } finally {
    await browser.close();
  }
}

function dress({ html, hero }, lang) {
  let out = html;

  // the assets are one directory further down now, so every relative path goes
  // absolute — the alternative is ../ everywhere and a page that only works at
  // one depth.
  out = out.replace(/(src|href)="assets\//g, '$1="/assets/');

  // the anchors the README calls published: they are this page's own sections,
  // and a bare # is already relative to wherever the page is.
  out = out.replace(/<html lang="[^"]*"/, `<html lang="${lang.html}"`);

  /* EVERY ALTERNATE THE RENDERED PAGE CARRIES GOES FIRST, and this line is the
     whole reason the check below exists. index.html grew its own five when the
     translated pages started existing, and they arrive here by being rendered —
     so inserting this page's six beside them left eleven, two of them saying
     the same thing about the same language in two spellings. A page with a
     contradictory alternate set is not half-indexed; the set is discarded. */
  out = out.replace(/\s*<link rel="alternate" hreflang="[^"]*"[^>]*>/g, '');

  const canonical = head(lang);
  out = out.replace(/<link rel="canonical"[^>]*>/, canonical);
  out = out.replace(/<meta property="og:url" content="[^"]*"/, `<meta property="og:url" content="${ORIGIN}${lang.at}"`);
  out = out.replace(/<meta property="og:locale" content="[^"]*"/, `<meta property="og:locale" content="${lang.html.replace('-', '_')}"`);
  out = out.replace(/<meta property="og:locale:alternate" content="[^"]*" ?\/?>\n?/g, '');
  out = out.replace(/<meta property="og:locale"([^>]*)>/, (m) => m + '\n' +
    LANGUAGES.filter((l) => l.code !== lang.code)
      .map((l) => `<meta property="og:locale:alternate" content="${l.html.replace('-', '_')}">`).join('\n'));

  /* THE CARD HAS TO BE IN THE PAGE'S LANGUAGE, and it was not. The runtime
     translates `<meta name="description">` along with everything else, and it
     does not touch the `og:` and `twitter:` ones — so a Portuguese page was
     advertising itself in English wherever somebody pasted the link.

     Both are taken from the page rather than invented: the description it
     already carries, translated, and its own H1, which is the sentence this
     site chose to open with. `index.html` keeps the English pair somebody
     wrote by hand; it is a file a person edits, and these four are not. */
  const described = (out.match(/<meta name="description" content="([^"]*)"/) || [, ''])[1];
  const title = hero || described;
  for (const [what, value] of [['og:title', title], ['og:description', described]]) {
    out = out.replace(new RegExp(`(<meta property="${what}" content=")[^"]*"`), `$1${value.replace(/\$/g, '$$$$')}"`);
  }
  for (const [what, value] of [['twitter:title', title], ['twitter:description', described]]) {
    out = out.replace(new RegExp(`(<meta name="${what}" content=")[^"]*"`), `$1${value.replace(/\$/g, '$$$$')}"`);
  }

  out = out.replace('</head>', pin(lang.code) + '\n</head>');
  return out;
}

(async () => {
  sameAsTheRuntime();

  const server = await serve(ROOT);
  const { port } = server.address();
  const files = new Map();
  try {
    for (const lang of TRANSLATED) {
      files.set(path.join(lang.code, 'index.html'), dress(await render(port, lang), lang));
    }
  } finally {
    server.close();
  }

  const checking = process.argv.includes('--check');
  let wrong = 0;
  for (const [rel, body] of files) {
    const full = path.join(ROOT, rel);
    if (checking) {
      let have = null;
      try { have = fs.readFileSync(full, 'utf8'); } catch { /* missing */ }
      if (have !== body) {
        console.log(have === null ? `missing: ${rel}` : `differs from the generator: ${rel}`);
        wrong += 1;
      }
      continue;
    }
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, body);
  }

  if (checking && wrong) {
    console.log(`\n${wrong} front page(s) are not what tools/home-pages/home-pages.js produces`);
    process.exit(1);
  }
  console.log(`${files.size} translated front pages, rendered by the site's own runtime` +
    (checking ? ' — all as committed' : ''));
})();
