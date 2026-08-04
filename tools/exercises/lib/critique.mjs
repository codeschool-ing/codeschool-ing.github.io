/* Stage 3: judge what execution does not reveal — target, ambiguity, key, distractors.
 *
 * Two behavioural probes are worth more than the judgement: a model asked to "assess the
 * quality" of a text written by another model tends to agree. A probe observes behaviour;
 * judgement is opinion.
 *
 * The exercises are in Brazilian Portuguese, so the probes read Portuguese and are told to
 * answer in it where the answer is prose the student may end up reading.
 */
import { courseContext } from './catalog.mjs';
import { ask } from './claude.mjs';
import { concurrentMap } from './parallel.mjs';

/* ---- probe: answer blind ---------------------------------------------------- */

export const SYS_BLIND = `You answer multiple-choice questions written in Brazilian Portuguese. You
do not know which options are marked correct — choose on the merits.

If more than one reading is defensible, say so in "ambiguous" and explain. A well-written
question has exactly one defensible set of answers.`;

const SCH_BLIND = {
  type: 'object',
  properties: {
    choices: { type: 'array', items: { type: 'integer' }, description: 'chosen indices, starting at 0' },
    ambiguous: { type: 'boolean' },
    explanation: { type: 'string' },
  },
  required: ['choices', 'ambiguous', 'explanation'],
  additionalProperties: false,
};

async function blindProbe(e) {
  const multi = e.type === 'multiple-choice';
  const r = await ask({
    stage: 'critique',
    system: SYS_BLIND,
    schema: SCH_BLIND,
    maxTokens: 4000,
    question: `${e.statement}${multi ? '\n\n(mais de uma alternativa pode estar correta)' : ''}\n\n${e.options
      .map((a, i) => `${i}. ${a.text}`)
      .join('\n')}`,
  });
  if (r.error) return { error: r.error };
  const key = e.options.map((a, i) => (a.correct ? i : -1)).filter((i) => i >= 0);
  const choices = [...(r.choices ?? [])].sort();
  const matched = choices.length === key.length && choices.every((v, i) => v === key[i]);
  return { choices, key, matched, ambiguous: r.ambiguous, explanation: r.explanation };
}

/* ---- probe: pair up blind --------------------------------------------------- */

/* `matching` went four rounds with no probe at all: only the judge looked at it, and the judge
 * is the weakest instrument in the funnel. In a round where 2 of 2 matchings failed, all five
 * rejections were from the same family — "situation 1 fits two of the effects on the right
 * equally well" —, which is exactly what a probe measures and an opinion does not.
 *
 * The right column goes in alphabetical order, never in the order it was written: in the JSON
 * the correct pair is left[i] ↔ right[i], and presenting it that way would hand over the key
 * by position. */
export const SYS_BLIND_PAIRS = `You receive two columns and answer a single question: for each row
on the left, **which** rows on the right defend themselves as its pair?

Do not pick the best one. List **all** the ones someone who knows the subject could defend with
a correct argument, not merely a plausible one. If only one defends itself, return one. If two
do, return two — that is the information that matters.

Not every row on the right belongs to one on the left: some are left over, and you do not know
how many. A row on the left may have no defensible pair at all; in that case return the empty
list.

**Why the question is phrased this way.** Grading is by exact set: if one left row accepts two
defensible pairs, the student who knows the subject may pick the other one and lose the whole
exercise. Asking "which is the pair" would hide that, because you would pick one and be done.
Asking "which ones defend themselves" is what exposes the defect.

Rigour: "defends itself" means having a correct mechanism that sustains the pairing, not
vocabulary similarity nor vague plausibility.

**Do not be economical out of prudence.** Failing to list a second right-hand row that holds up
is not caution: it is erasing the very defect this question exists to find. The criterion is
the student who knows the subject — if they could defend the second pairing in a conversation
with the teacher, it goes on the list, even if you think the first is better.

The two columns are in Brazilian Portuguese; write your justification in Portuguese too.`;

const SCH_BLIND_PAIRS = {
  type: 'object',
  properties: {
    defensible: {
      type: 'array',
      description: 'one entry per row on the left, in the same order',
      items: {
        type: 'object',
        properties: {
          rights: { type: 'array', items: { type: 'integer' }, description: 'indices on the right that defend themselves as the pair' },
          why: { type: 'string', description: 'if there is more than one, the argument that sustains the second' },
        },
        required: ['rights', 'why'],
        additionalProperties: false,
      },
    },
  },
  required: ['defensible'],
  additionalProperties: false,
};

/* Two readings come out of the same answer, and they are different defects:
 *   · a left row with two defensible pairs        → ambiguity, it fails whoever knows;
 *   · the key's pair missing from its left row's list → it is the key that does not hold up. */
async function blindPairsProbe(e) {
  const r0 = await askPairs(e);
  return r0.error ? assessPairs(e, await askPairs(e)) : assessPairs(e, r0);
}

async function askPairs(e) {
  const right = [...e.pairs.map((p) => p.right), ...(e.right_distractors ?? [])].sort((a, b) => a.localeCompare(b, 'pt'));
  const r = await ask({
    stage: 'critique',
    system: SYS_BLIND_PAIRS,
    schema: SCH_BLIND_PAIRS,
    maxTokens: 6000,
    question: `## Contexto\n${e.statement}\n\n## Esquerda\n${e.pairs
      .map((p, i) => `${i}. ${p.left}`)
      .join('\n')}\n\n## Direita\n${right.map((t, i) => `${i}. ${t}`).join('\n')}`,
  });
  return { r, right };
}

function assessPairs(e, { r, right }) {
  if (r.error) return { error: r.error };

  const disputed = [];
  const unsupported = [];
  for (const [i, p] of e.pairs.entries()) {
    const list = r.defensible?.[i]?.rights ?? [];
    const expected = right.indexOf(p.right);
    if (list.length > 1) disputed.push({ i, n: list.length, why: r.defensible[i].why });
    if (list.length && !list.includes(expected)) unsupported.push(i);
  }
  return { disputed, unsupported };
}

/* The guessing probe was removed. It asked a model to answer "forbidden to use knowledge of
 * the subject", with test-taking heuristics only. It hit the key 9 times out of 9 and failed a
 * whole course: a model does not suspend what it knows, so it fabricates a form-based
 * justification for the answer it already believes in — in one case it noticed an absolute in
 * the correct option and argued that it "came qualified" so it could still be included.
 *
 * A probe that has to answer always answers, and becomes opinion under another name. The
 * heuristics it used to list became `formTells` in types.mjs: computed, free, and unable to
 * confabulate. Calibrated against 48 hand-written exercises: zero false positives.
 *
 * The lesson not to lose: only ask a probe what it is able to refuse to answer. */

/* ---- probe: does the hint give away the answer? ---------------------------- */

export const SYS_HINT_OPEN = `You receive an exercise and a study hint, both in Brazilian
Portuguese. Judge whether the hint hands over the solution.

Mark "gives_away" true if it contains the exact name of the function to call, the finished
algorithm, or the output value. Mark it false if it only points in a direction, asks a
question, or names the concept to review.

Criterion: would someone who read only the hint, without knowing the subject, produce the
answer?

Write the explanation in Portuguese.`;

export const SYS_HINT_OPTIONS = `You receive a multiple-option question and a study hint, both in
Brazilian Portuguese. Judge whether the hint makes the exercise useless.

**Beware of the false positive.** In an options question, any useful hint narrows the field —
that is what it exists for. Narrowing is not a defect. The defect is the hint **replacing
understanding**: whoever reads it marks the right one without being able to explain why.

True only when the hint practically reproduces the text of the correct option, states the whole
decision criterion ready to apply, or rules out the strongest distractor by itself. False when
it indicates what to examine, proposes a test the student still has to carry out, or names the
concept without resolving it.

Write the explanation in Portuguese.`;

const SCH_HINT = {
  type: 'object',
  properties: { gives_away: { type: 'boolean' }, explanation: { type: 'string' } },
  required: ['gives_away', 'explanation'],
  additionalProperties: false,
};

const WITH_OPTIONS = new Set(['quiz', 'multiple-choice']);

/* What the STUDENT sees: the body of the exercise with nothing that reveals the key.
 *
 * The probe used to receive only statement + hint. For `expected-output` the statement is "what
 * does this snippet print?" — without the snippet there was nothing to judge; for quiz, it
 * never saw the options. Blind like that, it approved everything, and the judge (with no
 * calibration for hints) ended up deciding alone. */
function bodyForProbe(e) {
  if (WITH_OPTIONS.has(e.type)) return e.options.map((a, i) => `${i}. ${a.text}`).join('\n');
  if (e.type === 'expected-output') return `Trecho mostrado (${e.language}):\n${e.given_code}`;
  if (e.type === 'code') return `Linguagem: ${e.language}\nEsqueleto:\n${e.skeleton}`;
  if (e.type === 'ordering') return `Passos, embaralhados como o aluno os vê:\n${[...e.items].sort().map((t) => `· ${t}`).join('\n')}`;
  if (e.type === 'matching')
    return `Coluna da esquerda:\n${e.pairs.map((p) => `· ${p.left}`).join('\n')}\n\nColuna da direita, embaralhada:\n${[
      ...e.pairs.map((p) => p.right),
      ...(e.right_distractors ?? []),
    ].sort().map((t) => `· ${t}`).join('\n')}`;
  if (e.type === 'expression-answer') return `Variáveis: ${(e.variables ?? []).join(', ')}`;
  return '';
}

async function hintProbe(e) {
  return ask({
    stage: 'critique',
    system: WITH_OPTIONS.has(e.type) ? SYS_HINT_OPTIONS : SYS_HINT_OPEN,
    schema: SCH_HINT,
    maxTokens: 3000,
    question: `## Exercício\n${e.statement}\n\n## O que o aluno vê\n${bodyForProbe(e)}\n\n## Dica\n${e.socratic_hint}`,
  });
}

/* ---- judgement -------------------------------------------------------------- */

export const SYS_JUDGE = `You review exercises for a programming school where grading is entirely
automatic — there is no teacher to undo a misunderstanding. An ambiguous or off-target exercise
fails a student who understood the subject.

The exercises are written in Brazilian Portuguese; write your findings in Portuguese too, since
they are read alongside the exercise.

## How this school works — do not judge these decisions, they are already made

**\`quiz\` has exactly one correct option. \`multiple-choice\` has two or more, and the interface
allows several to be marked.** The two names designate different types here. Do not report as a
defect the fact that a \`multiple-choice\` has more than one correct answer, nor speculate about
what would happen if the interface accepted only one mark: it accepts several. Grading is by
exact set.

**In \`expected-output\`, the student types the text the program prints.** There is no notation,
no quotes, no escapes: the field receives the text and the comparison ignores trailing
whitespace. Do not report ambiguity in how a line break is represented.

**Each option's "why" field is post-answer feedback**, shown after the student answers. It does
not appear next to the options, so it does not count as a tell.

**Do not judge whether the hint gives away too much. That has already been measured another
way.** Before you, a behavioural probe tried to solve the exercise seeing only the statement,
the body and the hint; its result enters the verdict alongside yours. A probe observes
behaviour, you give an opinion — and opinion about hints always errs the same way, because
**every useful hint narrows the field**. If the ruler is "it told me something that helps me
decide", no hint survives, and the exercise ends up failed for what is best about it.

Use the \`hint\` dimension only when it is **wrong**: it states something false, describes the
exercise incorrectly, points at the wrong block of code, contradicts the statement or the key.
A hint that leads to the wrong answer fails whoever knows — that one is yours. How much it
makes things easier is not.

Your task is to **find defects**, not to praise. The failure to avoid is approving an exercise
with a real problem; listing a non-existent problem is less serious. If there is no defect,
return the empty list — but look properly first.

Defects that have already shown up in this catalogue:

**target** — measures something other than the declared topic. Real example: in a course about
the architect's role, an exercise asked for a graph search to be implemented. That measures
programming, not architecture. Requiring content from a later topic also counts as a wrong
target: an exercise on "installation and first script" that needs \`strip()\`, a conditional and
an f-string fails whoever masters the topic being assessed.

**statement** — ambiguous, or contradicts the language's semantics. Real example: an exercise
about operators displaying \`-7 ** 2 = 49\`. The value is right for the variable, but whoever
types \`-7 ** 2\` into the interpreter sees -49. Failing to specify the required output when
grading is by exact comparison also counts.

**key** — the marked answer is not the best one, or another defends itself equally well. In
\`ordering\`, two steps that can swap places without harm mean two keys. In \`matching\`, test
each item on the right against **all** the left ones: if any of them pairs plausibly with two,
the exercise has more than one right answer.

**distractors** — wrong ones too obvious; or the correct one longer and more qualified than the
others, giving itself away by format; or absolutes that a test-taker discards out of habit; or
the wrong ones all from one category and the correct one from another.

**The severity ruler is one question: does this change who passes?**

Mark **high** when the defect makes the exercise approve someone who does not know, or fail
someone who does. No exceptions, even when the fix is easy:

- it can be got right by elimination, by format, by option length or by test-taking heuristics,
  without understanding the topic — the exercise measures nothing;
- it requires content from a later topic;
- a factual error, or ambiguity that changes which answer is right;
- the required output is not in the statement, and grading is by exact comparison.

Mark **low** only for what changes nobody's result.

Do not use "low" as a polite middle ground. An exercise that any student gets right without
studying is defective even when it is well written.`;

const SCH_JUDGE = {
  type: 'object',
  properties: {
    problems: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          dimension: { type: 'string', enum: ['target', 'statement', 'key', 'distractors', 'hint'] },
          severity: { type: 'string', enum: ['high', 'low'] },
          explanation: { type: 'string' },
          suggestion: { type: 'string' },
        },
        required: ['dimension', 'severity', 'explanation', 'suggestion'],
        additionalProperties: false,
      },
    },
  },
  required: ['problems'],
  additionalProperties: false,
};

function body(e) {
  if (WITH_OPTIONS.has(e.type))
    return e.options.map((a, i) => `${i}. [${a.correct ? 'CORRETA' : 'errada'}] ${a.text}\n   porque: ${a.why}`).join('\n');
  if (e.type === 'code')
    return `Linguagem: ${e.language}\nEsqueleto:\n${e.skeleton}\nCasos:\n${e.tests
      .map((t) => `  ${t.description}: entrada ${JSON.stringify(t.input)} → ${JSON.stringify(t.expected_output)}`)
      .join('\n')}`;
  if (e.type === 'expected-output')
    // JSON.stringify here produced 9 identical rejections complaining of a "key in string
    // notation, with quotes and an escaped \n". The critic was judging the prompt's
    // formatting: the stored data is bytes with a real line break. Show the real text.
    return `Linguagem: ${e.language}\nTrecho:\n${e.given_code}\nSaída esperada — é este texto que o aluno digita, não uma representação dele:\n<<<INÍCIO\n${e.answer}FIM>>>\n(termina com quebra de linha: ${e.answer.endsWith('\n') ? 'sim' : 'não'})`;
  if (e.type === 'ordering')
    return `Ordem correta:\n${e.items.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\nArmadilha declarada pelo autor: ${e.trap}\n(o portal embaralha os passos; julgue se a ordem é dedutível do texto sem saber o tópico)`;
  if (e.type === 'expression-answer')
    return `Variáveis: ${(e.variables ?? []).join(', ')}\nGabarito: ${e.answer_expression}\nVerificação: ${e.check_operation}(${e.check_source}, ${e.check_variable})`;
  if (e.type === 'matching')
    return `Pares corretos:\n${e.pairs.map((p, i) => `${i + 1}. ${p.left}  ↔  ${p.right}`).join('\n')}
\nDistratores na coluna da direita (não emparelham com nada, e o aluno não sabe quais são):
${(e.right_distractors ?? []).map((t) => `  · ${t}`).join('\n')}
(o portal embaralha a direita inteira, corretas e distratores juntos)`;
  return '';
}

async function judge(e, course) {
  return ask({
    stage: 'critique',
    system: SYS_JUDGE,
    schema: SCH_JUDGE,
    question: `${courseContext(course)}\n\n---\n\n## Exercício (tipo: ${e.type}, dificuldade: ${e.difficulty})
## Tópico declarado: ${e.topic}

### Enunciado
${e.statement}

### Corpo
${body(e)}

### Dica socrática
${e.socratic_hint}`,
  });
}

/* ---- the pass --------------------------------------------------------------- */

export async function critique({ exercises, course, probesOnly, parallel, onProgress }) {
  const verdicts = await concurrentMap(exercises, parallel, async (e, i) => {
    const findings = [];

    if (WITH_OPTIONS.has(e.type)) {
      const blind = await blindProbe(e);
      if (blind.error)
        findings.push({ dimension: 'key', severity: 'high', explanation: `a sonda cega falhou: ${blind.error}`, suggestion: 'rodar de novo' });
      else {
        if (!blind.matched)
          findings.push({
            dimension: 'key',
            severity: 'high',
            explanation: `às cegas escolhi [${blind.choices}], o gabarito é [${blind.key}]. ${blind.explanation}`,
            suggestion: 'conferir qual está certa; se ambas se defendem, reescrever',
          });
        if (blind.ambiguous)
          findings.push({ dimension: 'statement', severity: 'high', explanation: `ambígua às cegas: ${blind.explanation}`, suggestion: 'deixar uma leitura só' });
      }
    }

    if (e.type === 'matching' && (e.pairs?.length ?? 0) > 0) {
      const r = await blindPairsProbe(e);
      if (r.error)
        findings.push({ dimension: 'key', severity: 'high', explanation: `a sonda de pares falhou: ${r.error}`, suggestion: 'rodar de novo' });
      else {
        for (const d of r.disputed ?? [])
          findings.push({
            dimension: 'key',
            severity: 'high',
            explanation: `a esquerda ${d.i} aceita ${d.n} pares defensáveis: ${d.why}`,
            suggestion: 'reescrever a esquerda ou o concorrente até sobrar um par defensável',
          });
        for (const i of r.unsupported ?? [])
          findings.push({
            dimension: 'key',
            severity: 'high',
            explanation: `às cegas, o par previsto para a esquerda ${i} não se defende`,
            suggestion: 'conferir o gabarito deste par',
          });
      }
    }

    const hint = await hintProbe(e);
    if (!hint.error && hint.gives_away)
      findings.push({ dimension: 'hint', severity: 'high', explanation: `a dica entrega a resposta: ${hint.explanation}`, suggestion: 'apontar o conceito sem resolver' });

    if (!probesOnly) {
      // One retry; if it still fails, the exercise was NOT judged — and unjudged cannot become
      // approved, or the failure of the pass silently turns into a quality mark.
      let j = await judge(e, course);
      if (j.error) j = await judge(e, course);
      if (j.error)
        findings.push({ dimension: 'target', severity: 'high', explanation: `o julgamento não completou (${j.error}) — não avaliado`, suggestion: 'rodar de novo' });
      else findings.push(...(j.problems ?? []));
    }

    const serious = findings.filter((a) => a.severity === 'high');
    // Identifying the exercise is worth more than counting progress: with parallelism the
    // results arrive out of order, and a completion counter does not let you find the line in
    // the file.
    if (serious.length) {
      onProgress?.(e, 'FAILED', serious, i + 1, exercises.length);
      return { failed: { ...e, _critique: findings } };
    }
    onProgress?.(e, 'ok', findings, i + 1, exercises.length);
    // Passing the critic is the strongest mark: the portal can publish these first.
    return { approved: { ...e, _verification: 'critiqued', ...(findings.length ? { _critique: findings } : {}) } };
  });

  return {
    approved: verdicts.filter((v) => v.approved).map((v) => v.approved),
    failed: verdicts.filter((v) => v.failed).map((v) => v.failed),
  };
}
