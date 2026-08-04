/* Blind authoring of the options: write first, decide the truth afterwards.
 *
 * Three rounds showed that closing one form-tell channel opens another. The asymmetric
 * qualifier was removed and asymmetric length appeared; the first-pass rate never moved off
 * ~40%. The cause is not the channel, it is the asymmetry of whoever writes: **the author
 * knows which one is correct while drafting it, and looks after it.**
 *
 * Here authoring is split into two independent calls:
 *
 *   1. write N statements about the topic, knowing HOW MANY will be true and never WHICH. With
 *      no key to privilege, there is no way to lavish care on the correct one;
 *   2. in a separate call, with no memory of the first, judge each statement. It is that
 *      judgement that becomes the key.
 *
 * It is the same blind-oracle principle that already governs verification, applied to writing.
 *
 * A side effect that is a gain: the count of true statements stops being decreed by the author
 * and comes to be established by a reader. If the judgement returns two true ones in a `quiz`,
 * the mechanical check fails it for free — and what it is catching is a set of statements that
 * does not sustain the intended key, a defect only the critic used to see, at a price.
 */
import { courseContext, courseTopics } from './catalog.mjs';
import { ask } from './claude.mjs';
import { concurrentMap } from './parallel.mjs';

const WITH_OPTIONS = new Set(['quiz', 'multiple-choice']);

export const SYS_WRITE = `You write the options for a question at a programming school, and you work
**without knowing which ones will be the correct ones**.

You receive the topic, the statement and how many true statements the set must contain. You do
not receive, and must not decide, **which** they are. Write the whole set with the same care.

**Why the work is arranged this way.** When whoever writes knows which one is correct, it comes
out better: longer, more precise, more qualified, more like the statement. The student then
gets it right by form, without knowing the subject, and the question stops measuring what it
promises. Writing blind, there is no option to privilege.

**Each statement has to be defensible at first sight.** No obvious absurdity, no filler. A good
false statement is one a real student would answer on a bad day: an error of scale, a mechanism
swapped for another that exists, a right conclusion for a wrong reason, confusion between two
neighbouring concepts from the same field.

**Uniformity is the criterion you are being measured by.** Among the N statements:

- roughly the same length — none noticeably longer or shorter;
- the same degree of qualification — either all qualify, or none does;
- the same modality — do not mix "pode acontecer" with "obriga a acontecer";
- the same opening formula avoided: do not start three the same and one different;
- the same distance from the statement — none repeating its vocabulary more than the others;
- the same level of abstraction and the same verb tense.

Test before delivering: **read without the key, can you guess which ones are true just from the
way they are written?** If you can, rewrite until you cannot.

Write the statements in Brazilian Portuguese — that is what the student reads.`;

export const SYS_JUDGE_STATEMENTS = `You judge technical statements, one by one, and nothing else.

You receive a course topic and a list of statements written by someone else, with no key. For
each one, decide whether it is **true** in the context of the topic and write the justification
the student will read **after** answering.

Judge on technical merit, not on form. A careful sentence is not more true than a blunt one; a
sentence with an absolute is not more false than one with a qualifier. You are the only defence
against a set whose truth can be guessed from style — if you judge by style, there is no
defence at all.

If a statement is true under one reading and false under another equally reasonable one, mark
\`ambiguous\`. It serves neither side.

The justification says **why** it is true or false, in one or two sentences, with the mechanism.
"Está errado" teaches nothing; "a imagem declara a plataforma, e o kernel do host não muda"
teaches something.

The statements are in Brazilian Portuguese; write the justifications in Portuguese too.`;

const SCH_WRITE = {
  type: 'object',
  properties: { statements: { type: 'array', items: { type: 'string' } } },
  required: ['statements'],
  additionalProperties: false,
};

const SCH_JUDGE_STATEMENTS = {
  type: 'object',
  properties: {
    judgements: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          true_statement: { type: 'boolean' },
          ambiguous: { type: 'boolean' },
          why: { type: 'string' },
        },
        required: ['true_statement', 'ambiguous', 'why'],
        additionalProperties: false,
      },
    },
  },
  required: ['judgements'],
  additionalProperties: false,
};

/* How many true ones the type asks for. `quiz` is exact; `multiple-choice` keeps the count the
 * generator chose, because it came from the topic — only the statement↔truth mapping becomes
 * blind. */
export function howManyTrue(e) {
  if (e.type === 'quiz') return 1;
  const n = (e.options ?? []).filter((a) => a.correct).length;
  return n >= 2 ? n : 2;
}

/* Assembles the options from the statements and the judgements. Returns `{ options }` or
 * `{ error }` — and the error is NOT a silent failure: the exercise carries on with its
 * original options and a warning, so as not to lose work already paid for because of one
 * crooked call. */
export function buildOptions(statements, judgements, expected) {
  if (!Array.isArray(statements) || !Array.isArray(judgements)) return { error: 'answer without a list' };
  if (statements.length !== judgements.length) return { error: `${statements.length} statements and ${judgements.length} judgements` };
  const ambiguous = judgements.filter((j) => j.ambiguous).length;
  if (ambiguous) return { error: `${ambiguous} statement(s) judged ambiguous` };

  const options = statements.map((text, i) => ({
    text,
    correct: !!judgements[i].true_statement,
    why: judgements[i].why,
  }));
  const right = options.filter((a) => a.correct).length;
  // The divergence is information, not an accident: the blind author produced a set whose
  // established truth does not match what the question needed. Let it through to the
  // mechanical check, which fails it for free and sends it to the rewrite with the defect named.
  return { options, diverged: right !== expected ? `${right} true, the type asks for ${expected}` : null };
}

/* `settings` is the run-wide options object — `{ options: N }`, N being how many options each
 * question carries. It is named apart from the option list this module builds. */
export async function blindAuthoring({ exercises, course, settings, parallel, onProgress }) {
  // It also writes blind with respect to the syllabus: only what has been taught up to the topic.
  const ctx = (e) => courseContext(course, { upTo: (courseTopics(course).indexOf(e.topic) + 1) || undefined });
  const targets = exercises.filter((e) => WITH_OPTIONS.has(e.type));
  if (!targets.length) return exercises;

  const rewritten = new Map();
  await concurrentMap(targets, parallel, async (e, i) => {
    const n = settings.options;
    const trueCount = howManyTrue(e);

    const written = await ask({
      stage: 'blind',
      system: `${SYS_WRITE}\n\n---\n\n${ctx(e)}`,
      schema: SCH_WRITE,
      maxTokens: 8000,
      question: `## Tópico\n${e.topic}\n\n## Enunciado\n${e.statement}\n\nEscreva ${n} afirmações. **${trueCount} delas será(ão) verdadeira(s)** — mas não decida quais, e não indique nada: outra pessoa vai julgar cada uma depois de você.`,
    });
    if (written.error || (written.statements?.length ?? 0) !== n) {
      onProgress?.(e, 'kept', written.error ?? `${written.statements?.length ?? 0} of ${n} came back`, i + 1, targets.length);
      return null;
    }

    // A fresh call, with no memory of the previous one: that is what makes the judgement
    // independent of the writing.
    const judged = await ask({
      stage: 'blind',
      system: `${SYS_JUDGE_STATEMENTS}\n\n---\n\n${ctx(e)}`,
      schema: SCH_JUDGE_STATEMENTS,
      maxTokens: 8000,
      question: `## Tópico\n${e.topic}\n\n## Contexto da pergunta\n${e.statement}\n\n## Afirmações a julgar\n${written.statements.map((t, k) => `${k + 1}. ${t}`).join('\n')}`,
    });
    if (judged.error) {
      onProgress?.(e, 'kept', judged.error, i + 1, targets.length);
      return null;
    }

    const { options: built, error, diverged } = buildOptions(written.statements, judged.judgements, trueCount);
    if (error) {
      onProgress?.(e, 'kept', error, i + 1, targets.length);
      return null;
    }
    rewritten.set(e, built);
    onProgress?.(e, diverged ? 'blind, diverged' : 'blind', diverged ?? '', i + 1, targets.length);
    return null;
  });

  return exercises.map((e) => (rewritten.has(e) ? { ...e, options: rewritten.get(e), _blind: true } : e));
}
