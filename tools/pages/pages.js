/* One address per course, per language — the pages a search engine can find.
 *
 * WHY IT EXISTS. This site is one HTML file in five languages. The language is
 * chosen in the browser and kept in `localStorage`, so every visitor, in every
 * language, is at the SAME address — and a search engine indexes one page, in
 * English, because English is what the file says. The four translations are
 * complete, and none of them was reachable from a search.
 *
 * The catalogue is the other half. 148 courses live inside `assets/catalog.js`
 * and are drawn into one grid on one page: a name, a summary, a syllabus of
 * five to seven lines and the full topic list, for each of them, in five
 * languages — real page content with no page to be on.
 *
 * So this writes one:
 *
 *     /en/course/<id>.html   /pt/course/<id>.html   /es/… /fr/… /it/…
 *     robots.txt
 *     sitemap.xml
 *
 * FROM THE SAME FILES THE BROWSER LOADS, evaluated the way the browser
 * evaluates them — `validate-i18n.js`'s idiom, and for its reason. Parsing
 * `catalog.js` with a regular expression would be a second reader of it, and a
 * second reader drifts.
 *
 * THE OUTPUT IS COMMITTED, because Pages serves the branch as it is and there
 * is no build step to run on the way out. That makes drift possible, so
 * `--check` re-generates into memory and fails on any difference — the same
 * trade `.github/workflows/release.yml` makes with the version.
 *
 *     node tools/pages/pages.js            # write them
 *     node tools/pages/pages.js --check    # fail if what is committed differs
 */
const fs = require('fs');
const path = require('path');

/* THE ONE PLACE THE ADDRESS IS WRITTEN. Every canonical, every alternate and
   every line of the sitemap is built from it, and a canonical pointing at a
   host that does not serve the page is worse than no canonical at all: it asks
   the search engine to index somewhere else. */
const ORIGIN = 'https://codeschool.ing';

/* `html` is what goes in `<html lang>` and in `hreflang`; `code` is the key the
   dictionaries use. They differ for Portuguese and the difference is the point
   of having both. The list is `i18n-runtime.js`'s, in its order. */
const LANGUAGES = [
  { code: 'en', html: 'en', label: 'English', short: 'EN' },
  { code: 'pt', html: 'pt-BR', label: 'Português', short: 'PT' },
  { code: 'es', html: 'es', label: 'Español', short: 'ES' },
  { code: 'fr', html: 'fr', label: 'Français', short: 'FR' },
  { code: 'it', html: 'it', label: 'Italiano', short: 'IT' },
];

const ROOT = path.join(__dirname, '..', '..');
const assets = (f) => fs.readFileSync(path.join(ROOT, 'assets', f), 'utf8');

const { COURSES, TRACKS } = new Function(assets('catalog.js') + '; return {COURSES, TRACKS};')();

global.window = { I18N: {} };
for (const lang of LANGUAGES) {
  if (lang.code !== 'en') eval(assets('i18n-courses-' + lang.code + '.js'));
}
/* English has no dictionary and needs none: the catalogue IS English, and a
   missing entry falls back to the source. `i18n-runtime.js` says the same. */
const dictionary = (code) => (global.window.I18N[code] || {}).courses || {};

/* The interface strings these pages use. They are few and they are here rather
   than in `assets/i18n.js` because that file is the PAGE's dictionary, walked
   over the page's own DOM; these pages have no DOM to walk and are written, not
   translated at runtime. Anything a course page says that the site also says is
   worth saying the same way — so these are copied from there when they exist. */
const WORDS = {
  en: { hours: 'hours', level: 'Level', syllabus: 'What you will learn', topics: 'Full topic list', tracks: 'Part of these tracks', start: 'Start now', catalog: 'See the whole catalogue', prereq: 'What you need first', beginner: 'beginner', intermediate: 'intermediate', advanced: 'advanced', course: 'Course' },
  pt: { hours: 'horas', level: 'Nível', syllabus: 'O que você vai aprender', topics: 'Lista completa de tópicos', tracks: 'Faz parte destas trilhas', start: 'Começar agora', catalog: 'Ver o catálogo inteiro', prereq: 'O que você precisa antes', beginner: 'iniciante', intermediate: 'intermediário', advanced: 'avançado', course: 'Curso' },
  es: { hours: 'horas', level: 'Nivel', syllabus: 'Lo que vas a aprender', topics: 'Lista completa de temas', tracks: 'Forma parte de estas rutas', start: 'Empezar ahora', catalog: 'Ver el catálogo completo', prereq: 'Lo que necesitas antes', beginner: 'principiante', intermediate: 'intermedio', advanced: 'avanzado', course: 'Curso' },
  fr: { hours: 'heures', level: 'Niveau', syllabus: 'Ce que vous allez apprendre', topics: 'Liste complète des sujets', tracks: 'Fait partie de ces parcours', start: 'Commencer maintenant', catalog: 'Voir tout le catalogue', prereq: 'Ce qu’il vous faut d’abord', beginner: 'débutant', intermediate: 'intermédiaire', advanced: 'avancé', course: 'Cours' },
  it: { hours: 'ore', level: 'Livello', syllabus: 'Cosa imparerai', topics: 'Elenco completo degli argomenti', tracks: 'Fa parte di questi percorsi', start: 'Inizia ora', catalog: 'Vedi tutto il catalogo', prereq: 'Cosa ti serve prima', beginner: 'principiante', intermediate: 'intermedio', advanced: 'avanzato', course: 'Corso' },
};

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/* A course as one language sees it: the translation where there is one, the
   English source where there is not. Falling back per FIELD and not per course
   is what the runtime does, and a half-translated course should show the half
   that exists rather than none of it. */
function localised(course, code) {
  const t = dictionary(code)[course.id] || {};
  return {
    ...course,
    name: t.name || course.name,
    summary: t.summary || course.summary,
    syllabus: t.syllabus && t.syllabus.length ? t.syllabus : course.syllabus,
    topics: t.topics && t.topics.length ? t.topics : course.topics,
    prerequisites: t.prerequisites || course.prerequisites,
  };
}

const trackName = (track, code) => {
  const t = ((global.window.I18N[code] || {}).tracks || {})[track.id] || {};
  return t.name || track.name;
};

/* Which tracks a course appears in. A track's `courses` holds ids and forking
   steps — an object with `options` — so both shapes are looked into. */
function tracksWith(id) {
  return TRACKS.filter((t) => (t.courses || []).some((item) =>
    item === id || (item && Array.isArray(item.options) && item.options.includes(id))));
}

const url = (code, id) => `${ORIGIN}/${code}/course/${id}.html`;

/* THE ALTERNATES ARE THE POINT OF THE WHOLE FILE, so they are complete and they
   are on every one of the five: each page names all five, itself included, plus
   `x-default`. Naming only the others is the common way to get this wrong, and
   a set of pages that disagree about who is in the set is ignored wholesale. */
function alternates(id) {
  const rows = LANGUAGES.map((l) =>
    `<link rel="alternate" hreflang="${l.html}" href="${url(l.code, id)}" />`);
  rows.push(`<link rel="alternate" hreflang="x-default" href="${url('en', id)}" />`);
  return rows.join('\n');
}

/* schema.org, which is what turns a page into a course in a result rather than
   a blue line. `provider` is the school; `offers` is deliberately absent, as
   the price is not this file's to state and a wrong one is a complaint. */
function jsonLd(course, code, words) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.name,
    description: course.summary,
    inLanguage: LANGUAGES.find((l) => l.code === code).html,
    url: url(code, course.id),
    provider: { '@type': 'EducationalOrganization', name: 'codeschool.ing', url: ORIGIN + '/' },
    educationalLevel: words[course.level] || course.level,
    timeRequired: `PT${course.hours}H`,
    teaches: (course.syllabus || []).slice(0, 12),
  }, null, 2);
}

function page(course, code) {
  const words = WORDS[code];
  const lang = LANGUAGES.find((l) => l.code === code);
  const c = localised(course, code);
  const tracks = tracksWith(course.id);
  const list = (items) => (items || []).map((i) => `      <li>${esc(i)}</li>`).join('\n');

  return `<!DOCTYPE html>
<html lang="${lang.html}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(c.name)} — codeschool.ing</title>
<meta name="description" content="${esc(c.summary)}" />
<link rel="canonical" href="${url(code, course.id)}" />
${alternates(course.id)}
<meta property="og:type" content="website" />
<meta property="og:site_name" content="codeschool.ing" />
<meta property="og:title" content="${esc(c.name)}" />
<meta property="og:description" content="${esc(c.summary)}" />
<meta property="og:url" content="${url(code, course.id)}" />
<meta property="og:locale" content="${lang.html.replace('-', '_')}" />
${LANGUAGES.filter((l) => l.code !== code)
  .map((l) => `<meta property="og:locale:alternate" content="${l.html.replace('-', '_')}" />`).join('\n')}
<meta name="twitter:card" content="summary" />
<meta name="twitter:title" content="${esc(c.name)}" />
<meta name="twitter:description" content="${esc(c.summary)}" />
<link rel="icon" type="image/svg+xml" href="/assets/favicon.svg" />
<script>try{if(localStorage.getItem('codeschool-theme')==='light')document.documentElement.dataset.theme='light'}catch(e){}</script>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="/assets/style.css" />
<link rel="stylesheet" media="print" onload="this.media='all'" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600&family=IBM+Plex+Mono:wght@400&family=Space+Grotesk:wght@700&display=swap" />
<style>
  /* assets/style.css is this site's, and three repositories carry it byte for
     byte, so nothing here edits it and everything here works around it. Two of
     its four bare element rules reach this page: nav{position:fixed}, which is
     why the language row is a div carrying the role rather than a nav element,
     and a{color:inherit;text-decoration:none}, which would leave every link on
     a page of prose looking exactly like the prose.
     (No backticks in here: this comment lives inside a template literal, and
     the first draft of it closed the string four words in.) */
  .sheet{max-width:820px;margin:0 auto;padding:32px 16px 64px}
  /* :not(.btn), rather than a .sheet a.btn rule after it. A class inside a class
     beats a lone class, so .sheet a was overriding .btn-primary's colour and
     painting the button's label in the button's own background: it rendered as
     a blue rectangle with nothing written on it. */
  .sheet a:not(.btn){color:var(--phosphor);text-decoration:underline;text-underline-offset:2px}
  .sheet h1{font-family:'Space Grotesk',sans-serif;font-size:1.9rem;line-height:1.2;margin:.2em 0}
  .sheet h2{font-size:1.15rem;margin:2em 0 .6em;color:var(--phosphor)}
  .sheet ul{padding-left:1.2em}
  .sheet li{margin:.35em 0}
  .facts{display:flex;flex-wrap:wrap;gap:8px;margin:1em 0;list-style:none;padding:0}
  .facts li{border:1px solid var(--wire);border-radius:3px;padding:3px 10px;font-size:.85rem;color:var(--paper-dim)}
  .langs{display:flex;flex-wrap:wrap;gap:10px;font-size:.85rem;margin:0 0 1.5em}
  .langs a{color:var(--paper-dim);text-decoration:none}
  .langs a:hover{color:var(--phosphor)}
  .langs a[aria-current]{color:var(--paper);font-weight:600;text-decoration:none}
  .lede{font-size:1.1rem;color:var(--paper)}
  .go{display:inline-block;margin:2em 1em 0 0}
</style>
</head>
<body>
<main class="sheet">
  <div class="langs" role="navigation" aria-label="Language">
${LANGUAGES.map((l) => `    <a href="/${l.code}/course/${course.id}.html" hreflang="${l.html}" lang="${l.html}"${l.code === code ? ' aria-current="true"' : ''}>${esc(l.label)}</a>`).join('\n')}
  </div>

  <p class="mono" style="color:var(--paper-dim);margin:0">${esc(words.course)}</p>
  <h1>${esc(c.name)}</h1>
  <p class="lede">${esc(c.summary)}</p>

  <ul class="facts">
    <li>${c.hours} ${esc(words.hours)}</li>
    <li>${esc(words.level)}: ${esc(words[c.level] || c.level)}</li>
  </ul>
${c.prerequisites ? `
  <h2>${esc(words.prereq)}</h2>
  <p>${esc(c.prerequisites)}</p>
` : ''}
  <h2>${esc(words.syllabus)}</h2>
  <ul>
${list(c.syllabus)}
  </ul>
${(c.topics || []).length ? `
  <h2>${esc(words.topics)}</h2>
  <ul>
${list(c.topics)}
  </ul>
` : ''}${tracks.length ? `
  <h2>${esc(words.tracks)}</h2>
  <ul>
${tracks.map((t) => `      <li>${esc(trackName(t, code))}</li>`).join('\n')}
  </ul>
` : ''}
  <p>
    <a class="btn btn-primary go" href="https://app.codeschool.ing">${esc(words.start)}</a>
    <a class="go" href="/#courses">${esc(words.catalog)}</a>
  </p>
</main>
<script type="application/ld+json">
${jsonLd(c, code, WORDS[code])}
</script>
</body>
</html>
`;
}

/* Everything this run would write, as path -> contents. Building the whole set
   in memory first is what lets `--check` compare without touching the tree. */
function everything() {
  const files = new Map();
  for (const lang of LANGUAGES) {
    for (const course of COURSES) {
      files.set(path.join(lang.code, 'course', course.id + '.html'), page(course, lang.code));
    }
  }

  /* The sitemap carries the alternates too, which is the half people leave out:
     a search engine that finds one language from a link learns about the other
     four here, without having to fetch them first. */
  const entries = COURSES.flatMap((course) => LANGUAGES.map((lang) => [
    '  <url>',
    `    <loc>${url(lang.code, course.id)}</loc>`,
    ...LANGUAGES.map((l) =>
      `    <xhtml:link rel="alternate" hreflang="${l.html}" href="${url(l.code, course.id)}"/>`),
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${url('en', course.id)}"/>`,
    '  </url>',
  ].join('\n')));

  files.set('sitemap.xml', [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    '  <url>',
    `    <loc>${ORIGIN}/</loc>`,
    '  </url>',
    ...entries,
    '</urlset>',
    '',
  ].join('\n'));

  files.set('robots.txt', [
    '# Everything here is meant to be found; the student area is not, and is',
    '# not served from this host. See sitemap.xml for what there is.',
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${ORIGIN}/sitemap.xml`,
    '',
  ].join('\n'));

  return files;
}

const files = everything();
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
  console.log(`\n${wrong} file(s) are not what tools/pages/pages.js produces — run it and commit`);
  process.exit(1);
}
console.log(`${files.size} files: ${COURSES.length} courses in ${LANGUAGES.length} languages, a sitemap and a robots.txt` +
  (checking ? ' — all as committed' : ''));
