/* The funnel, in laps: validate → critique → rewrite what fell → validate again.
 *
 * It is separated from the rest because it is bookkeeping, and wrong bookkeeping here does not
 * show up in the output: a rescued exercise counted as rejected, or a rejected one counted
 * twice, produces a plausible and false report at the end of a round that cost dollars.
 * Isolated, it runs end to end against fake functions and spends nothing — see test.mjs.
 *
 * The three functions come from outside. Each takes a list and returns what passed and what
 * fell; `rewrite` returns aligned with its input, with a hole where no rewrite happened,
 * because two exercises of the same topic and the same type in the same batch are common and
 * identity by content would confuse one with the other.
 */
export async function funnel({ exercises, laps = 0, validate, critique, rewrite }) {
  const approved = [];
  const validated = [];
  let rejected = [];
  let input = exercises;

  for (let lap = 0; input.length; lap++) {
    let fallen = [];
    let onward = input;

    if (validate) {
      const v = await validate(input, lap);
      onward = v.approved;
      fallen = [...v.failed];
    }
    validated.push(...onward);

    if (critique) {
      const c = await critique(onward, lap);
      approved.push(...c.approved);
      fallen.push(...c.failed);
    } else approved.push(...onward);

    if (lap >= laps || !fallen.length) {
      rejected.push(...fallen);
      break;
    }

    const rewritten = await rewrite(fallen, lap + 1);
    // Whoever produced no rewrite gets no second chance this round: it is a final rejection
    // now, not on the next lap, or it would leave the report without appearing anywhere.
    rejected.push(...fallen.filter((_, i) => !rewritten[i]));
    input = rewritten.filter(Boolean);
  }

  return { approved, validated, rejected };
}
