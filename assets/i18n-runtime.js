/* ==========================================================================
   codeschool.ing — internationalisation (en · pt-BR · es · fr · it)

   THE KEY IS THE ENGLISH STRING. English is the source language, so it needs no
   dictionary and has none: any string with no entry falls back to the key, and
   the key is already what to show. Portuguese used to be the base and needed no
   dictionary for the same reason; it is the fifth translation now, in
   assets/i18n-pt.js and assets/i18n-courses-pt.js.

   The dictionaries live in window.I18N: the interface in assets/i18n.js and
   assets/i18n-pt.js, the catalogue one file per language.

   Detection: it uses `navigator.languages`, which is the LANGUAGE configured in
   the browser — not geolocation. That is the right signal: a Brazilian browsing
   from abroad still wants Portuguese, and it asks the user for no permission.

   This file is kept syncable with codeschool-ing/portal-frontend's copy. The
   documented divergence is `DYNAMIC`: there it comes from `window.I18N_DYNAMIC`
   because nearly the whole portal page is built by JavaScript; here the list is
   eleven containers in otherwise static HTML, so it stays in the code — and the
   page may still override it.
   ========================================================================== */

const LANGUAGES = [
  { code: 'en', html: 'en',    label: 'English',    short: 'EN' },
  { code: 'pt', html: 'pt-BR', label: 'Português',  short: 'PT' },
  { code: 'es', html: 'es',    label: 'Español',    short: 'ES' },
  { code: 'fr', html: 'fr',    label: 'Français',   short: 'FR' },
  { code: 'it', html: 'it',    label: 'Italiano',   short: 'IT' },
];
const LANG_KEY = 'codeschool-language';
const LANG_KEY_LEGACY = 'codeschool-idioma';   // what the key was called before the rename

function browserLanguage() {
  const list = (navigator.languages && navigator.languages.length)
    ? navigator.languages : [navigator.language || 'en'];
  for (const l of list) {
    const base = String(l).toLowerCase().split('-')[0];
    if (LANGUAGES.some((i) => i.code === base)) return base;
  }
  return 'en';
}

/* A visitor who had already picked a language stored it under the old key. Read
   it, move it, and forget the old name — otherwise the rename silently resets
   everyone to browser detection, which for most of them means a different
   language than the one they chose. */
let LANG = (() => {
  try {
    let saved = localStorage.getItem(LANG_KEY);
    if (!saved) {
      saved = localStorage.getItem(LANG_KEY_LEGACY);
      if (saved) {
        localStorage.setItem(LANG_KEY, saved);
        localStorage.removeItem(LANG_KEY_LEGACY);
      }
    }
    if (saved && LANGUAGES.some((i) => i.code === saved)) return saved;
  } catch (e) { /* private mode: fall back to detection */ }
  return browserLanguage();
})();

/* translation of one interface string; with no entry, it returns the key, which is already English */
function txt(s) {
  const d = window.I18N && window.I18N[LANG] && window.I18N[LANG].ui;
  return (d && d[s]) || s;
}

/* ---------- the page's static text ----------
   A single walk of the DOM stores the original text of every leaf element.
   Switching language is rewriting those same nodes. Containers built by
   JavaScript are left out: they rebuild themselves from the data. */
const DYNAMIC = window.I18N_DYNAMIC || [
  '#track-panel', '#courses-grid', '#chips-category', '#modal-body',
  '#tabs-career', '#tabs-technology', '#quotes', '#m-interest',
  '#drop-tracks-list', '#drop-filters-list', '.drop-current',
];
const originalTexts = [];   // { el, kind, original, raw }

function mapTexts() {
  const outside = (el) => !el || el.closest('script,style') || DYNAMIC.some((sel) => el.closest(sel));
  /* A walk of the TEXT NODES, not of the elements: only that way do the
     sentences broken by a <strong> or a <span> in the middle come in, like the
     paragraph at the top and the numbers in the hero's footer. */
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const n = walker.currentNode;
    if (outside(n.parentElement)) continue;
    const s = n.nodeValue.trim();
    if (s.length > 2 && /[A-Za-zÀ-ÿ]/.test(s)) {
      originalTexts.push({ el: n, kind: 'node', original: s, raw: n.nodeValue });
    }
  }
  document.querySelectorAll('[placeholder]').forEach((el) => {
    if (!outside(el)) originalTexts.push({ el, kind: 'placeholder', original: el.getAttribute('placeholder') });
  });
  document.querySelectorAll('[aria-label]').forEach((el) => {
    if (!outside(el)) originalTexts.push({ el, kind: 'aria-label', original: el.getAttribute('aria-label') });
  });
  document.querySelectorAll('[title]').forEach((el) => {
    if (!outside(el)) originalTexts.push({ el, kind: 'title', original: el.getAttribute('title') });
  });
  const meta = document.querySelector('meta[name="description"]');
  if (meta) originalTexts.push({ el: meta, kind: 'content', original: meta.getAttribute('content') });
  const pageTitle = document.querySelector('title');
  if (pageTitle) originalTexts.push({ el: pageTitle, kind: 'page-title', original: pageTitle.textContent.trim() });
}

function applyTexts() {
  originalTexts.forEach((r) => {
    if (!r.el) return;
    const v = txt(r.original);
    if (r.kind === 'node') r.el.nodeValue = r.raw.replace(r.original, v);
    else if (r.kind === 'page-title') r.el.textContent = v;
    else r.el.setAttribute(r.kind, v);
  });
}

/* lists the sentences with no translation in the current language — used when checking */
function missingTranslations() {
  const d = (window.I18N[LANG] && window.I18N[LANG].ui) || {};
  return [...new Set(originalTexts.map((r) => r.original))].filter((s) => !d[s]);
}

/* ---------- catalogue content ----------
   The authored strings of each field are stored once and, on a language switch,
   the COURSES/TRACKS/TESTIMONIALS objects are rewritten in place. The rest of
   the code goes on reading `c.name` without knowing a translation exists, and
   each field falls back to the base by itself when a translated version is
   missing.

   THE BASE IS ENGLISH NOW. It used to be Portuguese, because Portuguese was the
   source language and therefore needed no dictionary. The mechanism did not
   change — only the language the fallback lands on. */
const BASE = { courses: {}, tracks: {}, testimonials: [] };

function saveBase() {
  COURSES.forEach((c) => {
    BASE.courses[c.id] = {
      name: c.name, summary: c.summary, syllabus: c.syllabus,
      topics: c.topics, prerequisites: c.prerequisites,
    };
  });
  TRACKS.forEach((tr) => {
    const steps = {};
    tr.courses.forEach((item, ix) => {
      if (isChoice(item)) {
        steps[ix] = { choice: item.choice, note: item.note, options: item.options.map((o) => o.name) };
      }
    });
    BASE.tracks[tr.id] = { name: tr.name, goal: tr.goal, outcome: tr.outcome, steps };
  });
  TESTIMONIALS.forEach((d) => BASE.testimonials.push({ text: d.text, author: d.author, context: d.context }));
}

function applyContent() {
  const dic = (window.I18N && window.I18N[LANG]) || {};
  const dc = dic.courses || {}, dt = dic.tracks || {}, dd = dic.testimonials || [];

  COURSES.forEach((c) => {
    const base = BASE.courses[c.id], tr = dc[c.id] || {};
    c.name = tr.name || base.name;
    c.summary = tr.summary || base.summary;
    c.syllabus = tr.syllabus || base.syllabus;
    c.topics = tr.topics || base.topics;
    c.prerequisites = tr.prerequisites !== undefined ? tr.prerequisites : base.prerequisites;
  });

  TRACKS.forEach((track) => {
    const base = BASE.tracks[track.id], tr = dt[track.id] || {};
    track.name = tr.name || base.name;
    track.goal = tr.goal || base.goal;
    track.outcome = tr.outcome || base.outcome;
    track.courses.forEach((item, ix) => {
      if (!isChoice(item)) return;
      const baseStep = base.steps[ix], trStep = (tr.steps || {})[ix] || {};
      item.choice = trStep.choice || baseStep.choice;
      item.note = trStep.note || baseStep.note;
      item.options.forEach((o, io) => { o.name = (trStep.options && trStep.options[io]) || baseStep.options[io]; });
    });
  });

  TESTIMONIALS.forEach((d, i) => {
    const base = BASE.testimonials[i], tr = dd[i] || {};
    d.text = tr.text || base.text;
    d.author = tr.author || base.author;
    d.context = tr.context || base.context;
  });
}

/* ---------- the picker ---------- */
function buildLanguagePicker() {
  const box = document.querySelector('#lang-menu');
  if (!box) return;
  box.textContent = '';
  LANGUAGES.forEach((i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'lang-op' + (i.code === LANG ? ' on' : '');
    b.lang = i.html;
    b.textContent = i.label;
    b.addEventListener('click', () => { switchLanguage(i.code); closeLanguageMenu(); });
    box.appendChild(b);
  });
  const active = LANGUAGES.find((i) => i.code === LANG);
  document.querySelector('#lang-short').textContent = active.short;
  document.documentElement.lang = active.html;
}
function closeLanguageMenu() {
  const c = document.querySelector('#lang');
  if (c) { c.classList.remove('is-open'); c.querySelector('.lang-btn').setAttribute('aria-expanded', 'false'); }
}

function switchLanguage(code) {
  if (code === LANG) return;
  LANG = code;
  try { localStorage.setItem(LANG_KEY, code); } catch (e) { /* private mode */ }
  applyLanguage();
}

/* redoes everything that depends on text: the static nodes, the data, and the
   screens built from them */
function applyLanguage() {
  applyContent();
  applyTexts();
  buildLanguagePicker();
  if (typeof redrawAll === 'function') redrawAll();
}
