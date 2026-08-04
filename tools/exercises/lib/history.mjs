/* A record of rounds, to answer the only question that matters at the end of a run: did the
 * tool get better or not?
 *
 * The approval rate alone does not answer it. It moves with the course, with the topic and
 * with the difficulty that came up, and it rises if the generator turns timid. The number that
 * does not lie is another one:
 *
 *   how many defects the tool caught by itself, for free, against how many only showed up
 *   after paying the API.
 *
 * Every new rule that becomes computation pushes a defect from the paid column to the free
 * column. If that proportion does not move across rounds, the rounds are fixing content and
 * not the tool — which is exactly what the golden rule forbids.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'history.json');
const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);

export function read() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8')).rounds ?? [];
  } catch {
    return [];
  }
}

export function record(r) {
  const rounds = read();
  rounds.push(r);
  fs.writeFileSync(FILE, JSON.stringify({ rounds }, null, 2), 'utf8');
}

/* Compares against the previous round OF THE SAME COURSE. Different courses have different
 * difficulty; comparing docker with python would measure the subject, not the tool. */
export function compare(current, rounds = read()) {
  const L = [];
  const previous = rounds.filter((r) => r.course === current.course).pop();

  const measure = (r) => {
    const free = r.structure + r.execution;
    // The verdict's rate is the FIRST pass, without the rescued ones. A rescue is a bought
    // approval: it measures how much was paid to fix things, not how much the generator
    // improved. Adding the two makes a stalled round look like a leap — it happened, with an
    // apparent +34 pp over a generator that had not moved a point.
    const firstPass = r.approved_first_pass ?? r.approved;
    return {
      rate: pct(firstPass, r.generated),
      firstPass,
      free,
      paid: r.api,
      freePct: pct(free, free + r.api),
      // Cost per approved exercise, not cost of the round: it is the only way to know whether
      // a stage that spends more — the rewrite — pays for itself by delivering more approvals.
      unit: r.approved && r.cost ? r.cost / r.approved : 0,
    };
  };
  const a = measure(current);

  L.push('');
  L.push(previous ? `progress — ${current.course}, against the round of ${previous.when.slice(0, 16).replace('T', ' ')}` : `progress — ${current.course}`);

  const delta = (x, y) => (x - y > 0 ? `+${x - y}` : `${x - y}`);
  if (previous) {
    const b = measure(previous);
    L.push(`  first pass ...... ${a.firstPass}/${current.generated}${current.fresh && current.fresh !== current.generated ? ` (${current.fresh} fresh)` : ''} (${a.rate}%)   before ${b.firstPass}/${previous.generated} (${b.rate}%)   ${delta(a.rate, b.rate)} pp`);
    if (current.rewritten) L.push(`  + rescued ....... ${current.rescued} of ${current.rewritten} rewritten → ${current.approved} approved  (bought approval, does not count toward the verdict)`);
    L.push(`  caught free ..... ${a.free} of ${a.free + a.paid} (${a.freePct}%)   before ${b.free} of ${b.free + b.paid} (${b.freePct}%)   ${delta(a.freePct, b.freePct)} pp`);
    if (a.unit && b.unit)
      L.push(`  cost/approved ... US$ ${a.unit.toFixed(3)}   before US$ ${b.unit.toFixed(3)}   ${delta(pct(a.unit, b.unit), 100)}%`);
    // A missing datum must not turn into silence: the round that introduced a PAID stage was
    // compared without the cost dimension, because the baseline had no such field, and nobody
    // noticed.
    else if (a.unit) L.push(`  cost/approved ... US$ ${a.unit.toFixed(3)}   no comparison: the previous round recorded no cost`);
    L.push(`  paid causes ..... ${causes(current)}`);
    L.push('');
    L.push(`  ${verdict(a, b)}`);
  } else {
    L.push(`  approved ........ ${current.approved}/${current.generated} (${a.rate}%)`);
    L.push(`  caught free ..... ${a.free} of ${a.free + a.paid} (${a.freePct}%)`);
    L.push(`  paid causes ..... ${causes(current)}`);
    L.push('');
    L.push('  FIRST ROUND OF THIS COURSE — there is nothing to compare against. The next one answers.');
  }
  return L;
}

function causes(r) {
  const e = Object.entries(r.dimensions ?? {}).sort((x, y) => y[1] - x[1]);
  return e.length ? e.map(([d, n]) => `${d} ${n}`).join(' · ') : '—';
}

/* The verdict is deliberately coarse: three states and one sentence. A metrics dashboard would
 * demand interpretation, and interpreting at the end of a round is the very work this block
 * exists to spare. */
function verdict(a, b) {
  const dFree = a.freePct - b.freePct;
  const dRate = a.rate - b.rate;
  // The caveat about price comes glued to the verdict, and not on a line that can go unread: a
  // stage that approves more while spending twice as much per exercise is not progress, it is
  // a trade.
  let expensive = '';
  if (a.unit && b.unit && a.unit > b.unit * 1.15)
    expensive = ` But each approval came out ${Math.round(pct(a.unit, b.unit) - 100)}% more expensive — check whether it is worth it.`;
  else if (a.unit && !b.unit) expensive = ' With no cost in the baseline, this round\'s price was compared against nothing.';

  if (dFree >= 5) return `IMPROVED — the tool catches ${dFree} pp more of the defects by itself, without paying the API.${expensive}`;
  if (dRate >= 5) return `IMPROVED — the generator gets ${dRate} pp more right first time, and the division of labour did not get worse.${expensive}`;
  if (dRate <= -5) return `WORSE — the generator gets ${-dRate} pp less right first time and nothing new was caught for free.`;
  return `STALLED — generator at the same first-pass rate, same division of labour. This round was only worth it if a new rule came out of it.${expensive}`;
}

/* Counts the dimensions the critic charged for. One rejection can carry more than one serious
 * finding; each counts, because each is a distinct cause that could become a rule. */
export function dimensionsOf(rejected) {
  const t = {};
  for (const e of rejected)
    for (const a of (e._critique ?? []).filter((x) => x.severity === 'high')) t[a.dimension] = (t[a.dimension] ?? 0) + 1;
  return t;
}
