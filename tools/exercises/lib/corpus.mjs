/* The rejection corpus: everything that has already cost an API call to be failed.
 *
 * There are two corpora, with opposite roles, and both are necessary:
 *
 *   · the hand-reviewed exercises — no mechanical check may fire on them. It measures FALSE
 *     POSITIVES, and it is what stops a new rule from knocking down a good exercise;
 *   · this file, the real rejections — the more checks fire, the better. It measures REACH,
 *     and it is what answers "would this new rule have caught the defect we paid for?".
 *
 * The second one was missing, and because of that several paid rounds existed only to test a
 * rule against new content when the old content would have served. Worse: the rejection files
 * were overwritten on every run, so the material lost itself — of twelve paid rounds, the
 * rejections of one survived.
 *
 * The rate does NOT have to reach 100%: a debatable key and an implausible distractor are
 * semantic, and computation does not reach them. What it does have to do is **not fall**, and
 * rise when a new rule lands. It is the same measure as the round verdict, measured for free.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { check } from './types.mjs';

const FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'rejected-corpus.json');
const key = (e) => `${e.type}|${(e.statement ?? '').slice(0, 120)}`;

export function read() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return { floor: 0, exercises: [] };
  }
}

/* Stores the exercise with its report and throws the rest away: the reference solution and the
 * execution fields say nothing about why it was rejected, and they bloat the file. */
export function accumulate(rejected, course) {
  const current = read();
  const seen = new Set(current.exercises.map(key));
  let fresh = 0;
  for (const e of rejected) {
    if (seen.has(key(e))) continue;
    seen.add(key(e));
    const { _reference_solution, ...rest } = e;
    current.exercises.push({ ...rest, _course: course });
    fresh++;
  }
  if (fresh) fs.writeFileSync(FILE, JSON.stringify(current, null, 2), 'utf8');
  return fresh;
}

/* How much of what was paid for would be caught for free today, and — what matters most for
 * choosing the next rule — which dimension holds what still escapes. */
export function measureReach(corpus = read()) {
  const byDimension = {};
  let caught = 0;
  for (const e of corpus.exercises) {
    const free = check(e, { options: 5 }).length > 0;
    if (free) caught++;
    const dims = new Set([
      ...(e._critique ?? []).filter((a) => a.severity === 'high').map((a) => a.dimension),
      ...(e._reason ? ['mechanical'] : []),
    ]);
    for (const d of dims.size ? dims : ['no report']) {
      byDimension[d] ??= { paid: 0, free: 0 };
      byDimension[d][free ? 'free' : 'paid']++;
    }
  }
  const total = corpus.exercises.length;
  return { caught, total, pct: total ? Math.round((caught / total) * 100) : 0, floor: corpus.floor ?? 0, byDimension };
}

export function report() {
  const m = measureReach();
  const L = [`reach of the mechanical checks: ${m.caught} of ${m.total} paid rejections (${m.pct}%), recorded floor ${m.floor}%`, ''];
  L.push('  dimension'.padEnd(20) + 'for free'.padStart(10) + 'still paid'.padStart(12));
  for (const [d, v] of Object.entries(m.byDimension).sort((a, b) => b[1].paid - a[1].paid))
    L.push(`  ${d}`.padEnd(20) + String(v.free).padStart(10) + String(v.paid).padStart(12));
  L.push('');
  L.push('The right-hand column is the work queue: it is where a new rule turns spending into computation.');
  L.push('Not everything there is convertible — a debatable key is semantic —, but whatever is shows up here first.');
  return L.join('\n');
}
