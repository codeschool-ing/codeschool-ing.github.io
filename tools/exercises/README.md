# Exercise pipeline

Generates, validates and critiques self-gradable exercises from the catalogue's topics. It
replaces the three separate tools that existed before.

**The rules this pipeline enforces, and the defect that caused each one, are in
[`RULES.md`](RULES.md).** The prompts in the code are the implementation; that file is the
source. A new rule goes there first — see the golden rule in the root
[`CLAUDE.md`](../../CLAUDE.md).

```
generate  →  validate  →  critique  ─┐
 writes       executes     judges    │
   ▲                                 │
   └──────  rewrite  ◀───────────────┘
            whatever fell, with the report in hand
```

What fails is not discarded: it goes back to the generator with the defect named and passes
through the whole funnel again. One lap by default (`--rewrite N`, `0` turns it off).

At the end of every complete cycle the run answers by itself whether the round improved — see
[the verdict](#did-the-round-improve-or-not).

## A note on language

**English is the source language, for the exercises as much as for the code.** Portuguese is a
translation layer, like Spanish, French and Italian — the same shape the catalogue uses. The
mechanical checks in `lib/types.mjs` analyse the source, so their vocabulary is English; it was
Portuguese only because the source was, which was a consequence and never a policy.

A translation is judged against its source, not against the checks. What decides an answer —
`correct`, expected outputs, answer keys — is never translated.

## Running it

```sh
cd tools/exercises
npm install
export ANTHROPIC_API_KEY=sk-ant-...

node exercises.mjs python --max 3           # the whole cycle
```

**The default is to run everything.** The target is a course id or a `.json` file — the script
tells them apart by the suffix and starts at whichever stage makes sense.

```sh
node exercises.mjs python --max 3             # generates, validates and critiques
node exercises.mjs python --to generate       # generates only
node exercises.mjs out.json                   # resumes: validates and critiques
node exercises.mjs out.json --from critique   # critiques only
```

Resuming from a file is what makes it cheap to fix a key by hand and re-check without
regenerating — and without paying again, because the reference solution is saved in the
approved exercise.

| option | default |
| --- | --- |
| `--from` / `--to` | `generate` (or `validate`, if the target is a `.json`) through `critique` |
| `--max N` | all of them — **use `--max 3` the first time**, it costs cents |
| `--topics A-B` | none; the range of topics A to B (1-based), to advance through a long course |
| `--batch N` | 6 topics per call |
| `--options N` | 5 |
| `--timeout N` | 10 s per test case |
| `--parallel N` | 4 simultaneous calls |
| `--rewrite N` | 1 repair lap for whatever fails (`0` turns it off) |
| `--blind` | writes the options without knowing which ones are correct (**experimental**) |
| `--structure-only` | validate with no API and no execution (free) |
| `--probes-only` | critique without the judgement (cheaper) |
| `--dry` | generate without calling the API |
| `--courses` | lists the catalogue's ids |
| `--view [N]` | reads a `.json`'s exercises in human form |
| `--prompts` | writes `prompts.md` with every prompt in full |
| `--reach` | how much of the already-paid rejections the checks would catch for free |

Languages the validator can execute: **python**, **javascript** and **sql** (in-memory SQLite).

The cost comes out per stage and totalled, in a single account.

### Before spending

```sh
npm test        # mechanical checks, rewrite guards, funnel bookkeeping
```

It runs in a second and calls no API. The 48 hand-reviewed exercises are the mechanical
checks' permanent corpus: none of them may be flagged by any check, and each check also keeps
the real case that motivated it. Loosening a rule by accident breaks a test instead of
slipping past unnoticed.

### Production without the API

When there is no budget for the critique, it is possible to produce with the two free layers:
the mechanical check and **execution**. The type that verifies completely that way is
`expected-output` — the interpreter runs the snippet and compares byte for byte, with no
judgement in between.

`code` does **not** verify for free: the reference solution is written blind by an API call,
and it is that blindness that gives the result its value. Whoever writes by hand can run a
solution of their own against the cases, which catches a wrong key, but does not catch "there
is a shortcut that ignores the topic" — for that the oracle has to have not seen the cases.

Every approved exercise carries `_verification`, and the portal should use it to decide what
to publish first:

| value | what it guarantees |
| --- | --- |
| `critiqued` | it passed the probes and the judge — the strongest mark |
| `execution` | the interpreter confirmed the key |
| `structure` | the mechanical checks only; nothing confirmed the key |

### Did the round improve or not?

Every complete cycle writes a line into `history.json` and ends with a three-state verdict —
`IMPROVED`, `STALLED` or `WORSE`:

```
progress — docker, against the round of 2026-08-03 03:40
  first pass ...... 8/18 (44%)   before 8/18 (44%)   0 pp
  caught free ..... 1 of 10 (10%)   before 0 of 10 (0%)   +10 pp
  cost/approved ... US$ 0.327   before US$ 0.335   -2%
  paid causes ..... distractors 6 · hint 5 · key 1

  IMPROVED — the tool catches 10 pp more of the defects by itself, without paying the API.
```

The number that decides is **not the approval rate**: it moves with the course and with the
topic, and it rises by itself if the generator turns timid. What measures the tool is the
division of labour — how many defects were caught by computation, for free, against how many
only appeared after paying the API. Every rule that becomes arithmetic pushes a defect from
one column to the other.

The rate is the **first pass** only: a rescue by the rewrite is a bought approval, and adding
the two makes a stalled round look like a leap.

The comparison is always against the previous round **of the same course**: docker against
python would measure the subject, not the tool.

### Reading what came out

```sh
node exercises.mjs exercises-python.json --view      # all of them
node exercises.mjs exercises-python.json --view 26   # only number 26
```

It shows the statement, the body with the key marked, the hint and — if the file is a
`.critiqued` or a `.rejected` — the critique's findings.

**This exists because review by a person is the pipeline's only external signal.** All the
rest is the same model judging itself: the probes anchor part of it, execution proves another
part, but "is this exercise worth a student's time?" has no automatic answer. While the
content existed only as JSON, that signal was blocked by format friction — and a signal that
costs effort is not collected.

### What is versioned

`exercises-<course>.json` goes into the repository: it is content, it cost money and review to
exist, and it is the input to everything else. Each round's derivatives — `.validated`,
`.failed`, `.critiqued`, `.rejected` and the timestamped copies — stay out, because they are
remade by running the pipeline over the same file. The `.gitignore` tells the two apart by the
second dot in the name (`exercises-*.*.json`).

## Parallelism

The three stages run with **4 simultaneous calls** by default (`--parallel N`). The pipeline
spends almost all the wall clock waiting on the network: a 48-topic course is ~200 exercises,
each with up to four calls in sequence. Done serially that is hours of waiting.

The number in brackets is the **exercise's index in the file**, not progress: with parallelism
the results arrive out of order, and a completion counter did not let you find the
corresponding line in the JSON. That is why the lines come out shuffled — it is identity, not
counting. It is what lets you cross a critique finding with the exercise that produced it.

**The results come back in input order**, even when they finish out of order — the generated
file must not depend on who answered first, or two identical runs produce different files.
Checked: `--parallel 1` and `--parallel 8` produce byte-identical JSON.

Raise the number if you do not hit a rate limit; the SDK already retries a 429 by itself with
backoff. Drop it to 1 when you want to debug an error without interleaved output.

## The seven types

| type | the student does | graded by | serves for |
| --- | --- | --- | --- |
| `code` | writes the solution | execution against test cases | a language or a tool |
| `expected-output` | types what the snippet prints | execution of the snippet itself | semantics, precedence, types |
| `quiz` | picks one | comparison | a concept with a single reading |
| `multiple-choice` | picks several | exact-set comparison | a concept with several aspects |
| `ordering` | puts them in order | sequence comparison | a process, a pipeline, a lifecycle |
| `matching` | pairs up two columns | comparison of the mapping | command and effect, error and cause, term and definition |
| `expression-answer` | writes an expression | **symbolic equivalence (sympy)** | derivative, integral, simplification |

**`expected-output` is the strongest type of the set.** The validator runs the snippet shown
and compares it with the key, so a semantic defect becomes a deterministic failure instead of
depending on judgement. That is how `-7 ** 2 = 49` — right for the variable, wrong for the
literal — came to be caught by execution.

**`ordering` exists because of the 24 infrastructure and security subjects**, where what is
taught is order of operations and almost nothing executes. Without it, those courses would be
left with quiz alone. It is no longer generated automatically — see `GENERATABLE_TYPES` in
`lib/types.mjs` for why, and for the criterion to bring it back.

**`matching` is the most versatile one outside programming.** The defect that defines it is
ambiguity: if an item on the right can be defended for two entries on the left, there is more
than one key. The structural check rejects a column with a repeated item; a blind probe asks
which pairings defend themselves, and any left item that accepts two fails the exercise.

**`expression-answer` is the only type whose key is proved.** In the others, the key's
correctness is evidence: the blindly written solution agrees, the critic found no defect. Here
sympy **recomputes the answer on its own** from the source expression and compares. If they
diverge, the key is wrong — demonstrated, not judged.

```
right integral    ok       sympy recomputes and agrees: x**3/3
WRONG integral    FAILED   key "x**3/2", but the check computes "x**3/3"
```

An exercise with `check_operation: none` **fails**: with no recomputation, nobody verified the
key, and approving it would stamp a mark on something unchecked.

Comparison is by equivalence, not by text: `2*x`, `x*2` and `x+x` are the same answer. In an
integral, `+ C` is accepted — the difference that does not contain the integration variable is
the constant.

Careful with the domain: without `x:positive` in `variables`, sympy does not simplify
`sqrt(x**2)` to `x`, and the student who answers that way is failed. Declare the assumption
when the statement implies it.

### Reusing it in another subject

Five of the seven types — `quiz`, `multiple-choice`, `ordering`, `matching`,
`expression-answer` — presuppose no programming (the `NEUTRAL_TYPES` constant marks them).
Only `code` and `expected-output` depend on an interpreter.

For **mathematics** (calculus, algebra, entrance exams), the set already serves today:
`expression-answer` covers the central exercise, `ordering` covers a step-by-step method,
`matching` covers function↔derivative, and the option types cover the exam format.

What still ties the pipeline to this catalogue is `lib/catalog.mjs`, which reads
`assets/catalog.js` and expects the fields `topics`, `syllabus`, `level`. For another school,
that module is what changes — the rest travels. Worth knowing before adding new coupling in
other files.

## The three stages

**Generate.** It receives the course's topics in the order they are taught and treats that
order as a constraint: an exercise for topic N may only require what topics 1..N have taught.
The syllabus is cut at the batch's last topic, so the generator cannot require what it cannot
see. The option rules cover the four defects that showed up in almost every generated quiz —
the correct one longer than the wrong ones, filler distractors, absolutes an exam-taker
discards out of habit, and wrong ones from one category with the correct one from another.

**Validate.** Structure for free, then execution. In `code`, it writes a reference solution
**without seeing the test cases** and runs it against them: blind, agreeing becomes evidence
that the statement and the key describe the same thing; disagreeing means one of the two is
wrong, and the validator does not guess which. In `expected-output`, it runs the snippet
directly.

**Critique.** Behavioural probes and one judgement. The blind probe answers the question
without seeing the key; the pair probe asks which pairings defend themselves; the hint probe
tries to solve the exercise seeing only the statement, the body and the hint. A probe is worth
more than an opinion: asking a model to "assess the quality" of a text written by another
model invites agreement.

The severity ruler is one question: **does this change who passes?** Getting it right by
elimination without knowing the subject is high severity, not a stylistic caveat.

## Measured cost

Real numbers, `claude-opus-5`:

| stage | per exercise |
| --- | --- |
| generate | US$ 0.028 |
| validate | US$ 0.003 |
| critique | US$ 0.067 – 0.077 |

Critiquing costs ~2.5× generating: it is up to four calls per exercise, each one reasoning
about the whole exercise. **96% of the spend is output tokens**, so touching context or
caching yields little — what changes the bill is how many exercises per topic.

Execution costs about 50× less than judgement (US$0.02 against US$0.98 in one round) and
catches a wrong key deterministically, which is why the free layers are worth pushing first.

## Security

**It runs AI-generated code on your machine**, with a per-case timeout and nothing else. Do
not run a JSON you did not generate. For volume, run it in a disposable container — which is
how the portal will execute student code anyway.

**`expression-answer` needs `sympy`** (`pip install sympy`). The script checks before
validating and exits with code 2 if it is missing. It is an optional dependency: it only comes
in when there is an exercise of that type. `sympify` runs over text generated by the model —
in the portal, applied to **student** text, it demands restricted parsing and a sandbox,
because it is code execution.

The script checks the interpreters exist before validating and **exits with code 2** if any is
missing — without that, an absent `python3` becomes "every exercise failed" and sends you
hunting for a defect in the content. Exit codes: `0` everything passed, `1` something failed,
`2` the environment does not allow validating.

## What is still missing

- **Deduplication** between neighbouring topics.
- **Ingestion into the portal**: a loose JSON comes out; the database is Stage 2's job.
