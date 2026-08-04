/* Stage 2: check the structure and execute whatever can be executed.
 *
 * `code`            → writes a reference solution WITHOUT seeing the cases and runs it against them.
 * `expected-output` → executes the very snippet shown and compares with the key. This is the
 *                     strongest step in the pipeline: it depends on no judgement at all, only
 *                     on the interpreter. It catches wrong precedence, wrong formatting, a
 *                     missing \n.
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ask } from './claude.mjs';
import { check } from './types.mjs';
import { concurrentMap } from './parallel.mjs';

const RUNNERS = {
  python: { candidates: ['python3', 'python', 'python3.12', 'python3.11'], args: (src) => ['-c', src] },
  javascript: { candidates: ['node', 'nodejs'], args: (src) => ['-e', src] },
  // SQL does not run as a program: the "code" is a query, and the input is the setup script.
  // It travels in a JSON envelope to a script that uses python's own sqlite3, which is already
  // a dependency — nothing new to install. See run_sql.py: the output format is the contract,
  // and it is documented there and in the authoring prompt.
  sql: { candidates: ['python3', 'python', 'python3.12', 'python3.11'], sql: true, args: () => [RUN_SQL] },
};

const RESOLVED = {};
const HERE = path.dirname(fileURLToPath(import.meta.url));
const VERIFIER = path.join(HERE, 'verify_expression.py');
const RUN_SQL = path.join(HERE, 'run_sql.py');

/* Checks that expression verification is possible: needs python with sympy. */
export function checkCAS() {
  const cmd = RESOLVED.python;
  if (!cmd) return 'python is not on the PATH (required for expression-answer)';
  try {
    execFileSync(cmd, ['-c', 'import sympy'], { encoding: 'utf8', timeout: 20000, stdio: ['pipe', 'pipe', 'pipe'] });
    return null;
  } catch {
    return `sympy is not installed — run: ${cmd} -m pip install sympy`;
  }
}

/* Recomputes the key with sympy and compares. This is not opinion: if the arithmetic does not
 * match, the key is wrong. */
function verifyExpression(e, timeout) {
  const cmd = RESOLVED.python;
  const input = JSON.stringify({
    answer_expression: e.answer_expression,
    variables: e.variables ?? [],
    check: { source: e.check_source, operation: e.check_operation, variable: e.check_variable },
  });
  try {
    const out = execFileSync(cmd, [VERIFIER], { input, encoding: 'utf8', timeout, stdio: ['pipe', 'pipe', 'pipe'] });
    return JSON.parse(out);
  } catch (err) {
    if (err.code === 'ETIMEDOUT') return { error: `the check blew past ${timeout / 1000}s` };
    const stderr = (err.stderr ?? '').toString().trim();
    return { error: stderr ? stderr.split('\n').pop() : `${err.code ?? 'error'}: ${err.message.split('\n')[0]}` };
  }
}

export function checkInterpreters(languages) {
  const missing = [];
  for (const lang of languages) {
    const runner = RUNNERS[lang];
    if (!runner) {
      missing.push(`${lang}: the validator does not know how to run this language`);
      continue;
    }
    if (RESOLVED[lang]) continue;
    const tried = [];
    for (const cmd of runner.candidates) {
      try {
        const probe = lang === 'sql' ? JSON.stringify({ sql: 'SELECT 1', input: '' }) : '';
        execFileSync(cmd, runner.args(lang === 'python' ? 'pass' : ';'), { input: probe, encoding: 'utf8', timeout: 10000, stdio: ['pipe', 'pipe', 'pipe'] });
        RESOLVED[lang] = cmd;
        break;
      } catch {
        tried.push(cmd);
      }
    }
    if (!RESOLVED[lang]) missing.push(`${lang}: none of these is on the PATH — ${tried.join(', ')}`);
  }
  return missing;
}

function run(language, src, input, timeout) {
  const runner = RUNNERS[language];
  const cmd = RESOLVED[language];
  if (!runner || !cmd) return { error: `language "${language}" is not supported` };
  // In SQL the pair (query, setup) travels together over stdin; in the other languages the
  // code goes as an argument and the input is the program's stdin.
  const data = runner.sql ? JSON.stringify({ sql: src, input: input ?? '' }) : (input ?? '');
  try {
    return { output: execFileSync(cmd, runner.args(src), { input: data, encoding: 'utf8', timeout, stdio: ['pipe', 'pipe', 'pipe'] }) };
  } catch (err) {
    if (err.code === 'ETIMEDOUT') return { error: `blew past ${timeout / 1000}s` };
    // A missing interpreter gives ENOENT with empty stderr: never swallow the cause.
    const stderr = (err.stderr ?? '').toString().trim();
    return { error: stderr ? stderr.split('\n').pop() : `${err.code ?? 'error'}: ${err.message.split('\n')[0]}` };
  }
}

export const SYS_SOLUTION = `You receive the statement of a programming exercise and the skeleton
the student completes. Write the complete reference solution: the whole file, ready to run,
not only the missing part.

The solution reads from standard input and writes to standard output exactly what the
statement asks for. No extra text, no prompt asking for data.

You are NOT seeing the test cases. Implement strictly what the statement specifies. If it is
ambiguous, choose the most literal reading — do not invent behaviour the statement does not
describe.

The statement is written in Brazilian Portuguese; answer with code only.`;

const SCH_SOLUTION = {
  type: 'object',
  properties: { solution: { type: 'string' } },
  required: ['solution'],
  additionalProperties: false,
};

async function referenceSolution(e) {
  if (e._reference_solution) return { solution: e._reference_solution };
  return ask({
    stage: 'validate',
    system: SYS_SOLUTION,
    schema: SCH_SOLUTION,
    maxTokens: 8000,
    question: `Language: ${e.language}\n\n## Statement\n${e.statement}\n\n## Skeleton\n\`\`\`\n${e.skeleton}\n\`\`\``,
  });
}

export async function validate({ exercises, options, timeout, parallel, structureOnly, onProgress }) {
  const verdicts = await concurrentMap(exercises, parallel, async (e, i) => {
    const approved = [];
    const failed = [];
    const progress = (ex, state, detail, failures) => onProgress?.(ex, state, detail, failures, i + 1, exercises.length);

    const problems = check(e, options);
    if (problems.length) {
      progress(e, 'STRUCTURE', problems.join('; '));
      // The layer is recorded: it is what says, at the end of the round, how much of the
      // defect was caught by computation and how much needed the API.
      failed.push({ ...e, _layer: 'structure', _reason: problems });
      return { approved, failed };
    }

    // --structure-only promises "no API and no execution". Without this exit the runner runs
    // with RESOLVED empty and returns "language is not supported" for everyone — the flag
    // failed exactly what it said it would not check.
    if (structureOnly) {
      progress(e, 'ok', 'structure only');
      approved.push({ ...e, _verification: 'structure' });
      return { approved, failed };
    }

    if (e.type === 'expression-answer') {
      const r = verifyExpression(e, timeout);
      if (r.error) {
        progress(e, 'FAILED', r.error);
        failed.push({ ...e, _reason: [r.error] });
      } else if (r.skipped) {
        // With no check, the key was verified by nobody: approving would stamp a quality mark
        // on something unchecked.
        const m = 'no check (check_operation: none) — the key was never verified';
        progress(e, 'FAILED', m);
        failed.push({ ...e, _reason: [m] });
      } else if (!r.ok) {
        const detail = `key "${r.key}", but the check computes "${r.computed}"`;
        progress(e, 'FAILED', detail);
        failed.push({ ...e, _reason: [detail] });
      } else {
        progress(e, 'ok', `sympy recomputes and agrees: ${r.computed}`);
        approved.push({ ...e, _verification: 'execution' });
      }
      return { approved, failed };
    }

    if (e.type === 'expected-output') {
      const r = run(e.language, e.given_code, '', timeout);
      if (r.error) {
        progress(e, 'FAILED', `the snippet does not run: ${r.error}`);
        failed.push({ ...e, _reason: [`the snippet does not run: ${r.error}`] });
      } else if (r.output !== e.answer) {
        const detail = `key ${JSON.stringify(e.answer)}, the interpreter produces ${JSON.stringify(r.output)}`;
        progress(e, 'FAILED', detail);
        failed.push({ ...e, _reason: [detail] });
      } else {
        progress(e, 'ok', 'output agrees with the interpreter');
        approved.push({ ...e, _verification: 'execution' });
      }
      return { approved, failed };
    }

    if (e.type !== 'code') {
      // A type with no possible execution: it passed the structure and nothing else. The
      // portal needs to know.
      progress(e, 'ok', '');
      approved.push({ ...e, _verification: 'structure' });
      return { approved, failed };
    }

    const ref = await referenceSolution(e);
    if (ref.error) {
      progress(e, 'SOLUTION', ref.error);
      failed.push({ ...e, _reason: [ref.error] });
      return { approved, failed };
    }

    const failures = [];
    for (const [n, t] of e.tests.entries()) {
      const r = run(e.language, ref.solution, t.input, timeout);
      if (r.error) failures.push({ case: n + 1, description: t.description, reason: r.error });
      else if (r.output !== t.expected_output)
        failures.push({ case: n + 1, description: t.description, reason: 'different output', expected: t.expected_output, got: r.output });
    }

    if (failures.length) {
      progress(e, 'FAILED', `${failures.length}/${e.tests.length} cases`, failures);
      failed.push({ ...e, _reason: failures, _reference_solution: ref.solution });
    } else {
      progress(e, 'ok', `${e.tests.length}/${e.tests.length} cases`);
      approved.push({ ...e, _verification: 'execution', _reference_solution: ref.solution });
    }
    return { approved, failed };
  });

  return {
    approved: verdicts.flatMap((v) => v.approved),
    failed: verdicts.flatMap((v) => v.failed),
  };
}

export function languagesUsed(exercises) {
  const langs = new Set(
    exercises.filter((e) => e.type === 'code' || e.type === 'expected-output').map((e) => e.language).filter(Boolean),
  );
  // expression-answer runs sympy, which is python — even in a course with no code exercise.
  if (exercises.some((e) => e.type === 'expression-answer')) langs.add('python');
  return [...langs];
}

export function needsCAS(exercises) {
  return exercises.some((e) => e.type === 'expression-answer');
}
