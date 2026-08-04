#!/usr/bin/env node
/* Exercise pipeline for the catalogue: generate → validate → critique → rewrite what fell.
 *
 *   node exercises.mjs python --max 3           the whole cycle (default)
 *   node exercises.mjs python --to generate     stops after generating
 *   node exercises.mjs file.json                resumes: validates and critiques
 *   node exercises.mjs file.json --from critique
 *   node exercises.mjs --courses
 *
 * The target is a course id or a .json file — the script tells them apart by the suffix.
 * Resuming from a file is what makes it cheap to fix a key by hand and re-check without
 * regenerating.
 *
 * The funnel runs in laps: whatever fails goes back to the generator with the report in hand
 * and passes through the funnel again. At the end, the run says by itself whether the round
 * improved — see lib/history.mjs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findCourse, load } from './lib/catalog.mjs';
import { totalCost, report } from './lib/claude.mjs';
import { generate, countByType } from './lib/generate.mjs';
import { validate, checkInterpreters, languagesUsed, checkCAS, needsCAS } from './lib/validate.mjs';
import { critique } from './lib/critique.mjs';
import { rewrite } from './lib/rewrite.mjs';
import { blindAuthoring } from './lib/blind.mjs';
import { funnel } from './lib/funnel.mjs';
import { accumulate, report as reach } from './lib/corpus.mjs';
import { compare, dimensionsOf, record } from './lib/history.mjs';
import { build } from './lib/prompts.mjs';
import { TYPES, render } from './lib/types.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STAGES = ['generate', 'validate', 'critique'];

/* ---- arguments ----------------------------------------------------------- */

const argv = process.argv.slice(2);
const target = argv.find((a) => !a.startsWith('--'));
const txt = (name, fallback) => {
  const i = argv.indexOf('--' + name);
  return i === -1 ? fallback : argv[i + 1];
};
const num = (name, fallback) => {
  const v = txt(name, null);
  return v === null ? fallback : Number(v);
};
const has = (name) => argv.includes('--' + name);

const options = { options: num('options', 5) };
const BATCH_SIZE = num('batch', 6);
const MAX_TOPICS = num('max', Infinity);
// `--max N` always took the FIRST N topics, so every round covered the same ones. Producing a
// whole course needs to move forward: `--topics 7-12` does the range.
const RANGE = (() => {
  const v = txt('topics', null);
  if (!v) return null;
  const [a, b] = v.split('-').map(Number);
  return Number.isInteger(a) && a >= 1 ? { from: a, to: Number.isInteger(b) ? b : a } : null;
})();
const TIMEOUT = num('timeout', 10) * 1000;
const PARALLEL = num('parallel', 4);
const REWRITES = num('rewrite', 1);

const isFile = target?.endsWith('.json');
const from = txt('from', isFile ? 'validate' : 'generate');
const to = txt('to', 'critique');

const HELP = `usage: node exercises.mjs <course|file.json> [options]

The default is to run the whole cycle: generate, validate and critique.

  node exercises.mjs python --max 3          generates, validates and critiques
  node exercises.mjs python --to generate    generates only
  node exercises.mjs out.json                resumes: validates and critiques
  node exercises.mjs out.json --from critique --to critique

stages
  --from <stage>     where to start (default: generate, or validate if the target is .json)
  --to <stage>       where to stop (default: critique)
                     stages: ${STAGES.join(', ')}

options
  --max N            only the first N topics — use it the first time, it costs cents
  --topics A-B       the range of topics A to B (1-based) — to advance through a long course
  --batch N          topics per call (default 6)
  --options N        options per question (default 5)
  --timeout N        seconds per test case (default 10)
  --parallel N       simultaneous calls (default 4; raise it if you do not hit a rate limit)
  --rewrite N        repair laps for whatever fails (default 1; 0 turns it off)
  --blind            writes the options without knowing which ones are correct (experimental)
  --structure-only   validate with no API and no execution
  --probes-only      critique without the judgement
  --dry              generate without calling the API
  --courses          lists the catalogue ids
  --view [N]         reads a .json's exercises in human form (N = only number N)
  --prompts          writes prompts.md with every prompt in full
  --reach            how much of the already-paid rejections the checks would catch for free

types: ${TYPES.join(', ')}`;

/* ---- utilities ----------------------------------------------------------- */

// The round's scoreboard: each stage deposits what only it knows, and the end of the run
// answers "did it improve or not" without anyone having to reread the whole output.
const score = { generated: 0, structure: 0, execution: 0, api: 0, approved: 0, approved_first_pass: 0, rewritten: 0, rescued: 0, dimensions: {} };

const label = (e) => `${e.type.padEnd(16)} ${(e.topic ?? '').slice(0, 38).padEnd(38)}`;
const index = (stage) => STAGES.indexOf(stage);
const runs = (stage) => index(stage) >= index(from) && index(stage) <= index(to);

function save(destination, data, exercises) {
  fs.writeFileSync(destination, JSON.stringify({ ...data, exercises }, null, 2), 'utf8');
}

function preserve(file) {
  // The previous round cost money and may contain corrections made by hand.
  if (fs.existsSync(file)) {
    const previous = file.replace(/\.json$/, `.${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.renameSync(file, previous);
    console.log(`(the previous version became ${path.basename(previous)})`);
  }
}

/* ---- stages -------------------------------------------------------------- */

async function stageGenerate(courseId) {
  const course = findCourse(courseId);
  const topics = RANGE ? course.topicos.slice(RANGE.from - 1, RANGE.to) : course.topicos.slice(0, MAX_TOPICS);

  console.log(`course ....... ${course.nome} (${course.id})`);
  console.log(`topics ....... ${topics.length} of ${course.topicos.length}${RANGE ? ` (from ${RANGE.from} to ${RANGE.from + topics.length - 1})` : ''}`);
  console.log(`options ...... ${options.options} per question`);
  console.log(`parallel ..... ${PARALLEL} simultaneous calls`);
  console.log(`rewrite ...... ${REWRITES} repair lap(s) for whatever fails`);
  console.log('');

  if (has('dry')) {
    console.log('--dry: nothing was sent to the API');
    console.log(topics.map((t, i) => `${i + 1}. ${t}`).join('\n'));
    return null;
  }

  const exercises = await generate({
    course,
    topics,
    batchSize: BATCH_SIZE,
    parallel: PARALLEL,
    options,
    onProgress: (m, done, total) => console.log(`[${String(done).padStart(2)}/${total}] ${m}`),
  });

  const destination = path.join(HERE, `exercises-${course.id}.json`);
  // Zero exercises must not erase the previous round: a generation that failed once renamed
  // the good file and wrote an empty one over it.
  if (!exercises.length) {
    console.error('\nThe generation produced no exercises at all — the previous file stays as it is.');
    process.exit(1);
  }
  // Blind authoring comes BEFORE saving: the file has to contain what the funnel will judge.
  let output = exercises;
  if (has('blind')) {
    console.log('');
    console.log('blind ........ rewriting the options with no key');
    output = await blindAuthoring({
      exercises,
      course,
      settings: options,
      parallel: PARALLEL,
      onProgress: (e, state, detail, done, total) =>
        console.log(`[#${String(done).padStart(3)}/${total}] ${label(e)} ${state}${detail ? '  ' + detail : ''}`),
    });
  }

  // Generating by range PRODUCES a course in pieces, so it must not erase the previous pieces:
  // the file accumulates, and only this range's topics are replaced. Without this, `--topics
  // 7-9` after `--topics 1-6` would leave the course with 3 topics instead of 9.
  let previous = [];
  if (RANGE && fs.existsSync(destination)) {
    const inRange = new Set(topics);
    previous = (JSON.parse(fs.readFileSync(destination, 'utf8')).exercises ?? []).filter((e) => !inRange.has(e.topic));
    if (previous.length) console.log(`(keeping ${previous.length} exercises from topics outside the range)`);
  }
  preserve(destination);
  const together = [...previous, ...output];
  const data = { course: course.id, generated_at: new Date().toISOString(), options: options.options, blind: has('blind'), exercises: together };
  save(destination, data, together);

  console.log('');
  console.log(`generated .... ${output.length} (${countByType(output)})`);
  score.fresh = output.length;
  score.blind = has('blind');
  score.course = course.id;
  score.topics = topics.length;
  return { file: destination, data };
}

function checkEnvironment(exercises) {
  if (!has('structure-only')) {
    const missing = checkInterpreters(languagesUsed(exercises));
    if (missing.length) {
      console.error('\nExercises cannot be executed in this environment:');
      for (const f of missing) console.error(`  · ${f}`);
      console.error('\nInstall what is missing, or use --structure-only.');
      process.exit(2);
    }
    if (needsCAS(exercises)) {
      const noCAS = checkCAS();
      if (noCAS) {
        console.error(`\nExpressions cannot be verified: ${noCAS}`);
        console.error('Install it, or use --structure-only.');
        process.exit(2);
      }
    }
  }
}

async function stageValidate(exercises, data) {
  console.log('');
  const { approved, failed } = await validate({
    exercises,
    options: { ...options, options: data.options ?? options.options, topics: findCourse(data.course).topicos },
    timeout: TIMEOUT,
    parallel: PARALLEL,
    structureOnly: has('structure-only'),
    onProgress: (e, state, detail, failures, done, total) => {
      console.log(`[#${String(done).padStart(3)}/${total}] ${label(e)} ${state}${detail ? '  ' + detail : ''}`);
      for (const f of (failures ?? []).slice(0, 2)) {
        console.log(`     case ${f.case} (${f.description}): ${f.reason}`);
        if (f.expected !== undefined) {
          console.log(`       expected ${JSON.stringify(f.expected)}`);
          console.log(`       got      ${JSON.stringify(f.got)}`);
        }
      }
    },
  });

  console.log('');
  console.log(`validated .... ${approved.length}/${exercises.length}  (${failed.length} failed)`);
  // Summed across the laps: what matters is how many defects each layer caught, not on which
  // pass it caught them.
  score.structure += failed.filter((e) => e._layer === 'structure').length;
  score.execution += failed.filter((e) => e._layer !== 'structure').length;
  return { approved, failed };
}

async function stageCritique(exercises, course) {
  console.log('');
  const { approved, failed } = await critique({
    exercises,
    course,
    probesOnly: has('probes-only'),
    parallel: PARALLEL,
    onProgress: (e, state, findings, done, total) => {
      const n = Array.isArray(findings) ? findings.length : 0;
      console.log(`[#${String(done).padStart(3)}/${total}] ${label(e)} ${state}${state === 'ok' && n ? `  (${n} minor caveat)` : ''}`);
      if (state === 'FAILED') for (const a of findings) console.log(`     [${a.dimension}] ${a.explanation}`);
    },
  });

  console.log('');
  console.log(`approved ..... ${approved.length}/${exercises.length}  (${failed.length} rejected)`);
  score.api += failed.length;
  for (const [d, n] of Object.entries(dimensionsOf(failed))) score.dimensions[d] = (score.dimensions[d] ?? 0) + n;
  return { approved, failed };
}

/* One repair lap: whatever failed comes back with the report in hand. Whatever did not come
 * back — the rewrite failed, changed type, came back identical — is a final rejection. */
async function stageRewrite(rejected, course, lap) {
  console.log('');
  console.log(`rewriting .... ${rejected.length} failed, lap ${lap} of ${REWRITES}`);
  const rewritten = await rewrite({
    exercises: rejected,
    course,
    options,
    parallel: PARALLEL,
    onProgress: (e, state, detail, done, total) =>
      console.log(`[#${String(done).padStart(3)}/${total}] ${label(e)} ${state}${detail ? '  ' + detail.slice(0, 90) : ''}`),
  });
  score.rewritten += rewritten.filter(Boolean).length;
  return rewritten;
}

function printCost() {
  const r = report();
  if (!r.anyCalls) return;
  console.log('');
  console.log('cost per stage');
  for (const l of r.lines) console.log(l);
  console.log(`  ${'TOTAL'.padEnd(10)} US$ ${r.total.toFixed(4)}`);
}

/* ---- dispatch ------------------------------------------------------------ */

try {
  if (has('view') && isFile) {
    // Review by a person is this pipeline's only external signal; nobody reads JSON.
    const d = JSON.parse(fs.readFileSync(target, 'utf8'));
    const only = Number(txt('view', ''));
    const list = d.exercises ?? [];
    for (const [i, e] of list.entries()) {
      if (Number.isInteger(only) && only > 0 && only !== i + 1) continue;
      console.log(render(e, i + 1));
    }
    console.log(`${'─'.repeat(78)}\n${list.length} exercises in ${path.basename(target)}`);
  } else if (has('reach')) {
    console.log(reach());
  } else if (has('prompts')) {
    // The prompts are the most expensive asset here and they live spread across four files.
    // This command joins them into one readable, attachable file; a test checks it does not
    // go stale.
    const destination = path.join(HERE, 'prompts.md');
    fs.writeFileSync(destination, build(options), 'utf8');
    console.log(`${path.basename(destination)} written (${build(options).split(/\s+/).length} words)`);
  } else if (has('courses')) {
    for (const c of load().courses) console.log(`${c.id.padEnd(24)} ${String(c.topicos?.length ?? 0).padStart(2)} topics  ${c.nome}`);
  } else if (!target || has('help')) {
    console.log(HELP);
  } else {
    for (const e of [from, to]) {
      if (!STAGES.includes(e)) throw new Error(`unknown stage: "${e}" — use ${STAGES.join(', ')}`);
    }
    if (index(from) > index(to)) throw new Error(`--from ${from} comes after --to ${to}`);
    if (isFile && runs('generate')) throw new Error('the target is a file: start from validate or critique');

    let state = isFile ? { file: target, data: JSON.parse(fs.readFileSync(target, 'utf8')) } : null;
    let failedCount = 0;

    if (runs('generate')) {
      state = await stageGenerate(target);
      if (!state) process.exit(0); // --dry
    }
    if (runs('validate') || runs('critique')) {
      const { file, data } = state;
      const course = findCourse(data.course);
      checkEnvironment(data.exercises ?? []);

      // The funnel runs in laps: what falls on one lap may come back fixed on the next.
      // Rewriting only makes sense with the critique on — it is the critique that produces the
      // expensive report.
      // The denominator is what ENTERED the funnel, not what has just been generated. With a
      // range accumulating, `--topics 4-5` in a file of 16 divided 7 approvals by 8 fresh ones
      // and printed 88% where the rate was 44%. An inflated metric is worse than a missing
      // one: it reads as good news.
      score.generated = (data.exercises ?? []).length;
      const { approved: passed, validated, rejected: finals } = await funnel({
        exercises: data.exercises ?? [],
        laps: runs('critique') ? REWRITES : 0,
        validate: runs('validate') ? (list) => stageValidate(list, data) : null,
        critique: runs('critique') ? (list) => stageCritique(list, course) : null,
        rewrite: (list, lap) => stageRewrite(list, course, lap),
      });

      failedCount = finals.length;
      score.approved = passed.length;
      score.rescued = passed.filter((e) => e._rewritten).length;
      // Without separating the first pass, a rescue turns into rate and a stalled round looks
      // like a leap.
      score.approved_first_pass = passed.filter((e) => !e._rewritten).length;

      const base = file.replace(/\.json$/, '');
      if (runs('validate')) save(`${base}.validated.json`, data, validated);
      if (runs('critique')) save(`${base}.critiqued.json`, data, passed);
      if (finals.length) save(`${base}.rejected.json`, data, finals);
      // A rejection cost a call to be discovered: keeping it is what makes it possible to test
      // the next rule for free. The per-round files overwrite each other — of twelve paid
      // rounds, the rejections of one survived before this existed.
      const fresh = accumulate(finals, data.course);
      if (fresh) console.log(`corpus          +${fresh} rejection(s) kept, to test a new rule without spending`);

      if (score.rewritten) {
        console.log('');
        console.log(`rescued ...... ${score.rescued} of ${score.rewritten} rewritten  (${passed.length} approved in total)`);
      }
    }

    printCost();
    // Only the whole cycle enters the history. Resuming from a file generated nothing, and the
    // denominator would be another one — comparing the two would measure the command, not the
    // tool.
    if (runs('generate') && runs('critique') && score.generated) {
      const round = { when: new Date().toISOString(), ...score, cost: Number(totalCost().toFixed(4)) };
      for (const l of compare(round)) console.log(l);
      record(round);
    }
    process.exit(failedCount ? 1 : 0);
  }
} catch (err) {
  console.error(err.message);
  if (err.ids) console.error('available ids: ' + err.ids.join(', '));
  process.exit(1);
}
