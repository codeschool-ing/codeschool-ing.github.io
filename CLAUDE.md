# codeschool.ing

The static showcase site (Stage 1). No build step and no dependencies: plain HTML, CSS and JS,
with the catalogue in `assets/catalog.js`.

Stage 2, the Student Portal, lives in `codeschool-ing/portal-frontend`.

## Language

**English is the source language, everywhere: code, comments, documentation, the DOM contract
and the catalogue.** Portuguese is the fifth translation, in `assets/i18n-pt.js` and
`assets/i18n-courses-pt.js`, alongside Spanish, French and Italian.

The `en` dictionaries do not exist, because they would be identity maps: a missing entry falls
back to the key, and the key is already the string to show. Browser detection falls back to
English.

**The course and track ids are a contract with `codeschool-ing/portal-frontend`**, which
renamed first and stores them in a student's browser. Its `MOVED_IDS` in `app/state.js` is the
authority. Renaming an id here without renaming it there silently unjoins the two
repositories.

Two more things are shared with that repository and should stay syncable: `assets/style.css`
is its `assets/base.css`, and `assets/i18n-runtime.js` is its copy of the same file. The one
known divergence is `.brand-name`, which is still `.brand-nome` there.

## Anything stored in a browser needs a migration

The site stores exactly two things: `codeschool-language` and `codeschool-theme`. Both were
renamed once, and both read the old key once before forgetting it — a rename without that read
silently resets every returning visitor.

The theme migration is duplicated inline in `index.html`'s `<head>`, because the anti-flash
script runs before `script.js` exists. If a third stored key ever appears, it needs the same
treatment, and a test that seeds a real browser with a pre-rename document.

## The published anchors

`#top #tracks #courses #plans #students #contact` are inbound-link targets — the nav,
bookmarks, possibly links this repository does not control. They were renamed from Portuguese
and `MOVED_ANCHORS` in `script.js` redirects the old fragment on load and on hashchange. That
map never expires, because an inbound link does not either.

## Tools

Each in its own folder, with the executable at the root of it:

- `tools/bundle/bundle.py` — packs the site into a single `showcase.html`
- `tools/validate-catalog/validate-catalog.js` — checks `assets/catalog.js`
- `tools/catalog-snapshot/catalog-snapshot.js` — exports the catalogue as JSON for
  `codeschool-ing/portal-backend`'s `ingest`, translations included

## Before pushing

```sh
node tools/validate-catalog/validate-catalog.js   # broken prerequisites, cycles, track order
node tools/catalog-snapshot/catalog-snapshot.js > /dev/null   # dictionaries still in step
python3 tools/bundle/bundle.py                    # and open showcase.html from file://
```

Then load the page in all five languages and confirm no screen shows a raw translation key —
an English string visible while another language is active, where the dictionary says the
translation differs.
