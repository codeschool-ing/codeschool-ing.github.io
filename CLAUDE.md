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

## `requires` is knowledge, `links` is sequence

A course's `requires` names **only what the student has to know first**. If the reason is
"in this track it comes after that one", it belongs in the track's `links`, which draws the
same arrow in that track and nowhere else.

The two were conflated once and it cost 18 false edges: a course looked like it needed 500h
before it, so it could not be reused in another track, and the site drew arrows at
prerequisites that track did not contain. `validate-catalog.js` now fails on that last case —
a prerequisite absent from a track showing the course — which is the symptom that catches it.

**The one exception is `continues`.** A track that declares `continues: '<other track id>'`
borrows that track's courses for this check, because a student on it has taken them. That is
what lets `data-platform` require `python` without listing the entry track's 520h again. It
is followed to the end of the chain; a track that continues itself, or continues nothing, is
an error. A prerequisite in neither track still fails.

A course whose `requires` is empty does not float: the graph falls back to the previous step
of the track. Deleting a false edge is safe; adding one that is not real is not.

## Tools

Each in its own folder, with the executable at the root of it:

- `tools/bundle/bundle.py` — packs the site into a single `showcase.html`
- `tools/validate-catalog/validate-catalog.js` — checks `assets/catalog.js`, exits non-zero
- `tools/validate-i18n/validate-i18n.js` — checks the four dictionaries against the catalogue
- `tools/graph-test/graph-test.js` — renders every track, in the panel and on the whole
  screen, landscape and portrait, and checks no edge crosses a card
- `tools/modal-test/modal-test.js` — opens every course's modal, checks it keeps one
  height and neither column scrolls, and clicks the detailed contents to see it obey
- `tools/version/version.js` — reads or sets the released version

## Before pushing

```sh
node tools/validate-catalog/validate-catalog.js   # broken prerequisites, cycles, track order
node tools/validate-i18n/validate-i18n.js         # the dictionaries against the catalogue
python3 tools/bundle/bundle.py                    # and open showcase.html from file://
node tools/graph-test/graph-test.js               # needs npm ci + npx playwright install
node tools/modal-test/modal-test.js               # same browser; ~3 minutes
```

**A track's `steps` translations are keyed by POSITION in `courses`.** Inserting a step
moves every fork after it, and the dictionaries do not follow on their own — that is what
`validate-i18n.js` catches, and it exists because exactly that shipped once.

All of it also runs in CI on every pull request — `.github/workflows/ci.yml`. It is not
`aleogr/pipeline`'s: the organisation's shared workflows are Go, and there is none here.

Then load the page in all five languages and confirm no screen shows a raw translation key —
an English string visible while another language is active, where the dictionary says the
translation differs.

## The backend's snapshot is not built here

`codeschool-ing/portal-backend`'s `ingest` takes ONE file and prunes whatever is
not in it, and the file needs SECTIONS — which are authored content and live in
`codeschool-ing/portal-frontend`, not here. This repository used to export a
catalogue-only version; ingesting it emptied the mirror's sections and left the
portal unable to record a single one, so it is gone rather than kept as a
second exporter that both repositories could reach for.

`portal-frontend/tools/snapshot/snapshot.js` is the one, and it carries this
catalogue, its four dictionaries and the sections together.

## Cutting a release

The version lives in `index.html`, in `<meta name="version">`, and nowhere else. There is no
build step here — Pages serves the default branch as it is — so stamping it on the way out
would mean a robot commit per release. The file is authoritative and the tag is checked
against it instead:

```sh
node tools/version/version.js 1.2.0    # never edit the meta tag by hand
git commit -am 'Release 1.2.0' && git tag v1.2.0 && git push --follow-tags
```

`.github/workflows/release.yml` fails the release when the two disagree. `dev` is every build
that is not a release, and the footer then shows nothing rather than link to a tag nobody
created — a wrong version is worse than none, because it answers with confidence.
