/* ==========================================================================
   codeschool.ing — internationalisation (pt-BR · en · es · fr · it)

   THE KEY IS THE PORTUGUESE TEXT ITSELF. That has three good consequences:
   Portuguese needs no dictionary (it is the source), the HTML needs no
   `data-i18n` attributes, and any string not yet translated falls back to
   Portuguese by itself, without breaking the screen.

   The dictionaries live in assets/i18n.js, under window.I18N. Their keys — and
   the shape of the catalogue objects they carry (`cursos`, `trilhas`, `nome`,
   `ementa`…) — are the data contract, so they stay in Portuguese.

   Detection: it uses `navigator.languages`, which is the LANGUAGE configured in
   the browser — not geolocation. That is the right signal: a Brazilian browsing
   from abroad still wants Portuguese, and it asks the user for no permission.
   ========================================================================== */

const LANGUAGES = [
  { cod: 'pt', html: 'pt-BR', rotulo: 'Português', curto: 'PT' },
  { cod: 'en', html: 'en',    rotulo: 'English',   curto: 'EN' },
  { cod: 'es', html: 'es',    rotulo: 'Español',   curto: 'ES' },
  { cod: 'fr', html: 'fr',    rotulo: 'Français',  curto: 'FR' },
  { cod: 'it', html: 'it',    rotulo: 'Italiano',  curto: 'IT' },
];
const LANG_KEY = 'codeschool-idioma';

function browserLanguage() {
  const list = (navigator.languages && navigator.languages.length)
    ? navigator.languages : [navigator.language || 'pt-BR'];
  for (const l of list) {
    const base = String(l).toLowerCase().split('-')[0];
    if (LANGUAGES.some((i) => i.cod === base)) return base;
  }
  return 'pt';
}

let LANG = (() => {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved && LANGUAGES.some((i) => i.cod === saved)) return saved;
  } catch (e) { /* private mode: fall back to detection */ }
  return browserLanguage();
})();

/* translation of one interface string; with no entry, it returns the Portuguese */
function txt(s) {
  const d = window.I18N && window.I18N[LANG] && window.I18N[LANG].ui;
  return (d && d[s]) || s;
}

/* ---------- the page's static text ----------
   A single walk of the DOM stores the original text of every leaf element.
   Switching language is rewriting those same nodes. Containers built by
   JavaScript are left out: they rebuild themselves from the data. */
const DYNAMIC = [
  '#trilha-painel', '#cursos-grade', '#chips-cat', '#modal-corpo',
  '#abas-carreira', '#abas-tecnologia', '#depos', '#m-interesse',
  '#drop-trilhas-lista', '#drop-filtros-lista', '.drop-atual',
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
   The original Portuguese of each field is stored and, on a language switch, the
   CURSOS/TRILHAS/DEPOIMENTOS objects are rewritten in place. That way the rest
   of the code goes on reading `c.nome` without knowing a translation exists —
   and each field falls back to Portuguese by itself when the translated version
   is missing. */
const PT_BASE = { cursos: {}, trilhas: {}, depoimentos: [] };

function savePtBase() {
  CURSOS.forEach((c) => {
    PT_BASE.cursos[c.id] = {
      nome: c.nome, resumo: c.resumo, ementa: c.ementa,
      topicos: c.topicos, requisitos: c.requisitos,
    };
  });
  TRILHAS.forEach((tr) => {
    const steps = {};
    tr.cursos.forEach((item, ix) => {
      if (isChoice(item)) {
        steps[ix] = { escolha: item.escolha, nota: item.nota, opcoes: item.opcoes.map((o) => o.nome) };
      }
    });
    PT_BASE.trilhas[tr.id] = { nome: tr.nome, objetivo: tr.objetivo, saida: tr.saida, etapas: steps };
  });
  DEPOIMENTOS.forEach((d) => PT_BASE.depoimentos.push({ texto: d.texto, autor: d.autor, contexto: d.contexto }));
}

function applyContent() {
  const dic = (window.I18N && window.I18N[LANG]) || {};
  const dc = dic.cursos || {}, dt = dic.trilhas || {}, dd = dic.depoimentos || [];

  CURSOS.forEach((c) => {
    const pt = PT_BASE.cursos[c.id], tr = dc[c.id] || {};
    c.nome = tr.nome || pt.nome;
    c.resumo = tr.resumo || pt.resumo;
    c.ementa = tr.ementa || pt.ementa;
    c.topicos = tr.topicos || pt.topicos;
    c.requisitos = tr.requisitos !== undefined ? tr.requisitos : pt.requisitos;
  });

  TRILHAS.forEach((track) => {
    const pt = PT_BASE.trilhas[track.id], tr = dt[track.id] || {};
    track.nome = tr.nome || pt.nome;
    track.objetivo = tr.objetivo || pt.objetivo;
    track.saida = tr.saida || pt.saida;
    track.cursos.forEach((item, ix) => {
      if (!isChoice(item)) return;
      const ptStep = pt.etapas[ix], trStep = (tr.etapas || {})[ix] || {};
      item.escolha = trStep.escolha || ptStep.escolha;
      item.nota = trStep.nota || ptStep.nota;
      item.opcoes.forEach((o, io) => { o.nome = (trStep.opcoes && trStep.opcoes[io]) || ptStep.opcoes[io]; });
    });
  });

  DEPOIMENTOS.forEach((d, i) => {
    const pt = PT_BASE.depoimentos[i], tr = dd[i] || {};
    d.texto = tr.texto || pt.texto;
    d.autor = tr.autor || pt.autor;
    d.contexto = tr.contexto || pt.contexto;
  });
}

/* ---------- the picker ---------- */
function buildLanguagePicker() {
  const box = document.querySelector('#idioma-menu');
  if (!box) return;
  box.textContent = '';
  LANGUAGES.forEach((i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'idioma-op' + (i.cod === LANG ? ' on' : '');
    b.lang = i.html;
    b.textContent = i.rotulo;
    b.addEventListener('click', () => { switchLanguage(i.cod); closeLanguageMenu(); });
    box.appendChild(b);
  });
  const active = LANGUAGES.find((i) => i.cod === LANG);
  document.querySelector('#idioma-curto').textContent = active.curto;
  document.documentElement.lang = active.html;
}
function closeLanguageMenu() {
  const c = document.querySelector('#idioma');
  if (c) { c.classList.remove('aberto'); c.querySelector('.idioma-btn').setAttribute('aria-expanded', 'false'); }
}

function switchLanguage(cod) {
  if (cod === LANG) return;
  LANG = cod;
  try { localStorage.setItem(LANG_KEY, cod); } catch (e) { /* private mode */ }
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
