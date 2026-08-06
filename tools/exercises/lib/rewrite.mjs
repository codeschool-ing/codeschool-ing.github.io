/* Stage 4: rewrite what was failed, with the defect in hand.
 *
 * Until this existed, a rejected exercise was thrown away. It had already cost a whole
 * generation and a whole critique, and the defect came named — redoing it with the report in
 * hand is cheaper than generating another one blind and hoping.
 *
 * The RISK of this stage is teaching to the test. Rewriting until the judge approves optimises
 * against the judge, not against quality, and a judge has biases. Three things hold that down:
 *
 *   · the rewrite goes back through the WHOLE funnel — mechanical check, execution and
 *     critique —, and the mechanical check does not change its mind or get tired;
 *   · the blind probe does not read the critique, so there is no way to please it with wording;
 *   · one attempt per exercise, by default. Raising it is an explicit choice, and the history
 *     shows whether it paid off.
 *
 * The type and the topic are pinned on purpose. Letting the model swap a hard
 * `multiple-choice` for an easy `quiz` would solve the rejection and ruin the two measures
 * that keep the generator honest: topic coverage and rate by type.
 */
import { courseContext, courseTopics } from './catalog.mjs';
import { ask } from './claude.mjs';
import { RULES } from './generate.mjs';
import { schema } from './types.mjs';
import { concurrentMap } from './parallel.mjs';

const INTERNAL = /^_/;
const clean = (e) => Object.fromEntries(Object.entries(e).filter(([k]) => !INTERNAL.test(k)));

/* The report, as a list. It comes from two sources: the mechanical check writes `_reason`, the
 * critique writes `_critique`. Both describe the same kind of thing to whoever will rewrite. */
export function report(e) {
  const items = [];
  for (const m of e._reason ?? []) items.push(typeof m === 'string' ? m : `caso ${m.case} (${m.description}): ${m.reason}`);
  for (const a of (e._critique ?? []).filter((x) => x.severity === 'high')) items.push(`[${a.dimension}] ${a.explanation}`);
  return items;
}

/* Reason to refuse the rewrite, or null if it serves. Kept apart from the call so it can be
 * checked without spending. */
export function accept(old, fresh, error) {
  if (!fresh) return error ?? 'the rewrite came back empty';
  // Type and topic are a constraint, not a request: if the model swapped them, the rewrite
  // does not serve — it would change the course's coverage or the rate by type without anyone
  // noticing. Swapping a hard `multiple-choice` for an easy `quiz` solves the rejection and
  // falsifies the measure.
  if (fresh.type !== old.type || fresh.topic !== old.topic) return `came back as ${fresh.type} of "${fresh.topic}"`;
  // Returning the same text is spending again to fail again.
  if (JSON.stringify(clean(fresh)) === JSON.stringify(clean(old))) return 'came back identical';
  return null;
}

export const INSTRUCTIONS = `This exercise was failed. Rewrite it, correcting the defect reported.

**The defect is fact; the suggested fix is a guess.** Whoever reported the defect did not write
the exercise and may have proposed the wrong way out. Correct the cause however you judge best
— including in a way nobody suggested.

**Keep the topic, the type and the number of options.** Escaping a hard type by swapping it for
an easy one is not allowed: the exercise has to go on validating the same topic by the same
means. And one rewrite already came back with six options where the school uses five — it
failed on structure without even reaching the critique, and the fix was thrown away.

**A cosmetic fix does not count.** If the defect is "the wrong ones give themselves away by
form", changing two words does not solve it — rewrite the options. If it is "the hint hands
over the answer", write another hint, not the same one with synonyms. If it is "the key is
wrong", decide which answer is the right one and redo whatever it takes for it to be the only one.

**The result goes through the same checks that failed this one.** All the rules above still
apply; correcting the reported defect and breaking another rule achieves nothing.

The exercise is written in Brazilian Portuguese, and so is the rewrite.`;

export async function rewrite({ exercises, course, options, parallel, onProgress }) {
  const outputs = await concurrentMap(exercises, parallel, async (e, i) => {
    // Whoever rewrites is an author, so they see as much as the author did: up to the
    // exercise's own topic.
    const upTo = courseTopics(course).indexOf(e.topic) + 1;
    const system = `${RULES(options)}\n\n---\n\n${courseContext(course, { upTo: upTo || undefined })}`;
    const problems = report(e);
    const r = await ask({
      stage: 'rewrite',
      system,
      schema: schema(options),
      maxTokens: 16000,
      question: `${INSTRUCTIONS}

## Exercício reprovado
\`\`\`json
${JSON.stringify(clean(e), null, 2)}
\`\`\`

## Defeitos apontados
${problems.map((p) => `· ${p}`).join('\n')}

Devolva **um** exercício: a versão corrigida.`,
    });

    const refusal = accept(e, r.error ? null : r.exercises?.[0], r.error);
    if (refusal) {
      onProgress?.(e, 'failed', refusal, i + 1, exercises.length);
      return null;
    }
    const fresh = r.exercises[0];
    onProgress?.(e, 'rewritten', problems[0] ?? '', i + 1, exercises.length);
    return { ...fresh, _rewritten: (e._rewritten ?? 0) + 1 };
  });

  // Aligned with the input, holes and all: two exercises of the same topic and the same type
  // are common in a batch, so identity by content does not tell you which one came back.
  return outputs;
}
