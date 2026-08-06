#!/usr/bin/env node
/* ==========================================================================
   codeschool.ing — export the catalog as a snapshot for the portal backend.

   The catalog is authored as JavaScript, because the browser loads it
   directly. The backend keeps a mirror of it so it can validate ids and join
   student progress against them, and it reads JSON — an interpreter inside the
   server, for one file, would be a strange thing to own.

   This is the translator between the two. It runs here rather than there
   because the field names it reads are this repository's:

       node tools/catalog-snapshot/catalog-snapshot.js > catalog.json
       ingest -file catalog.json          # in codeschool-ing/portal-backend

   WHAT IT CARRIES. Every course, every topic in teaching order, and the four
   translations of each. English is the source and lives in the row itself, so
   it is deliberately absent from `translations` — the backend refuses a
   snapshot that claims to translate into it.

   WHAT IT DOES NOT. The syllabus, the prerequisites and the track graph stay
   in the browser, which is the only place that draws them. Sections and
   materials are authored content and do not exist here.

   THE JOIN KEY is the topic title, in English, exactly as the catalog spells
   it. Rewording one in assets/catalog.js is a new lesson to the backend and
   the loss of the old — which is why the translated titles below are keyed by
   POSITION in the catalog's own list, and why this script refuses to run if a
   dictionary has drifted out of step with it.
   ========================================================================== */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const LANGUAGES = ['pt', 'es', 'fr', 'it'];

// The catalog and the dictionaries are browser files: they assign to globals
// rather than export. Running them in a scope that provides those globals is
// how the page loads them too, so nothing here can drift from what a visitor
// gets.
function load() {
  const scope = {};
  new Function('g', read('assets/catalog.js') + ';g.COURSES = COURSES;')(scope);

  global.window = { I18N: {} };
  for (const lang of LANGUAGES) {
    new Function(read(`assets/i18n-courses-${lang}.js`))();
  }
  return { courses: scope.COURSES, dictionaries: global.window.I18N };
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function main() {
  const { courses, dictionaries } = load();
  const problems = [];

  const snapshot = {
    courses: courses.map((course) => {
      const entry = {
        id: course.id,
        title: course.name,
        hours: course.hours ?? null,
        category: course.category ?? null,
        lessons: course.topics.map((topic) => ({ topic, title: topic })),
      };

      for (const lang of LANGUAGES) {
        const t = dictionaries[lang] && dictionaries[lang].courses[course.id];
        if (!t) {
          problems.push(`${course.id}: no ${lang} entry`);
          continue;
        }
        if (t.name) {
          entry.translations = entry.translations || {};
          entry.translations[lang] = { title: t.name };
        }

        // Positional, so a dictionary one line out of step would silently
        // give every lesson its neighbour's title. Refuse instead.
        const topics = t.topics || [];
        if (topics.length !== course.topics.length) {
          problems.push(
            `${course.id}: the ${lang} dictionary lists ${topics.length} topics, ` +
              `the catalog lists ${course.topics.length}`
          );
          continue;
        }
        topics.forEach((title, i) => {
          if (!title) return;
          const lesson = entry.lessons[i];
          lesson.translations = lesson.translations || {};
          lesson.translations[lang] = { title };
        });
      }

      return entry;
    }),
  };

  if (problems.length) {
    console.error('catalog-snapshot: refusing to export.\n  ' + problems.join('\n  '));
    process.exit(1);
  }

  process.stdout.write(JSON.stringify(snapshot, null, 2) + '\n');
}

main();
