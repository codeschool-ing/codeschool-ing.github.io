/* Every prompt in the pipeline in one place, for reading and for attaching.
 *
 * They are the most expensive asset in this codebase: every paragraph came out of a real
 * defect, and together they weigh more than the code that sends them. Spread across four
 * files, they were impossible to read in one go and impossible to attach without someone
 * cutting and pasting by hand — and "cut and paste by hand, on the spot, without slipping" is
 * the kind of instruction that fails silently.
 *
 * `prompts.md` is generated from here and versioned, and a test checks that the file matches
 * what this module produces. Editing a prompt without regenerating breaks the test instead of
 * leaving a stale attachment in circulation.
 */
import { RULES } from './generate.mjs';
import { RULES_BY_TYPE } from './types.mjs';
import { SYS_SOLUTION } from './validate.mjs';
import { SYS_BLIND, SYS_BLIND_PAIRS, SYS_HINT_OPEN, SYS_HINT_OPTIONS, SYS_JUDGE } from './critique.mjs';
import { INSTRUCTIONS } from './rewrite.mjs';
import { SYS_WRITE, SYS_JUDGE_STATEMENTS } from './blind.mjs';

/* The authoring frame interpolates the rules by type inside itself. Showing both in full would
 * repeat the largest prompt in the codebase and make the word count lie by 2,800 — so the
 * interpolated part becomes a marker, and each one appears exactly once. */
const MARKER = '\n\n> ⟨the rules by type go here, prompt 2 in this list⟩\n\n';
function frame(settings) {
  const whole = RULES(settings);
  const inner = RULES_BY_TYPE(settings);
  return whole.includes(inner) ? whole.replace(inner, MARKER) : whole;
}

/* The order is the funnel's, not the files': whoever reads this wants to understand the pipeline. */
export const PROMPTS = ({ options = 5 } = {}) => [
  {
    name: 'Authoring — the frame',
    stage: 'generate',
    role: 'Opens the system prompt of whoever writes. It pins what the school is (machine grading, no teacher on the other side) and the constraint of topic order. The rules by type are interpolated at the marked point.',
    text: frame({ options }),
  },
  {
    name: 'Authoring — rules by type',
    stage: 'generate',
    role: 'The largest of them all and the one that yields the most. It describes the seven types and, for each one, the defects that have already appeared and how not to repeat them. It is the text a rebuild cannot derive from a summary.',
    text: RULES_BY_TYPE({ options }),
  },
  {
    name: 'Blind authoring — write the statements',
    stage: 'blind',
    role: 'Experimental. Writes the N options knowing how many will be true and never which. It attacks the whole family of form tells at its source: when whoever writes knows which one is correct, it comes out better, and the student gets it right by form.',
    text: SYS_WRITE,
  },
  {
    name: 'Blind authoring — judge each statement',
    stage: 'blind',
    role: 'A separate call, with no memory of the previous one. It is this judgement that becomes the key — and the count of true statements stops being decreed by the author and comes to be established by a reader.',
    text: SYS_JUDGE_STATEMENTS,
  },
  {
    name: 'Blind reference solution',
    stage: 'validate',
    role: 'Writes the solution to a code exercise WITHOUT seeing the test cases. The blindness is the point: agreeing blind with the cases is evidence that the statement and the key describe the same thing.',
    text: SYS_SOLUTION,
  },
  {
    name: 'Blind probe',
    stage: 'critique',
    role: 'Answers the question without seeing what is marked correct. If it diverged from the key, somebody is wrong — and it also reports ambiguity, which is when more than one reading defends itself.',
    text: SYS_BLIND,
  },
  {
    name: 'Blind pair probe',
    stage: 'critique',
    role: 'The same for `matching`, which went four rounds with no probe at all — only the judge looked at it, and the judge is the weakest instrument in the funnel. The right column goes in alphabetical order, never in the order it was written: in the JSON the correct pair is left[i] ↔ right[i], and presenting it that way would hand over the key by position.',
    text: SYS_BLIND_PAIRS,
  },
  {
    name: 'Hint probe — types without options',
    stage: 'critique',
    role: 'Judges whether the hint hands over the solution in a code or expected-output exercise.',
    text: SYS_HINT_OPEN,
  },
  {
    name: 'Hint probe — types with options',
    stage: 'critique',
    role: 'The same, for options questions, where the false positive is the risk: every useful hint narrows the field, and narrowing is not a defect. Separate from the previous one for that reason.',
    text: SYS_HINT_OPTIONS,
  },
  {
    name: 'Judge',
    stage: 'critique',
    role: 'The pipeline\'s only opinion pass, for what a probe cannot reach: an ambiguous statement, a debatable key, an implausible distractor, scope outside the topic. It has to know the school\'s conventions, or it reports design decisions as defects — and it is forbidden from judging how generous a hint is, which belongs to the probe.',
    text: SYS_JUDGE,
  },
  {
    name: 'Rewrite',
    stage: 'rewrite',
    role: 'Accompanies the failed exercise and its report. It says that the defect is fact and the suggested fix is a guess, and that type and topic are pinned.',
    text: INSTRUCTIONS,
  },
];

const words = (s) => s.trim().split(/\s+/).length;

export function build(settings) {
  const list = PROMPTS(settings);
  const L = [];

  L.push('# The pipeline prompts, in full');
  L.push('');
  L.push('Generated by `node exercises.mjs --prompts`. **Do not edit this file** — edit the prompt');
  L.push('in the code and run the command again; `npm test` checks that the two agree.');
  L.push('');
  L.push('This is the prompt attachment for [`REBUILD.md`](REBUILD.md). It exists because the');
  L.push('description of a prompt does not replace the prompt: what disappears in a summary are the');
  L.push('worked cases, and a concrete case is obeyed where an abstract rule is obeyed sometimes.');
  L.push('');
  L.push(`Options per question: ${settings?.options ?? 5}.`);
  L.push('');
  L.push('| # | prompt | stage | words |');
  L.push('| --- | --- | --- | --- |');
  for (const [i, p] of list.entries()) L.push(`| ${i + 1} | ${p.name} | \`${p.stage}\` | ${words(p.text)} |`);
  L.push(`| | **total** | | **${list.reduce((s, p) => s + words(p.text), 0)}** |`);

  for (const [i, p] of list.entries()) {
    L.push('');
    L.push('---');
    L.push('');
    L.push(`## ${i + 1}. ${p.name}`);
    L.push('');
    L.push(`**Stage:** \`${p.stage}\` · **${words(p.text)} words**`);
    L.push('');
    L.push(p.role);
    L.push('');
    // A fence of four backticks: the prompts contain code blocks with three.
    L.push('````');
    L.push(p.text.trim());
    L.push('````');
  }

  L.push('');
  return L.join('\n');
}
