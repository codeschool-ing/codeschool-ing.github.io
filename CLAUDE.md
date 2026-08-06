# codeschool.ing

A static showcase site (Stage 1) and the tooling that prepares Stage 2, the Student Portal.
No build step, no dependencies on the site itself: plain HTML, CSS and JS, with the catalogue
in `assets/catalog.js`.

## Language

**English is the source language, everywhere: code, comments, documentation, the DOM contract
and the catalogue.** Portuguese is the fifth translation, in `assets/i18n-pt.js` and
`assets/i18n-courses-pt.js`, alongside Spanish, French and Italian.

Two things are still Portuguese, for reasons that are not preference:

- the course and track ids are a contract with `codeschool-ing/portal-frontend` — they are
  English now, and its `MOVED_IDS` in `app/state.js` is the authority. Renaming one here
  without renaming it there silently unjoins the two repositories;
- worked examples quoted from real defects in `RULES.md`. Those are records of rounds that
  happened in Portuguese, and a translated example illustrates nothing.

The exercises are English at the source now, with Portuguese as a translation layer. The
regular expressions in `tools/exercises/lib/types.mjs` follow the source, not the other way
round — they analyse whatever language the source is in.

## Golden rule

**Every iteration improves the tool, not just the content.**

When a pipeline round fails an exercise, fixing the exercise is the smallest part of the work.
The question that decides whether the round was worth it is another one:

> Can this defect happen again in another course? If it can, it becomes a rule **before** the
> content is corrected.

Without that, each of the 86 courses rediscovers the same defects one at a time, paying the
API on every rediscovery. It has happened: six lessons stayed only in the Python JSON and
would have been relearned on the next course.

The canonical record of the rules and where each one came from is
[`tools/exercises/RULES.md`](tools/exercises/RULES.md). **Every new rule goes there**, with
the defect that caused it and the point in the code that enforces it.

## How to triage a critique round

Before touching any exercise, classify **every** finding:

1. **Tool artefact** — the critic judged the prompt, not the exercise. The code gets fixed and
   the content does not change. There have been 23 findings like this across two rounds:
   `JSON.stringify` in the exercise body, a type taxonomy never explained to the judge, a
   probe blind to the statement.
2. **A content defect that repeats** — it becomes a rule in `RULES.md` and in the prompt, and
   only then is the exercise fixed.
3. **A one-off content defect** — just fix it.

An agent's finding is not true by decree. **Check it by execution before accepting it**: more
than one finding in this codebase fell apart when run, and more than one was confirmed in a
way I would not have predicted.

## Tools

Each in its own folder, with the executable at the root of it:

- `tools/bundle/bundle.py` — packs the site into a single `.html`
- `tools/validate-catalog/validate-catalog.js` — checks `assets/catalog.js`
- `tools/exercises/exercises.mjs` — generates, validates and critiques exercises

## Security

The pipeline **runs AI-generated code on the local machine**, with a per-case timeout and
nothing else. Do not run a JSON you did not generate; for volume, use a disposable container.
`ANTHROPIC_API_KEY` lives in an environment variable and never in the repository.
