/* Stage 1: write exercises from a course's topics. */
import { courseContext } from './catalog.mjs';
import { ask } from './claude.mjs';
import { schema, RULES_BY_TYPE, summary } from './types.mjs';
import { concurrentMap } from './parallel.mjs';

// Exported because whoever rewrites a rejected exercise obeys the same rules as whoever wrote
// it: a second list of rules would diverge from the first one on the first edit.
export const RULES = (options) => `You write exercises for an online programming school that
grades everything by machine. There is no teacher on the other side: an exercise that needs
human judgement to be graded is useless here.

For each topic you receive, write 3 to 5 exercises that let the student check whether they
understood **that topic specifically** — not the whole course, not the neighbouring topic.

**Topic order is a constraint, not context.** An exercise for topic N may only require what
topics 1 to N have already taught. Using a feature from a later topic fails whoever masters
the subject being assessed and has not got there yet, and automatic grading cannot tell the
two apart. Before settling an exercise, list what it requires and check each item against the
topic's position: string method, conditional, loop, data structure, library. If something
comes later, change the task.

## The available types, and when to use each
${RULES_BY_TYPE(options)}

## Form
Spread the difficulties: not everything easy, not everything hard. Vary the types as the topic
asks — do not force the same type on everything. Statements in Brazilian Portuguese, direct,
without "neste exercício você irá". A technology's proper name stays intact.

**The statement has to specify the required output**, because the comparison is exact: say
whether there is text besides the value, which decimal separator, whether there is a trailing
space on the line. The student cannot discover the contract from the test cases — they do not
see them.`;

export async function generate({ course, topics, batchSize, parallel, options, onProgress }) {
  const batches = [];
  for (let i = 0; i < topics.length; i += batchSize) batches.push(topics.slice(i, i + batchSize));

  // `max_tokens` limits thinking + answer together, and the model delivers 128k. With
  // adaptive thinking at high effort, 6 topics did not fit in 32k: the whole batch got
  // truncated and all 6 topics came back with no exercises at all.
  const OUTPUT_CEILING = 64000;

  async function write(batch, label) {
    // The syllabus is cut at the batch's last topic: the generator does not see what comes
    // after, and so has no way to require it. The large prefix (RULES) stays identical
    // between batches, so prompt caching still applies.
    // Position in the COURSE, not in the batch: with `--topics 7-12` the index inside the
    // slice is 0..5, and cutting the syllabus by it would hide exactly what was taught.
    const upTo = course.topicos.indexOf(batch[batch.length - 1]) + 1;
    const r = await ask({
      stage: 'generate',
      system: `${RULES(options)}\n\n---\n\n${courseContext(course, { upTo })}`,
      schema: schema(options),
      maxTokens: OUTPUT_CEILING,
      question: `Escreva os exercícios para estes tópicos:\n\n${batch.map((t, i) => `${i + 1}. ${t}`).join('\n')}`,
    });
    if (!r.error) return { exercises: r.exercises ?? [] };

    // Truncation is no reason to lose the whole batch: half the topics fit in half the
    // budget. Only give up when it is already a single topic.
    if (r.truncated && batch.length > 1) {
      const half = Math.ceil(batch.length / 2);
      onProgress?.(`  ${label}: truncated with ${batch.length} topics, splitting in two`, 0, 0);
      const [a, b] = await Promise.all([
        write(batch.slice(0, half), `${label}a`),
        write(batch.slice(half), `${label}b`),
      ]);
      return { exercises: [...a.exercises, ...b.exercises] };
    }
    return { exercises: [], error: r.error };
  }

  const perBatch = await concurrentMap(batches, parallel, async (batch, n, finish) => {
    const label = `batch ${n + 1}`;
    const { exercises, error } = await write(batch, label);
    const done = finish();
    if (error && !exercises.length) {
      onProgress?.(`  ${label} failed: ${error}`, done, batches.length);
      return [];
    }
    onProgress?.(`  ${label}: ${exercises.length} exercises`, done, batches.length);
    return exercises;
  });

  return perBatch.flat();
}

export function countByType(exercises) {
  const c = exercises.reduce((a, e) => ((a[e.type] = (a[e.type] || 0) + 1), a), {});
  return Object.entries(c)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${v} ${k}`)
    .join(', ');
}

export { summary };
