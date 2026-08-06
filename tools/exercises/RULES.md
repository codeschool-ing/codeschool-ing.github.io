# Consolidated rules

The canonical record of what this pipeline has learned. Every rule carries **the defect that
caused it** and **where it is enforced** — without those two columns a rule becomes folklore,
and the first person who finds it inconvenient removes it.

The prompts in `lib/types.mjs` and `lib/critique.mjs` are the *implementation*. This file is
the *source*: if the two diverge, this one wins.

> **Golden rule:** every iteration improves the tool, not just the content. A defect that can
> repeat in another course becomes a rule **before** the exercise is fixed.

**On language — this policy was wrong, and it is corrected here.** It used to say the
exercises were Portuguese "because that is what the student reads", and that the mechanical
checks' regular expressions had to stay Portuguese with them. Both halves were confusions:

- *what the student reads* is an argument for a TRANSLATION LAYER, not for a source language.
  The catalogue settled this already — English source, one dictionary per language — and the
  exercises are content exactly like the catalogue is. A Brazilian and an Italian both have to
  be able to read the exercise; only a translation layer gives them that, and pinning the
  source to Portuguese gave it to neither;
- the regular expressions were never a policy. They were a CONSEQUENCE of the source language.
  When the source moved to English they moved with it, and keeping them Portuguese would have
  left the whole free layer running over text it cannot parse — flagging nothing, and
  reporting a calibrated layer that is switched off.

**English is the source. Portuguese is a translation, like Spanish, French and Italian.** The
checks run on the source and never on a translation: a translation is judged against its
source, not against these rules.

Worked examples quoted in this file stay in Portuguese where the defect lives in the
Portuguese wording — those are historical records of rounds that happened in Portuguese, and
translating them would make them illustrate nothing.

## How to use this to generate the software from scratch

This file was written to be the input to a single prompt that rebuilds the pipeline in any
language. For that, it has to go on answering three questions per rule: what to require, why
(the real defect), and which layer the requirement lives in — mechanical check, generation
prompt, or critique pass. A rule without the "why" does not survive translation, because
whoever reimplements it does not know what is negotiable.

What should **not** go into a rebuild prompt: this school's catalogue, this API account's cost
figures, and the file names. They belong to this instance, not to the problem.

**A correction to an exclusion that was half wrong.** This paragraph also used to say "the
Python exercises". That holds for their role as *content* — they belong to a specific course
and are of no interest to anyone else. But they have a second role, **the calibration
corpus**, and that one belongs to the problem. Without it, a rebuild's mechanical checks are
born with unmeasured thresholds; the noisy layer annoys someone, they loosen the thresholds to
silence the noise, and the free layer comes to exist while flagging nothing. A rebuild prompt
**attaches** a human-reviewed corpus, along with the prompts in full and the round history —
see [`REBUILD.md`](REBUILD.md). General rule: whatever stops a lesson being paid for twice
belongs to the problem, even when the file it lives in belongs to this instance.

---

## 1. Mechanical check — fails without spending on the API

Enforced in `check()`, `lib/types.mjs`. It is free, so it runs always and first.

| rule | originating defect |
| --- | --- |
| `quiz` has exactly 1 correct option; `multiple-choice` has ≥2 and never all of them | an argument-binding question had 3 correct options marked as 1 |
| every option has `text` and `why` | — |
| `matching`: 4 to 6 pairs, no repeated item in either column | a repeated column means more than one key |
| `matching`: 1 or 2 `right_distractors`, distinct from the correct right-hand items | N against N makes the last pair come out by elimination |
| `ordering`: 4 to 7 items, none repeated | — |
| `ordering`: `trap` is mandatory | 3 of 3 orderings failed for measuring common-sense chronology |
| `ordering`: no item may contain an anaphor (`esse`, `esta`, `anterior`…) | "executa **esse** bytecode" pins the position by the text |
| `quiz`/`multiple-choice`: four form tells, by computation | the correct one noticeably longer; an absolute on one side only; the correct one echoing the statement far more than the wrong ones; the wrong ones all with the same opening formula. Calibrated against 48 hand-written exercises: zero false positives |
| `quiz`/`multiple-choice`: a technical term from the statement in one option only | "o back-end **WSL2** falhou" with the single option that says WSL2: word matching settles the question. Only an identifier counts (an acronym or a term with a digit) — the version that accepted any word flagged "executar" and "marca" in good exercises |
| `quiz`/`multiple-choice`: hedging in the correct ones only | all 3 correct options qualified and the 2 wrong ones categorical: "qualified = right" settles the exact set |
| `quiz`/`multiple-choice`: an adverb of uncertainty in one option only, the correct one | "the only one protecting itself with an adverb of uncertainty (*provavelmente* precisam ser reescritos)" — the hedge test above did not catch it, because it demands two correct options and this question had one. A deliberately narrower vocabulary: only what softens a **claim**. A contrastive connective (`enquanto`, `mas`) is ordinary prose and was knocking out a good exercise from the 48 |
| `multiple-choice`: marking the hedged ones and discarding the absolute ones gives the exact key | the exam heuristic, simulated. The other tests ask whether a trait separates the groups; this one asks what decides the grade — does the rule of someone who did not study produce the **exact set**? Only valid from 2 correct options up: with a single one, hitting it by chance is far too easy |
| `quiz`/`multiple-choice`: a hint that counts how many are false | "duas delas erram" turns into label triage, with no item ever assessed |
| `quiz`/`multiple-choice`: the modal axis — correct options say what **can** happen, wrong ones what **obliges** or **guarantees** | "the three correct ones are statements of possibility and the two wrong ones of obligation or total guarantee". It is not the absolutes test: `faz`, `atende`, `pode ser executada` are not absolutes and still separate the groups perfectly |
| `quiz`/`multiple-choice`: the syntactic mould dropped from 3 wrong options to **2** | the only two options opening with "A conformidade …" were exactly the two wrong ones. Two identical formulas in a set of five reveal as much as three; zero false positives in the 48 with the new threshold |
| `matching`: the left items echo their own right | the rule "no right item may echo a word from the left" existed only in prose and was disobeyed. Mechanised by comparing, per pair, the vocabulary shared with its **own** right against that shared with the others. It tolerates **one** pair of slack: demanding all of them knocked the check out over a vocabulary tie |
| `quiz`: two or more hint words in a single option, the correct one | "conte quantos **kernel** de **sistema operacional** estão carregados" with a single option mentioning the kernel: a textual match, not a conceptual one. One word is not enough — `outro`, `valor` and `saída` landed in a single option by chance in 3 of the 48. The statement is no good as a source: it shares vocabulary with every option by construction |
| there is **no** check for "requires a later topic" | tried and discarded: comparing the exercise's text against the vocabulary of the following titles flagged 5 of the 48 good ones — "biblioteca", "padrão", "objetos" and "arquivos" appear in a later title **and** in ordinary prose, and there is no lexical way to tell "mentions the word" from "requires the concept". Demanding two words from the same topic did not save it. The defect is real; the answer is in the authoring, not in the detection — see section 3 |
| `multiple-choice`: the statement must not mix both polarities | "sobre o que a adoção de containers resolve **e o que não resolve**, marque todas que se aplicam": marking the true ones or marking the limits gives **opposite** sets, and the wrong options tend to be exactly the statements about what the technology does not do. With exact-set grading, the ambiguity fails whoever understood |
| `matching`: the statement has to warn that items are left over | whoever does not know tries to fit them all and forces a wrong pairing; it caught 3 of the 7 hand-written exercises |
| `expression-answer`: the check's variable has to be in `variables` | — |
| a type X may not carry fields belonging to type Y | — |

## 2. Execution — proof instead of opinion

Enforced in `lib/validate.mjs`.

- **`expected-output` runs the snippet** and compares byte for byte. It is the strongest type:
  a semantic defect becomes a deterministic failure. Origin: `-7 ** 2` displayed as `49`,
  right for the variable and wrong for the literal.
- **`code` writes a reference solution blind**, without seeing the test cases, and runs it
  against them. Agreeing blind is evidence; disagreeing means either the statement or the key
  is wrong, and the validator does not guess which. Origin: a missing trailing `\n` failed the
  correct solution in 6 cases.
- **`expression-answer` recomputes the key with sympy** from `check_source`.
  `check_operation: none` **fails** — with no recomputation, nobody verified anything.
- **A missing environment exits with code 2, never fails content.** Origin: `python3` off the
  PATH became "8 exercises failed" and sent us hunting for a defect in the content. `ENOENT`
  arrives with an empty stderr: never swallow the cause.
- **SQL runs like any other language, and the output format is a contract.** Fifteen rounds
  covered conceptual topics only and the execution layer never ran on generated content; the
  first time it did, the generator emitted `language: "sql"` and the validator did not know how
  to run it. It exited with code 2 without failing anything — the missing-environment rule
  worked.

  It runs on an in-memory SQLite, through Python's own module, which was already a dependency:
  nothing new to install. In `code`, the case's `input` is the setup and the solution is the
  query. In `expected-output`, the student reads the **whole script**, so everything but the
  last statement is setup and the last one is what gets assessed.

  **The format is declared, not deduced:** a header with the column names, ` | ` as separator,
  `NULL` spelled out, and the number written the way the column type dictates — `INTEGER` with
  120 prints `120`, `REAL` with the same 120 prints `120.0`. Without a format pinned in the
  prompt, the generator invents one per exercise and the byte-for-byte comparison fails a
  correct key. It is the same defect as the trailing `\n`, which has already cost six cases.

  Two decisions that are not details: **`PRAGMA foreign_keys = ON`**, contrary to SQLite's
  default, or an exercise about referential integrity approves an `INSERT` that any real
  database refuses; and **every query needs an `ORDER BY`**, or the key depends on the order
  the engine happened to return and fails a correct student on another database.

- **The denominator has to be what entered the funnel, not what has just been generated.** With
  a range accumulating, `--topics 4-5` in a file of 16 divided 7 approvals by 8 freshly
  generated ones and printed **88%** where the rate was **44%**. The defect was born of range
  accumulation, which is recent, and nearly became good news in a report. **An inflated metric
  is worse than a missing one:** nobody uses the missing one, everybody believes the inflated
  one.
- **Execution costs 50 times less than judgement, and catches what judgement does not.** First
  measurement of the layer on generated content, same round: **validate US$ 0.02 · critique
  US$ 0.98**. Execution failed two `expected-output` exercises whose key simply **was not what
  the database returns** — one listed four names where the query brings back two. No opinion
  pass catches that with confidence; the interpreter catches it every time, for two cents.

  Consequence for the catalogue: **a topic that executes is orders of magnitude cheaper to
  validate than a conceptual topic.** The technical courses, from the moment they leave the
  introduction, should cost far less per approved exercise — and it is the first good economic
  news since the bill started climbing.

- **A new contract fails old content, and that is not a defect of the content.** Of the 5
  execution rejections, **3 were a contract mismatch**: the exercises were generated before the
  SQL output format existed in the prompt, so they carried no header and did not create the
  tables. When adding an execution contract, either the earlier content is regenerated or it is
  accepted that it will fail — what must not happen is reading a version mismatch as an
  authoring defect and going off "fixing" an exercise that was right by the rules of its time.
- **Never store a reference solution written by someone who saw the test cases.** The
  `_reference_solution` field is reused by the validator; filling it with the author's solution
  converts independent verification into self-verification, and the pipeline reports "ok"
  without anything having been checked.

## 3. Authoring — what the generator has to respect

Enforced in the prompt in `lib/types.mjs`.

**Topic order — now imposed by blindness, not by the rule.** An exercise for topic N may only
require what topics 1..N have taught. The rule existed in prose from the start and was
disobeyed: in one round, "requires content from a later topic" was the second largest cause of
paid rejection, with topic-1 exercises asking for namespaces, cgroups and resource limits.
**The generator reached forward because it could see forward** — it received the whole
syllabus. Now the list is cut at the batch's last topic, for generating, rewriting and writing
options; the critic still receives it whole, because it has to recognise the reference in order
to fail it. You do not ask someone to ignore what they are reading: you take it out of sight.

Origin: an "installation and first script" exercise requiring `strip()`, a conditional and an
f-string — it passed 4/4 in validation, which is precisely why the critic exists.

**Options — four defects that showed up in almost every generated quiz:** the correct one
longer than the wrong ones, filler distractors, absolutes an exam-taker discards out of habit,
and wrong ones from one category with the correct one from another.

**`code` — four questions before closing it:**

1. Is there a solution that **ignores the topic** and passes every case? Origin: an exercise
   about a default argument where hardcoding `.2f` passed 5 of 5.
2. Does the topic's **natural tool** produce your key? Origin: an alphabetical tie-break in a
   `collections` topic, when `Counter.most_common` breaks ties by insertion — it punished
   whoever had studied.
3. If the topic is performance, does **any case separate the classes**? Origin: three-element
   cases approved the nested loop just like the linear solution in a Big-O topic.
4. Is the difficulty in the topic or in **reading the input**? Origin: "valores separados por
   espaço" invites `split(" ")`, which returns `[""]` on an empty line and fails whoever had
   mastered exceptions.

**`expected-output`:** the hint **never** tells the student to run the snippet. In every other
type "run it and observe" is a good socratic hint; here the answer *is* the output, so it
amounts to telling them to copy the key from the terminal.

**`ordering`:** it only exists when there is a nameable trap — which neighbouring pair the
student inverts and why inverting breaks it. If the author cannot name it, the exercise
measures common sense and should be another type.

**`matching`:** the right column describes **observable behaviour**, it never translates the
name on the left (`pip list --outdated` ↔ "mostra o que está desatualizado" measures English).
And the distractor has to **compete with the hardest pair** — one that is discarded at a glance
changes nothing, because the hard pair still comes out by elimination.

**`expression-answer`:** declare the domain assumption. Without `x:positive`, sympy does not
simplify `sqrt(x**2)` to `x` and fails whoever answers that way.

## 4. Critique — behaviour above opinion

Enforced in `lib/critique.mjs`.

**A probe is worth more than a judgement.** Asking a model to "assess the quality" of a text
written by another model invites agreement. A probe observes behaviour.

- **The blind probe** answers the question without seeing which option is marked.
- **The blind pair probe** — and its first version failed in a way worth recording. It asked
  *"pair these up"* and compared with the key. Against three matchings the judge had already
  failed, it **approved all three, for US$ 0.08**: a competent model, forced to choose one
  pairing, chooses the intended one. Divergence measures **a wrong key**, not **ambiguity** —
  and the defect being looked for was the second. The `ambiguous` field, offered on the side,
  came back false: whoever resolves to the best answer does not volunteer the doubt.

  The current version asks something else: **for each left item, which right items defend
  themselves as its pair?** The multiplicity becomes the answer being asked for, not a caveat.
  Two readings come out of the same call: a left item with two defensible pairs is ambiguity; a
  key's pair missing from the list is a key that does not hold up.

  **Second test round, US$ 0.08: one case refused by the classifiers and one miss.** Two
  corrections, and one of them is of my own error — the prompt said *"na dúvida entre listar e
  não listar, não liste"*, an instruction that suppresses exactly what the probe measures.
  **Caution written inside the instrument becomes blindness of the instrument.** When you ask
  someone to look for a defect, you do not also ask them to err on the side of not finding one.

  The other: a classifier refusal is transient and **must not become "passed"** — the probes now
  retry once, as the judge already did. Without that, an exercise stops being measured and the
  report does not distinguish that from approved. It is the same principle as "unjudged never
  becomes approved", which was already written and had not been applied to the probes.

  **Third round, US$ 0.17: approved.** #1 passed, #2 and #3 failed — the two the judge had
  already failed, and the control intact. **Specificity matters as much as sensitivity:** an
  instrument that flagged all three would prove nothing, because flagging everything is free.
  That is why the test set included a case that was supposed to pass.

  Stronger than the score: the explanation for #3 reconstructed the judge's finding on its own
  — the timezone distractor describes `/etc/localtime` and `TZ`, real behaviour of a container
  **and** of a virtual machine — and even noted that it is "defensible, not obligatory". Two
  independent instruments arriving at the same defect is the strongest evidence this funnel
  produces.

  Re-checking costs ~US$ 0.17 (`pair-probe-fixture.json`): it is not part of `npm test`, but it
  runs whenever the probe changes.

  **The rule this adds to the method:** *only ask a probe what it is able to refuse* is not
  enough. The other half was missing — **the response format must not destroy the information
  being sought.** Asking "which one" when the question is "how many" always returns one, and
  the instrument passes for working. Before writing a probe: if the defect is present, can the
  format I am asking for express it?

  Original record of the probe: the type went four rounds **with no probe at all** — only the
  judge looked at it, and the judge is the weakest instrument in the funnel. In a round where 2
  of 2 matchings failed, all five rejections were from the same family: "situation 1 fits two of
  the effects on the right equally well". Pairing ambiguity is exactly what a probe measures and
  an opinion does not. The right column goes **in alphabetical order**: in the JSON the correct
  pair is `left[i] ↔ right[i]`, and presenting it in writing order would hand over the key by
  position.

  The general rule that was missing: **every type with a key has to have a blind probe.**
  Partial instrument coverage is worse than none, because the report does not distinguish
  "passed" from "was not measured". `ordering` is still uncovered — not urgent while it is out
  of the generator, but it is the same debt.
- **The hint probe** tries to solve the exercise seeing the statement, **what the student sees**
  and the hint — never the key. Origin: the probe used to receive only the statement and the
  hint, so on an `expected-output` it received "what does this snippet print?" **without the
  snippet**; blind, it approved everything.

**Only ask a probe what it is able to refuse to answer.** It is the most expensive rule in this
codebase. There was a third probe, the "guessing" one, which answered forbidden to use
knowledge of the subject, with exam heuristics only. It hit the key **9 times out of 9** and
failed a whole course — 0 of 11 approved.

A model does not suspend what it knows: it fabricates a form-based justification for the answer
it already believes in. In one case it noticed an absolute in the **correct** option, argued
that it "came qualified" and included it anyway — rationalisation towards the target, not
prediction. A probe forced to answer always answers, and becomes opinion under another name,
which is exactly what the pipeline's design exists to avoid.

It was removed, and the heuristics it used to list became computation in `formTells`. The
contrast is the argument: the same round in which it failed everything had a mechanical check
catching `"o mesmo"` in an ordering step, for free and without discussion.

**Division of competence between probe and judge.** The judge does **not** judge whether the
hint gives too much away — that belongs to the probe. Opinion about hints always errs the same
way, because every useful hint narrows the field; under the ruler "does this change who
passes?", no hint survives. The judge only reports a **wrong** hint: a false statement, pointing
at the wrong block, contradicting the statement. Origin: 10 of 16 rejections in one round were
the judge finding hints generous, and not one came from the probe.

**The severity ruler: "does this change who passes?"** Getting it right by elimination without
knowing the subject is high severity, not a stylistic caveat. `low` only for what changes
nobody's result.

**Unjudged never becomes approved.** A failure of the critique pass fails the exercise, after
one retry. Origin: a parse error became `severity: low` and the exercise passed without having
been assessed.

**The critic needs to see the exercise, not its serialisation.** Origin: `JSON.stringify` on
the key produced 9 identical rejections complaining of "string notation with quotes and an
escaped `\n`" — the critic was judging the prompt's formatting.

**The critic needs to know the school's conventions**, or it reports design decisions as
defects: that `multiple-choice` has several correct options on purpose, that the comparison
ignores trailing whitespace, and that each option's `why` is post-answer feedback and not a
visible tell.

## 5. External calibration

Everything else in this pipeline is the same model judging itself. Execution anchors what is
deterministic and the probes measure behaviour, but **"is this exercise worth a student's
time?" has no automatic answer** — the critic inherits its notion of quality from whoever
writes.

That is why human review is recorded here, with a date and a scope, instead of living in a
conversation's history.

**2026-08-03 — the catalogue's owner reviewed 3 approved exercises** (a standard-library
`code`, a collections `matching`, a deque `expected-output`) and considered them publishable.

What that establishes: **when the critic approves, the result is shippable.** The risk of
approving rubbish is low in this sample.

**2026-08-03 — the same reviewer read rejected exercises from the Docker course** and agreed
with the critiques.

What that establishes: the critic **rejects for a reason that holds up**. Added to the previous
item, the ruler is calibrated in both directions — it approves what is shippable and fails what
is not. That was what was missing in order to scale with some confidence.

**The limits of these two records.** Small samples. The approved ones reviewed were
hand-written, not generated. And agreeing with a critique is easier than disagreeing: whoever
reads the reported defect tends to see it. The calibration counts as an absence of disaster,
not as proof of precision.

## 5c. A topic that executes approves twice as often

The first comparison within the **same course**, between conceptual topics and executable
topics:

| `sql-databases` | validated | approved on the first pass |
| --- | --- | --- |
| topics 1–2 (relational model, normalisation) | 7 | **2 (29%)** |
| topics 4–5 (SELECT/WHERE/ORDER BY, JOINs) | 6 | **5 (83%)** |

Same course, same generator, same prompts, same round. What changes is the existence of an
executable answer — and the four `code` and `expected-output` exercises **all passed
execution**, at 4/4 and 4/4 on the test cases.

This revises the catalogue's arithmetic downwards. The earlier estimates all came from
introductory topics, which are the worst case: only types that depend on judgement. Most of the
76 technical courses, after the introduction, is execution territory.

**The caveat that prevents overreach:** a single course, one round, six exercises on one side
and seven on the other. It is a strong indication, not a firm measurement — and the earlier
arithmetic was withdrawn precisely because I read a one-exercise difference as a signal.

## 5b. Generality: measured, not assumed

Thirteen rounds happened in a single course, and the legitimate question was whether the
learning applied only to it. A US$ 1.33 round in **`architect-communication`** — 50h, advanced,
without a line of code, the most hostile case in the catalogue — answered it:

| | docker (2 topics) | architect-communication (2 topics) |
| --- | --- | --- |
| first pass | 4/7 (57%) | 3/8 (37%) |
| cost per approval | US$ 0.328 | US$ 0.444 |
| causes | distractors, key, statement | distractors, key, hint, statement |

**The rules transfer; the rate drops by a third.** No new defect family appeared — the same
four dimensions, in the same order of frequency. The funnel produced valid, structured
exercises in a course where three of the seven types are inapplicable, and the critic found
real defects, not artefacts.

**A correction, made one round later.** The original paragraph attributed the drop to the
course's subject being a matter of judgement and said to budget +35% for `gestao` and
`architecture`. A third course — `sql-databases`, technical — gave **3/8, identical**. Three
courses: 4/7, 3/8, 3/8, or **10/23 (43%) together**. The difference between 4/7 and 3/8 is
**one exercise**, and I treated one exercise as a signal. There is no detectable
course-type effect in this sample, and the budgeting rule was wrong. What the sample supports
stands: **the rules transfer, and the rate sits in the 40% range.**

**What those three rounds really have in common, and it is the big finding:** they all covered
the **first two or three topics**, which in any course are conceptual. Result: fifteen rounds
generated **zero `code` and zero `expected-output`**. The execution layer — the funnel's
strongest, the only deterministic one — **had never run on generated content**. It existed only
in the 48 Python exercises, written by hand.

In other words: everything this file claims about rate and cost holds for the **hardest third**
of the problem, the one where approval depends on judgement. `sql-databases` from topic 4
(`SELECT, WHERE, ORDER BY`) is execution territory, and nobody knows what the rate is there.
Measuring that is the next round worth paying for.

**A side gain from the same round: the blind pair probe made its first capture in production**
("left item 2 accepts 2 defensible pairs"), on new content and in another course. Validated on
three known cases, then silent on a Docker matching, and now landing outside the domain it was
built in.

## 6. Process

- **Every iteration improves the tool.** See the golden rule.
- **Classify every finding** as a tool artefact, a repeatable defect or a one-off defect,
  before fixing anything.
- **Check by execution before accepting.** An agent's finding is not true by decree.
- **A new instrument is calibrated against a known corpus before running on new content.** The
  guessing probe cost US$ 1.81 to reveal a defect the 48 already-reviewed exercises would have
  shown for free. When the form tells replaced it, calibrating against those same 48 cost
  nothing and moved the lexical-echo threshold from +1 to +3.
- **What the output identifies has to be the exercise, not the progress.** With parallelism the
  results finish out of order; a completion counter makes it impossible to cross a critique
  finding with the line in the file, which is exactly the work of triage.
- **Account for the cost before returning on an error.** A truncated or refused call is billed
  all the same. A 6-topic generation blew `max_tokens`, produced zero exercises, and the cost
  report came out empty — silent spending is worse than high spending.
- **`max_tokens` limits thinking and answer together.** With adaptive thinking, a batch that
  fitted at 3 topics does not fit at 6. On blowing the limit, split the batch and redo it
  instead of losing everything.
- **Generating by range accumulates, it never replaces.** `--max N` always took the first N
  topics, so thirteen rounds covered the same three — there was no way to produce a whole
  course. With `--topics A-B` there is, and saving now preserves the exercises of topics
  outside the range: running 7-9 after 1-6 has to leave nine topics in the file, not three. It
  is the same rule as "a failure never overwrites what worked", applied to partial success.
- **A failure never overwrites what worked.** Generating zero exercises once renamed the good
  file and wrote an empty one over it.
- **The result must not depend on who answered first.** The concurrent calls come back in input
  order; checked that `--parallel 1` and `--parallel 8` produce identical JSON.
- **Content is versioned; a round's derivatives are not.** `exercises-<course>.json` cost review
  to exist; `.validated`, `.critiqued` and the like are remade by running again.
- **An undeclared dependency is an environment failure disguised as a content defect.** That is
  why no exercise imports `pandas` or uses the network: it would fail on a clean machine for a
  reason that has nothing to do with the exercise.
- **The round has to say by itself whether it improved.** Before that, answering "better or
  not?" meant rereading the whole output and comparing from memory with the previous round —
  work that repeated on every run and that nobody does honestly when tired. Now every complete
  cycle writes a line into `history.json` and prints a three-state verdict.

  The verdict's number is **not the approval rate**. A rate moves with the course, with the
  topic and with the difficulty that came up, and it rises by itself if the generator turns
  timid. What measures the tool is the **division of labour**: how many defects were caught by
  computation, for free, against how many only appeared after paying the API. Every rule that
  becomes arithmetic pushes a defect from one column to the other. If that proportion does not
  move across rounds, the rounds are fixing content — which is what the golden rule forbids.

  Comparison only against a round of the **same course**: docker against python would measure
  the subject.
- **A rescue does not enter the verdict's rate.** The first round with the repair lap switched
  on printed `IMPROVED — +34 pp`, and the generator had not moved a point: 4 of 9 on the first
  pass against 8 of 18, both 44%. The 34 pp were three exercises bought in the rewrite. The
  verdict came to measure the **first pass**; the rescued ones appear on a separate line,
  labelled as bought approval. General rule: **a metric that adds in what was paid to fix
  things does not measure the tool, it measures the invoice.**
- **A missing datum must not turn into silence.** In the same round, the cost per approval rose
  25% and the line did not even appear, because the reference round had been recorded by hand
  without the cost field. A comparison with no baseline now prints the number and says there is
  nothing to compare it with — and the verdict carries the caveat. An instrument that falls
  silent when a datum is missing is worse than a missing instrument: it passes for working.
- **Two corpora, with opposite roles, and both are necessary.** The hand-reviewed exercises
  measure **false positives**: no check may flag them, and that is what stops a new rule from
  knocking down a good exercise. The already-paid rejections measure **reach**: the more checks
  fire, the better, and that is what answers "would this rule have caught the defect we paid
  for?".

  The second was missing, and the lack was expensive in two senses. Paid rounds existed only to
  test a rule on new content when the old content would have served. And the rejection files
  were **overwritten on every run**: of twelve paid rounds, the rejections of one survived.
  Whatever costs money to be discovered has to survive the next round.

  The entry measurement was **13%** — 2 of 16 paid rejections would be caught for free today,
  and one of them was already mechanical before. The rate does not have to reach 100%: a
  debatable key and an implausible distractor are semantic. It has to **not fall**, and it is
  `npm test` that guarantees that against a recorded floor. Loosening a threshold to silence a
  false positive takes reach away without anyone seeing; this is the only place where that
  shows up, and it shows up for free.

  `--reach` breaks the number down by dimension, and the "still paid" column is the work queue:
  it is where a new rule converts spending into computation.
- **Calibration is a regression suite, not a throwaway script.** Every mechanical check was
  tuned against the 48 hand-reviewed exercises, in a script written and thrown away every
  round. Now that is `npm test`: the 48 may flag nothing, and each rule also keeps the real
  case that motivated it, in both directions. Loosening a threshold by accident breaks a test
  instead of slipping past — which is how the lexical echo nearly went in with a +1 margin.
- **Round bookkeeping is tested with fake functions.** The funnel in laps is the point where an
  error does not show up in the output: a rescue counted as a rejection, or a rejection counted
  twice, produces a plausible and false report at the end of a round that cost dollars. That is
  why it lives alone in `lib/funnel.mjs` and runs end to end without touching the API.

## 7. Types: one withdrawn, one under observation

**`ordering` left the generator.** Six generated across four rounds, **zero approved**. The
reasons changed every time — ambiguous order, anaphora between steps, a step that justified its
own position, narrative chronology, and finally two independent steps with a declared trap that
was factually wrong. The rule was hardened three times without moving the result, which was the
stopping criterion recorded here: **a dimension already encoded that reappears is spinning, not
improving.**

The type stays in `TYPES` and stays validated — it serves hand-written content, where an author
can prove the trap exists. What left is automatic generation, via `GENERATABLE_TYPES`. Criterion
for coming back: a hand-written `ordering` passing the critic twice in a row.

**Update, round C: the observation was not confirmed.** On the first pass, `quiz` did 1 of 5
(20%) and `multiple-choice` did 1 of 3 (33%) — the type under observation came out **above** the
reference type, and the exit criterion ("below half of quiz for two more rounds") stopped
running. What round C suggests is something else: the weakness was not the type's, it was the
options' authoring, which affects both equally. It stays under observation for one more round,
now as a control for the blind-authoring change, not as a candidate for removal.

**Original record — `multiple-choice` goes under observation: 1 of 6 approved** in the round of
18, against 6 of 8 for `quiz` in the same batch. The cause is structural, not editorial: with
exact-set grading, **five options are five chances to be wrong instead of one**, and a single
debatable item fails the whole exercise. Half the rejections in that round were exactly this —
an option mixing a true conclusion with a false mechanism, a key true only in some
distributions, a statement whose scope does not match an option's.

Decision criterion: if the rate stays below half of `quiz` for two more rounds, the type comes
to require that **every option be verifiable**, not merely judged — or it leaves the generator
like `ordering` did.

## 7b. Rewriting what fell, without teaching to the test

The rejected exercise stopped being discarded: it goes back to the generator with the report in
hand and passes through the whole funnel again. It has already cost a generation and a
critique, and the defect came named — rewriting is cheaper than generating another one blind
and hoping.

**The risk of this stage is teaching to the test.** Rewriting until the judge approves optimises
against the judge, and a judge has biases. Four things hold that down, and none can be loosened
without being replaced by another:

- **The rewrite goes back through the whole funnel**, not only through the critique. The
  mechanical check does not change its mind or get tired, and neither does execution.
- **The blind probe does not read the critique.** There is no pleasing it with wording: either
  the key is deducible without knowing the subject, or it is not.
- **One lap by default.** Raising `--rewrite` is an explicit choice, and the cost per approval
  in the verdict shows whether it paid off.
- **Type and topic are pinned.** Swapping a hard `multiple-choice` for an easy `quiz` would
  solve the rejection and falsify the two measures that keep the generator honest: topic
  coverage and rate by type. A rewrite that changes either is refused without entering the
  funnel.

Also refused: a rewrite identical to the original (spending again to fail again) and an empty
answer. And **the report says the defect is fact and the suggested fix is a guess** — whoever
reported the defect did not write the exercise, and it has already happened that the critic's
suggestion was wrong while the defect was right.

**What to judge after running it:** if `rescued` is high and the cost per approval falls, the
stage pays for itself. If `rescued` is high and the cost per approval rises, the stage is buying
expensive approval — and it is worth checking by hand whether the rescued ones are really good,
because that is exactly the shape "teaching to the test" would take.

## 7e. Cutting the syllabus worked

The round after the cut, on the same three topics: `target` fell from **3 to 1**, and the one
remaining was mislabelled by the judge (it was a lexical echo between a matching's columns, not
a forward reference). The first pass rose from 33% to **50%**, caught-for-free from 0 to 3 of 9,
cost per approval fell 13%.

Worth recording the contrast with blind authoring, which cost a round and moved nothing: both
attempts applied the same principle — hide information — and only one worked. The difference is
the one written down in 7d: **is the task still executable without what was hidden?** Writing
exercises for topic 3 does not require knowing topic 17; writing a set with a fixed count of
true statements requires knowing which they are. Blindness that passes that test is free and
works; blindness that does not is theatre, and costs.

## 7c. The defect displaces — a form tell is a symptom, not the disease

Three rounds of the same course, with the same checks being hardened on each one:

| cause of the paid rejection | round A | B | C |
| --- | --- | --- | --- |
| distractors (answerable by form) | 6 | 5 | 3 |
| the hint gives away the answer | 5 | 2 | **0** |
| caught free by the structure | 0 of 18 | 1 of 9 | **4 of 9** |

**The hint was solved.** Two mechanical checks plus a paragraph in the prompt took a round's
dominant cause to zero in two. It is the best result this pipeline has ever had, and it is the
model of what works: converting a rule into arithmetic.

**The distractors were not.** And round C showed why. The length check has existed from the
start and **had never fired on Docker** — zero in 18, zero in 9. In round C it fired **three
times**, right after the prompt gained the paragraph telling it to level the tone between
correct and wrong options. The generator obeyed: it stopped qualifying only the correct ones
and started **explaining them more**. The channel closed and the leak came out of another hole.

The uncomfortable conclusion: **the generator has a structural tendency to leave the correct
option identifiable, and the form tells measure where it is leaking, not whether it exists.**
Each new check converts a paid rejection into a free one — which is real progress and is what
the verdict measures — but the first-pass rate does not rise: 44% → 44% → 33%.

The cause is the asymmetry of whoever writes: the author **knows** which one is correct while
drafting it, and looks after it. No quantity of detector fixes that; only an authoring design
that denies the author that information at the moment it matters. It is recorded as the next
structural change to test, in section 8.

## 7d. Blind authoring was measured and failed — but not for the expected reason

Criterion declared before running: the first-pass rate had to move off the ~40%. It came out at
**33%, exactly the same as the previous round**. The hypothesis fell, and the `--blind` flag
stays off. But the other two numbers explain what, exactly, fell.

| | round C | round D, `--blind` |
| --- | --- | --- |
| first pass | 3/9 (33%) | 3/9 (33%) |
| caught free by the structure | **4 of 9** | **0 of 7** |
| cost per approval | US$ 0.395 | US$ 0.524 |

**The mechanism worked: the form tells went to zero.** No mechanical check fired — the list of
six uniformity axes in the prompt made the generator produce formally indistinguishable options.
And the rate did not move a point. That is close to proof that **form was never the binding
constraint**, and it is the most useful result the round gave.

**The blindness was theatrical, and the design error is mine.** Asking for "write five
statements, one of them true, but do not decide which" is incoherent: to guarantee the count,
the author has to decide. It decided and did not say. What was left is the semantic asymmetry,
which is what the critic went on to report: the wrong ones are false in a recognisable way —
exotic mechanism, wrong domain, coarse falsehood — and the right ones are the topic's canonical
statements.

**Consequence for the method:** the constraint of "not knowing" only holds when **you do not
need to know in order to carry out the task**. The blind reference solution works because
writing the solution does not require seeing the cases. Writing a set with a fixed count of
true statements requires knowing which they are. Before designing the next blindness, ask: is
the task executable without the information I am hiding? If it is not, the blindness is
theatre.

**And, per the promise made before running: the hunt for form tells is over.** The checks that
already exist stay — they are cheap and catch real defects for free — but no new one goes in
unless the first-pass rate shows that form has become the bottleneck again.

## 7f. The mechanical layer is near its ceiling, and that is measured

With the rejection corpus in hand, **eleven candidate new checks were tested for free** against
both corpora at once. Result: only one passed — loosening the correct options' hedging from
"all" to "all but one", which took the reach from 13% to **19%**. The other ten either caught
nothing or flagged a good exercise.

**The hint is provably exhausted.** The four hint rejections that remain have **zero or one**
word of lexical overlap with the correct option — the same as the wrong ones. It is not that a
better rule is missing: **there is no lexical signal**. They are paraphrases:

> "Conte quantas vezes um sistema operacional inteiro precisa estar carregado" ↔ the option
> talks about *kernel por VM*. Not one word in common, and the hint gives the question away.

The check that exists catches the **literal** subset (two or more hint words in a single
option). The **paraphrastic** subset belongs to the probe, and will go on belonging to it.

**What remains in the paid column, by nature:**

| dimension | what it is | mechanisable? |
| --- | --- | --- |
| distractors | "the wrong ones are false in a recognisable way", "the right ones are the topic's cliché" | no — it is plausibility, not form |
| key | the statement marked correct is factually debatable | no — it is truth, not text |
| hint (paraphrase) | it gives the criterion away in other words | no — no lexical signal |
| target | it requires what was not taught | solved in the authoring, not in the detection (7e) |

**Strategic consequence, and it is the reason this paragraph exists:** adding a mechanical check
has come to yield ~1 case per attempt, with a growing risk of false positives. The bottleneck
migrated to the instruments that judge meaning — the probes — and to the authoring. A new form
rule is only worth it again if the reach stops rising by another route and the first-pass rate
shows that form has become the problem again.

## 8. What is not yet a rule

Known, not yet solved:

- ~~**Blind authoring of the options.**~~ **Measured and failed — see 7d.** Original record: the
  generator writes five options already knowing which it will mark correct, and it looks after
  the correct ones. Hence the whole family of form tells. The proposal was to apply to the
  authoring the same principle that already governs verification: **first write five defensible
  statements about the topic, without deciding which are true, and only then judge each one.**
  The asymmetry disappears at its source because, at the moment of writing, there is no
  "correct one" to privilege.

  It is **two** extra calls per options question: one writes the N statements knowing how many
  will be true and never which, another — separate, with no memory of the first — judges each
  one. It is the judgement that becomes the key.

  A side gain already anticipated: the count of true statements stops being decreed by the
  author and comes to be established. If the judgement returns two true ones in a `quiz`, the
  mechanical check fails it **for free** — and what it catches is a set of statements that does
  not sustain the intended key, a defect only the critic used to see, at a price.

  **Success criterion, declared before running:** the first-pass rate has to move off the ~40%
  it has been stuck at for three rounds. If it does not, the hypothesis is wrong, the asymmetry
  comes from somewhere else, and the chase after form tells stops. It sits behind a flag until
  it is measured against the same three Docker topics.
- **Deduplication between neighbouring topics.**
- **The form tells cover four traits, and the judge reports others.** An out-of-place category
  and exotic plausibility are still prose and judgement; mechanising them requires measuring
  semantics, not text.
- **The generator ignores a rule in prose when the prose is long.** The distractor rules existed
  and were disobeyed in 2 of the 12 Docker exercises. The pattern so far: a rule that becomes a
  mechanical check or a probe starts being respected; a rule that stays only in the prompt is
  respected sometimes. Consider that before adding more prose.

  **The Docker round of 18 confirmed this uncomfortably: of the 9 rejections, almost none
  brought a new cause.** A distractor giving itself away by form, a wrong option with an exotic
  mechanism, a matching distractor plausible for more than one left item, a hint that gives the
  criterion away — all four were already written in the prompt. The bottleneck stopped being
  *discovering the rule* and became *making it stick*. That changes what counts as progress:
  adding new prose to the prompt tends to move nothing, and the two remaining ways out are
  converting the rule into arithmetic (done for hedging and for the hint) or feeding the
  critique back into regeneration.
