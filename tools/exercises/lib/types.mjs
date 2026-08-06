/* The exercise types: what each one is, when to use it, how to check its structure.
 *
 * All of them must be machine-gradable — the school has no teacher grading. Each type exists
 * because it covers a case the others do not:
 *
 *   code             write and run                  language and tooling courses
 *   expected-output  predict what the code does     semantics, precedence, types
 *   quiz             one right answer               a concept with a single reading
 *   multiple-choice  several right answers          a concept with more than one aspect
 *   ordering         correct sequence               process, pipeline, lifecycle
 *
 * `ordering` and `expected-output` were added because quiz alone does not serve the 24 infra
 * and security courses, where what is taught is order of operations.
 *
 * ON LANGUAGE: the code, comments and prompt prose are in English. The exercises themselves
 * are written in Brazilian Portuguese, because that is what the student reads, and the
 * regular expressions below analyse Portuguese text — translating them would switch the whole
 * mechanical layer off. Worked examples quoted from real defects stay in Portuguese too: the
 * defect lives in the Portuguese wording, so a translated example illustrates nothing.
 */

export const TYPES = ['code', 'expected-output', 'quiz', 'multiple-choice', 'ordering', 'matching', 'expression-answer'];

/* Types that do not presuppose programming. Only `code` and `expected-output` need an
 * interpreter; the other four serve any subject. */
export const NEUTRAL_TYPES = ['quiz', 'multiple-choice', 'ordering', 'matching', 'expression-answer'];

/* What the GENERATOR may emit. `ordering` was pulled: 6 generated across four rounds, 0
 * approved. The reasons changed every time — ambiguous order, anaphora between steps, a step
 * that justified its own position, narrative chronology, and finally two independent steps
 * whose declared trap was factually wrong. The rule was hardened three times and the result
 * did not move, which is the definition of spinning rather than improving.
 *
 * The type stays in TYPES and stays validated: it serves hand-written content, where a human
 * author can prove the trap exists. What left is automatic generation. Criterion for coming
 * back: a hand-written `ordering` passing the critic twice in a row. */
export const GENERATABLE_TYPES = TYPES.filter((t) => t !== 'ordering');

export const RULES_BY_TYPE = ({ options }) => `
**code** — when **the topic itself** is something you write and run. Fill \`language\`,
\`skeleton\` and \`tests\` with 3 to 6 cases.

The test is: does the topic teach how to write that, or is it a concept you *could* simulate
in code? Only the first becomes a code exercise. Asking the student to program an algorithm
to illustrate a conceptual topic measures the programming language, not the topic — and fails
whoever understood the subject and is not a programmer.

Each case's \`expected_output\` is stdout byte for byte, **including the trailing \\n**: if the
solution ends in \`print(x)\`, the key ends in \`\\n\`. A key without the \\n fails the correct
solution. Deterministic cases: no clock, no randomness, no network, no dictionary order. At
least one edge case.

**Four rules about test cases, each one from an exercise that passed validation and measured
the wrong thing. Answer all four in writing before closing:**

1. **Is there a solution that ignores the topic and passes every case?** If there is, the
   exercise does not measure the topic. An exercise about a default argument where every case
   uses the default is solved by hardcoding the value: it passed 5 of 5 without the parameter
   ever existing. At least one case must force the mechanism the topic is named after.

2. **Does the topic's natural tool produce your key?** If the library's obvious feature gives
   a different result from the one you expect, the exercise punishes precisely whoever
   studied. Real case: requiring an alphabetical tie-break in a \`collections\` topic, when
   \`Counter.most_common\` breaks ties by insertion order. Adjust the specification to match
   the tool, or pick another task.

3. **If the topic is performance or complexity, does any case separate the classes?** Cases
   with three elements approve the nested loop just like the linear solution. Include an input
   large enough for the naive solution to blow the timeout — then complexity becomes an
   executable criterion instead of a matter of prose.

4. **Is the difficulty in the topic or in reading the input?** \`"valores separados por
   espaço"\` invites \`split(" ")\`, and on an empty line that returns \`[""]\` instead of \`[]\` —
   the student fails on string slicing in an exercise about exceptions. Either the skeleton
   hands over the input already converted, or the statement says exactly what to do with an
   empty field.

**expected-output** — shows a ready-made snippet in \`given_code\` and asks what it prints; the
student types the output, compared byte for byte with \`answer\`. It is the cheapest type to
grade and the best one for semantics: precedence, type conversion, lazy evaluation,
mutability. Use it when the value of understanding is in *predicting*, not in writing.

Careful: the key has to be what the interpreter actually produces, not what looks obvious.
Before fixing it, reread the snippet as if you were typing it into the interpreter. If the
displayed text reads differently from the computed value, change the example.

### SQL: the output format is a contract, not your choice

In \`code\` and \`expected-output\` with \`language: "sql"\`, the exercise runs against an
in-memory SQLite, created empty on every execution. **There is no pre-existing database**: if
the exercise does not create the tables, the query fails with *no such table* — which is what
happened in 10 of 10 test cases in the first SQL batch, generated before this rule existed.

Where the setup lives depends on the type, and the difference is mandatory:

- **\`expected-output\`** — \`given_code\` carries the **whole script** the student reads: the
  \`CREATE TABLE\`s, the \`INSERT\`s and, last, the statement being evaluated. Everything but
  the last statement is treated as setup; the last one produces the compared output.
- **\`code\`** — the student writes **one** SQL statement, and the \`skeleton\` shows the schema
  in a comment so they know the column names. The setup goes in the \`input\` field of **every
  test case**, repeated in full in all of them: each case runs against a fresh database, and
  varying the data between cases is what proves the query did not hardcode the answer.

The output is compared byte for byte, so the key must follow exactly this:

- **first line: the column names**, separated by \` | \` (space, pipe, space);
- **one line per record**, columns separated by the same \` | \`;
- **NULL** appears as the word \`NULL\`, unquoted;
- the value is written the way Python writes it, and **the column type decides**: an
  \`INTEGER\` column holding 120 prints \`120\`, a \`REAL\` column holding the same 120 prints
  \`120.0\`. There is no \`120.00\`;
- text unquoted;
- a query returning no records prints **only the header**;
- a statement returning no rows (\`INSERT\`, \`UPDATE\`, \`CREATE\`) prints
  \`N linha(s) afetada(s)\`;
- every line ends in \`\\n\`, including the last, and there is no blank line at the end.

**Row order is only guaranteed with \`ORDER BY\`.** Without it SQLite returns them in whatever
order it likes, and the key comes to depend on an implementation detail — the exercise would
fail a correct student on another database. Every exercise query ends with an explicit
\`ORDER BY\`, or returns a single row.

**NULL must not take part in the ordering.** \`ORDER BY\` with nulls is **engine-dependent**:
SQLite and MySQL put NULL first, PostgreSQL and Oracle put it last. Such an exercise has two
defensible keys and fails the student who reasons with the engine named in the syllabus —
which is what the critic caught in the first SQL batch to reach execution. Either the ordered
column does not admit NULL, or the \`WHERE\` excludes them, or the ordering uses another column.

**Stay in portable SQL.** The exercise runs on SQLite, but the student studies the engine in
the syllabus; anything dialect-specific — a proprietary string function, limit syntax, an
exotic type — turns correct knowledge into a wrong answer.

**Foreign keys are ON** (\`PRAGMA foreign_keys = ON\`), against SQLite's default: an exercise
about referential integrity needs the invalid \`INSERT\` to actually be refused.

**quiz** — a concept with a single defensible answer. \`options\` with exactly ${options}
entries and **one** correct.

**multiple-choice** — a concept where more than one statement holds. \`options\` with
${options} entries and **two or three** correct, never all. The statement warns there is more
than one ("marque todas que se aplicam"). Add up with guessing: getting it right requires
evaluating each item, not picking the best. Prefer this over quiz when the topic has several
equally true aspects and the common mistake is knowing only one of them.

**The statement must say which side to mark, and only one side.** "Sobre o que a adoção de
containers resolve **e o que não resolve**, marque todas que se aplicam" has two opposite
readings: mark the true ones, or mark the limits. Since the wrong options are typically
statements about what the technology does *not* do, the two readings produce opposite sets —
and with exact-set grading the ambiguity fails whoever understood the topic. Ask for a single
polarity: "marque todas as afirmações verdadeiras sobre X". This is checked mechanically: a
statement containing "o que X e o que não X" fails structurally.

**Hint rule in \`expected-output\`: never tell them to run the snippet.** In every other type
"rode e observe" is a good socratic hint, because the student still has to interpret what
they saw. Here the requested answer **is** the program's output, so "run the snippet" amounts
to "copy the key from the terminal". Point at the concept, the suspicious line or the
comparison to make — never at the execution.

**ordering** — the topic is a sequence that only works in one order. Fill \`items\` with 4 to 7
steps **in the correct order**; the portal shuffles them at display time. It serves deploy
processes, request lifecycles, incident response, analysis stages. It is the type that makes
the part of the catalogue that does not run code assessable.

Every step must have an unambiguous position: if two steps could be swapped harmlessly, the
exercise has two right answers and does not serve.

**And there is a second requirement, which failed three ordering exercises out of three in
the first real round.** Unambiguous order is not enough, because narrative chronology tends to
give the answer away: someone who never studied the subject orders "montar a URL, pedir,
converter, guardar, repetir" on the first guess. Two things follow:

1. **Fill \`trap\`** with the pair of neighbouring steps a careless student inverts, and why
   inverting breaks. If you cannot name that pair, the exercise measures common sense and not
   the topic — pick another type. The field is mandatory precisely to force that decision
   before the items are written.

   **And the trap must be counter-intuitive: the correct order has to be the one a layperson
   would NOT choose.** This is where nearly every \`ordering\` in this catalogue died.
   Declaring "extract the layers before starting the program" as the trap is worth nothing,
   because unpacking before running is anyone's guess. If the right order coincides with
   intuition there is no trap — there is a chronological narrative, and "constrói → publica →
   baixa → desempacota → executa" sorts itself without ever having heard of the subject.

   Test: describe the trap to someone ignorant of the topic and ask which order they would
   pick. If they get it right, throw the exercise away.

2. **No step may reference the previous one.** "Executa **esse** bytecode", "congelar as
   versões **instaladas**", "versionar o **requirements.txt**" right after the step that
   creates it: each of those ties gives the position away through the text. Write every step
   so that it makes sense on its own, out of order.

3. **No step may justify its own position.** This is subtler than anaphora and cancels the
   trap from the inside. Real case: the declared trap was inverting the host operating system
   and the type-2 hypervisor — and the hypervisor item said "executado como um programa
   comum", which already gives away that there is an OS underneath. The author named the trap
   and disarmed it in the same sentence. After writing the items, reread each one asking:
   **would this text tell someone ignorant of the subject where it goes?** If it would, cut
   the part that does.

**matching** — the topic has items that pair up one to one. Fill \`pairs\` with 4 to 6
\`{left, right}\` couples; the portal shuffles the right column. It serves command and effect,
error and cause, concept and definition, pattern and the problem it solves, protocol field
and function.

The rule that makes or breaks the type: **each left item matches exactly one on the right,
and that must be unambiguous.** If a right item can be defended for two left entries, the
exercise has more than one key. Before closing, test each right item against every left, not
only against its own.

Keep both columns homogeneous: if the rights are definitions, all of them are definitions,
with similar length. A right item much longer or more specific than the others gives itself
away by shape, exactly like the long option in a quiz.

**Two rules that came from four matching exercises failed in one real round:**

**Fill \`right_distractors\`** with 1 or 2 right-column items that pair with nothing. Without
them, N lefts against N rights make the last pair fall out for free, by elimination, and the
student gets right an item they never evaluated.

**A distractor must not be defensible for any left item.** It is plausible as a description,
not as an answer — and the difference decides who passes. Real case: in a virtualisation
matching exercise, the distractor "intercepta e reescreve as chamadas de sistema antes de
repassá-las ao hardware" correctly describes a hypervisor **and** the host kernel, both
present on the left. Since the student does not know which items are spare, whoever
understood the topic tied the distractor to a real piece and was failed for knowing. Before
closing, test each distractor against **every** left item, with the same rigour you apply to
the correct pairs.

**The statement must warn that there are spare items on the right.** A student who does not
know that tries to fit them all and forces a wrong pairing, and grading is by exact set. This
is checked mechanically: a statement with no marker of surplus ("sobram", "não
correspondem"…) fails structurally. The hint does not serve for that warning — not every
student opens it.

A distractor only does its job if it **competes with the hardest pair**. One that is
discarded on sight changes nothing: the student solves the trivial pairs, and the hard one
still falls out by elimination. Real case: in a matching exercise about arithmetic operators,
\`"ababab"\` was visibly \`"ab" * 3\` and went immediately, so the pair between \`9 // 2\` and
\`9 / 2\` — the only one requiring knowledge of the types — kept coming for free. Replaced by
\`4.0\` and \`1.0\`, which compete with **both** integer-result expressions, the exercise began
requiring what it claimed to assess. The question to ask: after the easy pairs are solved,
does the hard one still have a competitor?

**Distractors must be indistinguishable from the correct items by shape.** A plausible
distractor is worthless if it gives itself away by its mould. Real case: the four correct
right items described effects the team observed ("os dois continuam no ar", "o artefato volta
a ser executado") and the two distractors opened with an internal-mechanism subject ("um
tradutor converte…", "cada processo recebe uma cópia dedicada do kernel…"). Different
category, and the student discards both knowing nothing about the subject. Same subject, same
tense, same length, same level of abstraction — across correct items and distractors alike.

**No right item may echo a word from the left.** This is a relative of the translation rule,
but the echo comes from the wording and not from the name. Real case: the situation said "o
roteiro tem 40 passos manuais" and the correct right said "os passos passam a ser um arquivo
de texto"; "exige a versão 3.8 e outro a 3.12" matched "os dois continuam no ar lado a lado".
Four pairs closed purely by word matching, without knowing what the technology does. Describe
the effect with vocabulary that does not appear in the opposite column.

**The right item must not be a translation of the left item's name.** \`pip list --outdated\` →
"mostra o que está desatualizado", \`df.head(3)\` → "as três primeiras linhas", \`deactivate\` →
"desativa o ambiente": in those cases the exercise measures English, not the topic. Describe
the **observable behaviour** — what changes after running it, what type comes back, what
happens in the edge case. "Depois dele, \`pip list\` mostra pacotes que não estavam lá"
requires having used the tool; "instala as dependências" requires reading the word install.

**expression-answer** — the student writes a mathematical expression and grading compares by
**symbolic equivalence**, not by text: \`2*x\`, \`x*2\` and \`x+x\` are the same answer. It serves
derivatives, integrals, limits, algebraic simplification — anything whose answer is an
expression.

Fill \`answer_expression\` in sympy syntax (\`**\` for power, explicit \`*\`, \`sqrt\`, \`log\`,
\`sin\`), and \`variables\` with the symbols used. A variable accepts a domain assumption in the
form \`x:positive\` — without it, sympy does not simplify \`sqrt(x**2)\` to \`x\`, and the student
who answers that way is failed. Declare the assumption whenever the statement implies it.

**The three check fields are what make this the most reliable type of the set.** They tell
sympy to **recompute the key on its own**:

- \`check_source\` — the starting expression (the integrand, the function to differentiate)
- \`check_operation\` — \`diff\`, \`integrate\`, \`simplify\` or \`none\`
- \`check_variable\` — the variable of the operation

Applying the operation to the source, the result has to match your key. If it does not, the
key is wrong and the exercise fails — with no judgement involved. Use \`none\` only when the
computation does not fit those three operations; an exercise without a check depends on your
key being right, which is exactly what cannot be assumed.

In an integral, writing \`+ C\` is accepted: the comparison ignores any term without the
variable of integration.

## Rules for options (quiz and multiple-choice)

These four failures showed up in nearly every quiz ever generated in this catalogue — check
them one by one before closing the question:

1. **Length.** The correct one comes out longer and more qualified than the others, full of
   caveats ("ainda que...", "mas depende de..."), and the student gets it right by shape. The
   ${options} entries should have similar length and similar degree of hedging. If the correct
   one needs a caveat, give the wrong ones a caveat too.
2. **Obvious absurdity.** A distractor nobody would mark is not a distractor, it is filler —
   remove it and the question shrinks. Every wrong option has to be something a real student
   would answer on a bad day.
3. **Absolutes.** "Sempre", "nunca", "só quando", "apenas depois que" — exam-takers discard
   those by habit, without reading the merit. Avoid them, unless the absolute is exactly the
   error under test.
4. **Odd category out.** Wrong options all from one subject and the correct one from another
   let the odd one be found without understanding anything. All of them must belong to the
   same field.

5. **Odd plausibility out.** A relative of obvious absurdity, but through mechanism: if the
   wrong options invent magical behaviour ("traduz chamadas em tempo de execução", "obriga o
   servidor a trocar de distribuição") and the correct one is the only sober statement,
   whoever did not study marks the sober one. Every wrong option must describe something that
   **exists** somewhere, applied to the wrong case.
6. **Syntactic mould.** If three wrong options follow the same shape ("X, para que Y") and the
   correct one does not, the odd one stands out without merit. Likewise when the question is
   plural and the correct one is the only one enumerating several items: the student picks the
   most comprehensive by habit. Vary the mould among the wrong ones, or apply the same one to
   the correct one.

The final test: can a clever student who **did not study the topic** eliminate the wrong
options by shape alone? If so, redo it. **These traits are checked by computation, for free,
before any call:** a correct option markedly longer than every wrong one; an absolute present
on one side only; a correct option echoing far more of the statement's vocabulary than any
wrong one; wrong options all opening with the same formula while the correct one does not;
and two more about hedging — a single option protected by an adverb of uncertainty
("provavelmente", "em geral", "tende a") being the correct one, and, in \`multiple-choice\`,
the set of hedged options coinciding exactly with the key. That last one is the easiest to
commit without noticing: writing a correct option you want to be exact, and exactness sounds
like hedging; writing a wrong one you want it to be false, and falsehood sounds categorical.
**If your correct options all came out qualified and the wrong ones all categorical, the
student gets the set right by tone.** Even the tone before closing: either hedge one of the
wrong options too, or state the correct one without cushioning.

## The socratic hint, in any type

It points at what to examine; it does not solve. Read on its own, it must not allow getting
the answer right. In a multiple-option question it must not discard the strongest distractor —
that reduces the choice to two.

**It points at where to look, not at how to decide.** The difference is the only one that
matters and it is easy to get wrong: "considere o que uma especificação padroniza e o que não
padroniza" points; "veja se a promessa é sobre o artefato ou sobre a ferramenta com que a
pessoa digita" decides — the two named categories are the two categories in dispute, and all
that is left for the student is matching vocabulary. In one entire round this was the most
expensive defect: the largest cause of paid rejection, always in the same way — the hint
formulated the criterion already applied to the case.

Part of that is checked for free: **two or more words from the hint appearing in a single
option, the correct one, fail structurally.** If your hint mentions "kernel" and "sistema
operacional" and only one option uses those words, it is not a hint, it is an arrow. Write the
hint with vocabulary that appears in no option, or in several.

**The hint must not reveal how many options are false or true.** In a five-item
\`multiple-choice\`, saying "duas delas erram" turns the question into label triage: the student
looks for the two that fit the named category and marks the rest. This is checked
mechanically — a number near "falsas"/"corretas" in the hint fails.

**The hint must not offer a criterion that contradicts the key.** It is the most expensive
defect of the set, because it fails precisely whoever masters the subject and trusts the
school's guidance. Real case: the hint said "verifique se a afirmação promete algo entre
ferramentas ou entre hardwares", suggesting that a promise between tools is true — and one of
the options marked wrong was precisely a promise between tools. Anyone applying the offered
heuristic would get the set wrong. After writing the hint, apply it to **every** option and
check that the result matches the key.
`;

/* One schema for every type. Fields that do not apply to the type come back empty: structured
 * output requires everything to be in `required`, and one schema per type would multiply the
 * calls with nothing gained. */
export function schema({ options }) {
  return {
    type: 'object',
    properties: {
      exercises: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            topic: { type: 'string', description: 'the exact topic this exercise validates' },
            type: { type: 'string', enum: GENERATABLE_TYPES },
            difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
            statement: { type: 'string' },
            language: { type: 'string', description: 'code and expected-output; empty otherwise' },
            skeleton: { type: 'string', description: 'code only' },
            tests: {
              type: 'array',
              description: 'code only',
              items: {
                type: 'object',
                properties: {
                  description: { type: 'string' },
                  input: { type: 'string' },
                  expected_output: { type: 'string' },
                },
                required: ['description', 'input', 'expected_output'],
                additionalProperties: false,
              },
            },
            given_code: { type: 'string', description: 'expected-output only: the snippet shown to the student' },
            answer: { type: 'string', description: 'expected-output only: the snippet\'s exact stdout' },
            options: {
              type: 'array',
              description: `quiz and multiple-choice only; ${options} items`,
              items: {
                type: 'object',
                properties: {
                  text: { type: 'string' },
                  correct: { type: 'boolean' },
                  why: { type: 'string' },
                },
                required: ['text', 'correct', 'why'],
                additionalProperties: false,
              },
            },
            items: {
              type: 'array',
              description: 'ordering only: the steps IN THE CORRECT ORDER',
              items: { type: 'string' },
            },
            trap: {
              type: 'string',
              description:
                'ordering only: which pair of neighbouring steps a careless student inverts, and why inverting breaks. Without it the exercise measures common-sense chronology.',
            },
            pairs: {
              type: 'array',
              description: 'matching only: couples that pair one to one',
              items: {
                type: 'object',
                properties: {
                  left: { type: 'string' },
                  right: { type: 'string' },
                },
                required: ['left', 'right'],
                additionalProperties: false,
              },
            },
            right_distractors: {
              type: 'array',
              description:
                'matching only: 1 or 2 right-column items that pair with nothing, so the last pair does not fall out by elimination',
              items: { type: 'string' },
            },
            answer_expression: { type: 'string', description: 'expression-answer only: the answer in sympy syntax' },
            variables: {
              type: 'array',
              description: 'expression-answer only: symbols used, optionally "name:assumption"',
              items: { type: 'string' },
            },
            check_source: { type: 'string', description: 'expression-answer only: starting expression' },
            check_operation: { type: 'string', enum: ['diff', 'integrate', 'simplify', 'none'] },
            check_variable: { type: 'string' },
            socratic_hint: { type: 'string' },
          },
          required: [
            'topic', 'type', 'difficulty', 'statement', 'language', 'skeleton',
            // Every field is required, with an empty value when it does not apply to the type.
            // An optional field here becomes an omitted field in the response, and `check`
            // demands `trap` on ordering and `right_distractors` on matching — both were left
            // out when they were added, which would have failed every exercise of those two
            // types structurally, precisely the ones that carry the 24 infra courses.
            'tests', 'given_code', 'answer', 'options', 'items', 'trap', 'pairs',
            'right_distractors', 'answer_expression', 'variables',
            'check_source', 'check_operation', 'check_variable', 'socratic_hint',
          ],
          additionalProperties: false,
        },
      },
    },
    required: ['exercises'],
    additionalProperties: false,
  };
}

/* Form tells: the key gives itself away without the student knowing the subject.
 *
 * This replaces a probe that asked a model to "answer without using knowledge of the
 * subject". It hit the key 9 times out of 9 and failed an entire course: a model cannot
 * suspend what it knows, so it invents a shape-based justification for the answer it already
 * believes in — in one case it even noticed an absolute in the correct option and argued that
 * it "came qualified" so it could include it. A probe that must always answer always answers,
 * and becomes opinion under another name.
 *
 * The heuristics it listed are computable, and computed ones do not confabulate. All of them
 * require STRICT SEPARATION between correct and wrong options — the tell only exists when
 * that trait alone separates the two groups.
 *
 * The vocabularies below are Portuguese because the exercises are. See the note at the top of
 * this file. */
/* THE VOCABULARY IS ENGLISH, because the exercises are authored in English now. It used to be
   Portuguese, and that was not a policy — it was a consequence of the source language. When
   the source moved, these had to move with it, or the whole free layer would go on running
   and flagging nothing, which is worse than not running at all.

   A translated exercise is NOT checked here: a translation is judged against its source, not
   against these rules. The checks run on the source. */
const ABSOLUTES = /\b(always|never|only|solely|any|none|no one|nothing|every|all|impossible|guarantees?|eliminates?|prevents?|forces?|requires no|dispenses with|abstracts away)\b/i;
/* Hedging is structure — contrast, concession, qualification — not a handful of terms. The
   probability adverbs belong here too: one round failed a question whose correct option was
   "the only one protected by an adverb of uncertainty". */
const HEDGE = /(as long as|provided that|unless|in general|generally|normally|usually|tends? to|comparable|approximately|most of the time|when possible|while |whereas|although|even though|despite|however|nevertheless|nonetheless|but |except|instead of|unlike|in practice|typically|may vary|depends on|probably|possibly|perhaps|maybe|potentially|often|rarely|frequently)/i;
const UNCERTAINTY = /(probably|possibly|perhaps|maybe|potentially|in general|generally|normally|usually|tends? to|most of the time|typically|may vary|almost always)/i;
/* Modal axis. The critic named this exact defect: "the three correct options are statements of
   possibility and the two wrong ones are statements of obligation or total guarantee". It is
   not the absolutes test — "makes", "serves", "can be run" are not absolutes and still
   separate the two groups perfectly. */
const CAN = /(\bcan\b|\bcould\b|\bmay\b|it is possible|are possible|manages to|allows?|lets?|nothing stops)/i;
const MUST = /(obliges?|guarantees?|ensures?|requires?|\bmust\b|\bshall\b|\bmakes\b|\bforces?\b|without exception|stops .* from|removes the need)/i;
const NUMBER = /\b(one|two|three|four|five|[1-9])\b/i;
const TRUTH_WORD = /\b(false|true|correct|wrong|incorrect)\b/i;
/* A multiple-choice statement mixing both polarities: "about what X solves **and what it does
   not**, mark all that apply". The student cannot tell whether to mark the true ones or the
   limits, and the two readings give opposite sets. */
const POLARITY = /\b(?:what|which|the ones)\b[^.?]{0,60}\band\b[^.?]{0,25}\b(?:what |which )?(?:does not|do not|doesn't|don't|is not|are not)\b/i;
const WARNS_SURPLUS = /(left over|leftover|do(?:es)? not (?:match|pair)|unmatched|extra|not all|spare)/i;
const STOPWORDS = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'these', 'those', 'from', 'into',
  'when', 'where', 'because', 'between', 'about', 'after', 'before', 'same', 'can', 'could', 'may',
  'its', 'their', 'his', 'her', 'more', 'less', 'than', 'each', 'every', 'one', 'two', 'not', 'but',
  'are', 'was', 'were', 'has', 'have', 'had', 'been', 'being', 'does', 'did', 'you', 'your', 'out']);

const words = (s) =>
  new Set(
    String(s)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .match(/[a-z_]{5,}/g) ?? [],
  );

export function formTells(e) {
  const p = [];
  const right = (e.options ?? []).filter((a) => a.correct);
  const wrong = (e.options ?? []).filter((a) => !a.correct);
  if (!right.length || !wrong.length) return p;

  // 1. Length: every correct one longer than every wrong one (or the reverse).
  const rLen = right.map((a) => a.text.length);
  const wLen = wrong.map((a) => a.text.length);
  if (Math.min(...rLen) > Math.max(...wLen) * 1.25)
    p.push(`form tell: every correct option is >25% longer than every wrong one (${Math.min(...rLen)} vs ${Math.max(...wLen)})`);
  if (Math.max(...rLen) * 1.25 < Math.min(...wLen))
    p.push(`form tell: every correct option is much shorter than every wrong one (${Math.max(...rLen)} vs ${Math.min(...wLen)})`);

  // 2. Absolutes: present on one side only. Exam-takers discard them by habit.
  const rAbs = right.filter((a) => ABSOLUTES.test(a.text)).length;
  const wAbs = wrong.filter((a) => ABSOLUTES.test(a.text)).length;
  if (rAbs === 0 && wAbs === wrong.length && wrong.length >= 2)
    p.push(`form tell: all ${wrong.length} wrong options carry an absolute ("sempre", "nunca", "só"…) and no correct one does`);
  if (wAbs === 0 && rAbs === right.length && right.length >= 2)
    p.push('form tell: only the correct options carry an absolute');

  // 3. Lexical echo: the correct option repeats the statement's vocabulary more than any
  // wrong one.
  const target = words(e.statement);
  const echo = (a) => [...words(a.text)].filter((w) => target.has(w) && !STOPWORDS.has(w)).length;
  const rEcho = right.map(echo);
  const wEcho = wrong.map(echo);
  // A one-word margin is noise: calibrated against 48 hand-written exercises, a +1 threshold
  // flagged 2 questions the critic had approved. A 3-word advantage is required.
  if (Math.min(...rEcho) >= 3 && Math.min(...rEcho) >= Math.max(...wEcho) + 3)
    p.push(`form tell: every correct option echoes far more of the statement than any wrong one (${Math.min(...rEcho)} vs ${Math.max(...wEcho)})`);

  // Counting misses the strongest case: a TECHNICAL term from the statement appearing in one
  // option only. "o back-end WSL2 falhou" with the single option saying WSL2 is settled by
  // word matching, and the echo counted 1 — below any counting threshold.
  //
  // Only identifiers count: an acronym or a term with a digit. The first version accepted any
  // word and flagged "executar", "marca" and "repetir" in two good exercises — a common verb
  // appearing in the statement and in one option is coincidence, not a tell.
  const IDENTIFIER = /\b(?=[\p{Lu}\d]*\p{Lu})(?=[\p{L}\d]*\d|[\p{Lu}]{2,})[\p{L}\d]{2,}\b/gu;
  const technical = new Set([...(e.statement.match(IDENTIFIER) ?? [])].map((s) => s.toLowerCase()));
  for (const term of technical) {
    const where = e.options.filter((a) => new RegExp(`\\b${term}\\b`, 'i').test(a.text));
    if (where.length === 1 && where[0].correct)
      p.push(`form tell: the technical term "${term}" is in the statement and in exactly one option, the correct one`);
  }

  // 3b. Hedging: the correct ones all qualified, the wrong ones all categorical. It mirrors
  // the absolutes test and catches what that one misses — "qualified = right" is as good an
  // exam heuristic as "absolute = wrong".
  const rHedge = right.filter((a) => HEDGE.test(a.text)).length;
  const wHedge = wrong.filter((a) => HEDGE.test(a.text)).length;
  // One correct option of slack. Strict separation missed the case where two of three correct
  // options come qualified and the third is too short to fit a caveat — the student sees the
  // pattern all the same. Measured against both corpora at once: no false positive on the 48
  // good ones, one more paid rejection caught for free. The wrong side still demands zero,
  // because loosening there flagged a good exercise.
  if (right.length >= 2 && wrong.length >= 2 && rHedge >= right.length - 1 && rHedge >= 2 && wHedge === 0)
    p.push(`form tell: ${rHedge} of ${right.length} correct options carry a caveat ("desde que", "comparável"…) and no wrong one does`);

  // 3c. The exam heuristic, simulated. The tests above ask whether a trait separates the two
  // groups; this one asks the thing that actually decides the grade: applying the rule of
  // someone who did not read the content — mark the hedged one, discard the absolute one —
  // does the exact key come out? If it does, the question is answerable by shape, and
  // exact-set grading makes that worse in `multiple-choice`, where getting the set right is
  // everything.
  //
  // Only valid for sets of two or more correct options. With a single correct option, hitting
  // the simulation by chance is far too easy: "enquanto" is a caveat in one sentence and an
  // ordinary contrastive conjunction in another, and one good question out of the 48 fell for
  // using "olha só ali, enquanto a lista compara".
  const cautious = (a) => HEDGE.test(a.text) && !ABSOLUTES.test(a.text);
  const marked = e.options.filter(cautious);
  if (right.length >= 2 && marked.length === right.length && marked.every((a) => a.correct) && marked.length < e.options.length)
    p.push(`form tell: marking the ${marked.length} hedged options and discarding the absolute ones gives the exact key`);

  // 3d. The single-correct-option case, which the simulation above does not cover: exactly one
  // option protects itself with an adverb of uncertainty and it is the right one. The
  // vocabulary here is narrower than HEDGE on purpose — only what softens a CLAIM. A
  // contrastive connective ("enquanto", "mas") is ordinary prose in an explanatory option and
  // was knocking out good exercises.
  const protectedOnes = e.options.filter((a) => UNCERTAINTY.test(a.text));
  if (e.options.length >= 4 && protectedOnes.length === 1 && protectedOnes[0].correct)
    p.push('form tell: a single option hedges itself with an adverb of uncertainty, and it is the correct one');

  // 3e. Modal axis: correct options say what CAN happen, wrong ones what the thing OBLIGES or
  // GUARANTEES. Exam-takers discard "obliges" and mark what comes in a tone of possibility,
  // getting the exact set right without knowing anything about the subject.
  const rCan = right.filter((a) => CAN.test(a.text) && !MUST.test(a.text)).length;
  const wMust = wrong.filter((a) => MUST.test(a.text) && !CAN.test(a.text)).length;
  if (right.length >= 2 && wrong.length >= 2 && rCan === right.length && wMust === wrong.length)
    p.push('form tell: all correct options speak of what is possible and all wrong ones of what is obligatory or guaranteed');

  // 4. Syntactic mould: the wrong options all open the same way and the correct one does not.
  // Two are enough when the mould is two words — "A conformidade …" opening exactly the two
  // wrong options out of five is as revealing as three, and the critic caught that case.
  const opening = (a) => a.text.toLowerCase().replace(/[`*]/g, '').trim().split(/\s+/).slice(0, 2).join(' ');
  const moulds = new Set(wrong.map(opening));
  if (wrong.length >= 2 && moulds.size === 1 && !right.some((a) => opening(a) === [...moulds][0]))
    p.push(`form tell: the ${wrong.length} wrong options all open with "${[...moulds][0]}" and no correct one does`);

  // 5. A hint that counts how many are false turns the exercise into label triage.
  const hint = e.socratic_hint ?? '';
  if (NUMBER.test(hint) && TRUTH_WORD.test(hint)) {
    const iN = hint.search(NUMBER);
    const iT = hint.search(TRUTH_WORD);
    if (Math.abs(iN - iT) < 60) p.push('form tell: the hint reveals how many options are false or true');
  }

  // 5b. A hint naming a term present in a single option. "the hint gives the answer away" was
  // the largest cause of paid rejection in an entire round, and part of it is computable: if
  // the hint says "conte quantos sistemas operacionais estão carregados" and exactly one
  // option talks about kernels, the match is textual, not conceptual.
  //
  // The statement is no good as a source for this test — it shares vocabulary with every
  // option by construction. The hint is short and hand-picked: every word carries weight.
  //
  // One word is not enough: "outro", "valor" and "saída" landed in a single option by chance
  // in three of the 48 good exercises. A bundle is required — two or more hint words all
  // pointing at the SAME option, and that option the correct one. Coincidence does not repeat
  // three times on the same target.
  if (right.length === 1) {
    const bundle = [];
    for (const term of [...words(hint)].filter((w) => !STOPWORDS.has(w))) {
      const where = e.options.filter((a) => words(a.text).has(term));
      if (where.length === 1 && where[0].correct) bundle.push(term);
    }
    if (bundle.length >= 2)
      p.push(`form tell: ${bundle.length} hint words (${bundle.join(', ')}) appear in a single option, the correct one`);
  }

  return p;
}

/* The rule "no right item may echo a word from the left" lived only in the prompt's prose, and
 * was disobeyed in an exercise where all four lefts mirrored their own rights lexically: "dez
 * containers" ↔ "todas as instâncias", "uma das máquinas virtuais" ↔ "só aquela instância",
 * "instaladas direto no sistema" ↔ "o gerenciador de pacotes". Four pairs closed by word
 * matching, without knowing what a shared kernel is.
 *
 * Mechanisable: for each pair, the vocabulary it shares with its OWN right against what it
 * shares with the others. If every left prefers its own, the exercise resolves by echo. */
export function pairEcho(pairs) {
  if (pairs.length < 3) return [];
  const shared = (a, b) => {
    const A = words(a);
    return [...words(b)].filter((w) => A.has(w) && !STOPWORDS.has(w)).length;
  };
  let echoing = 0;
  for (const pair of pairs) {
    const own = shared(pair.left, pair.right);
    const others = pairs.filter((o) => o !== pair).map((o) => shared(pair.left, o.right));
    if (own >= 1 && own > Math.max(0, ...others)) echoing++;
  }
  // Every pair is too demanding: one tie — the same word appearing in two rights — knocks the
  // whole check out, and that is what happened in the real case that motivated it. One pair of
  // slack keeps the rigour without depending on luck of vocabulary.
  return echoing >= pairs.length - 1
    ? [`matching where ${echoing} of ${pairs.length} left items echo their own right — the pairs close by word matching`]
    : [];
}

/* There is NO mechanical check for "requires a later topic", and the attempt is recorded so it
 * is not repeated. The idea was to compare the exercise text against the vocabulary of the
 * following topics' titles. It flagged 5 of the 48 good exercises: "biblioteca", "padrão",
 * "objetos" and "arquivos" appear in a later topic title AND in ordinary prose, and there is
 * no lexical way to tell "mentions the word" from "requires the concept". Demanding two words
 * from the same later topic did not save it — "biblioteca padrão" fell the same way.
 *
 * The defect is real and expensive, but the answer is not to detect it: it is not to let it
 * happen. The generator used to receive the WHOLE syllabus and reached forward because it
 * could see forward. See `courseContext()` in catalog.mjs, which now cuts the list at the last
 * topic of the batch. */

/* Structural check: free, no API and nothing executed. */
export function check(e, { options }) {
  const p = [];
  const empty = (s) => !s?.trim?.();

  if (empty(e.topic)) p.push('no topic');
  if (empty(e.statement)) p.push('no statement');
  if (empty(e.socratic_hint)) p.push('no socratic hint');

  const mustNotHave = (field, value, label) => {
    if (value) p.push(`${e.type} carrying ${label} (${field} belongs to another type)`);
  };

  if (e.type === 'quiz' || e.type === 'multiple-choice') p.push(...formTells(e));

  if (e.type === 'code') {
    if (empty(e.language)) p.push('code without language');
    if (empty(e.skeleton)) p.push('code without skeleton');
    if ((e.tests?.length ?? 0) < 3) p.push(`code with ${e.tests?.length ?? 0} cases (minimum 3)`);
    for (const [i, t] of (e.tests ?? []).entries()) {
      if (typeof t.expected_output !== 'string') p.push(`case ${i + 1} without expected_output`);
      if (empty(t.description)) p.push(`case ${i + 1} without description`);
    }
    mustNotHave('options', e.options?.length, 'options');
    mustNotHave('items', e.items?.length, 'items');
  } else if (e.type === 'expected-output') {
    if (empty(e.language)) p.push('expected-output without language');
    if (empty(e.given_code)) p.push('expected-output without given_code');
    if (typeof e.answer !== 'string' || e.answer === '') p.push('expected-output without answer');
    mustNotHave('options', e.options?.length, 'options');
    mustNotHave('items', e.items?.length, 'items');
  } else if (e.type === 'quiz' || e.type === 'multiple-choice') {
    const n = e.options?.length ?? 0;
    if (n !== options) p.push(`${e.type} with ${n} options (expected ${options})`);
    const correct = (e.options ?? []).filter((a) => a.correct).length;
    if (e.type === 'quiz' && correct !== 1) p.push(`quiz with ${correct} correct (expected 1)`);
    if (e.type === 'multiple-choice') {
      if (POLARITY.test(e.statement ?? ''))
        p.push('multiple-choice whose statement mixes both polarities ("o que X e o que não X") — it does not say which side to mark');
      if (correct < 2) p.push(`multiple-choice with ${correct} correct (minimum 2)`);
      if (correct >= n) p.push('multiple-choice with every option correct');
    }
    if ((e.options ?? []).some((a) => empty(a.why))) p.push('option without "why"');
    if ((e.options ?? []).some((a) => empty(a.text))) p.push('option without text');
    mustNotHave('tests', e.tests?.length, 'tests');
    mustNotHave('items', e.items?.length, 'items');
  } else if (e.type === 'expression-answer') {
    if (empty(e.answer_expression)) p.push('expression-answer without answer_expression');
    if (!(e.variables?.length)) p.push('expression-answer without declared variables');
    const op = e.check_operation;
    if (!['diff', 'integrate', 'simplify', 'none'].includes(op)) p.push(`invalid check_operation: ${op}`);
    if (op && op !== 'none') {
      if (empty(e.check_source)) p.push('check without source');
      if (empty(e.check_variable)) p.push('check without variable');
      const names = (e.variables ?? []).map((v) => String(v).split(':')[0]);
      if (e.check_variable && !names.includes(e.check_variable))
        p.push(`check variable "${e.check_variable}" is not among the declared variables`);
    }
    mustNotHave('options', e.options?.length, 'options');
    mustNotHave('tests', e.tests?.length, 'tests');
  } else if (e.type === 'matching') {
    const n = e.pairs?.length ?? 0;
    if (n < 4) p.push(`matching with ${n} pairs (minimum 4)`);
    if (n > 6) p.push(`matching with ${n} pairs (maximum 6)`);
    const left = (e.pairs ?? []).map((x) => x.left);
    const right = (e.pairs ?? []).map((x) => x.right);
    // A repeated column means more than one possible key.
    if (new Set(left).size !== n) p.push('matching with a repeated item on the left');
    if (new Set(right).size !== n) p.push('matching with a repeated item on the right');
    if ([...left, ...right].some(empty)) p.push('matching with an empty item');
    // Without a distractor, N against N makes the last pair fall out by elimination: the
    // student gets right an item they never evaluated.
    const distractors = e.right_distractors ?? [];
    if (distractors.length < 1) p.push('matching without a right-column distractor (minimum 1)');
    if (distractors.length > 2) p.push(`matching with ${distractors.length} distractors (maximum 2)`);
    if (distractors.some(empty)) p.push('matching with an empty distractor');
    if (distractors.some((x) => right.includes(x))) p.push('matching with a distractor equal to a correct right item');
    // A student who does not know items are spare tries to fit them all, and grading is by
    // exact set. Requiring the distractor without requiring the warning trades one defect for
    // another.
    if (distractors.length && !WARNS_SURPLUS.test(e.statement ?? ''))
      p.push('matching with distractors but the statement does not warn that items are left over on the right');
    if (new Set(distractors).size !== distractors.length) p.push('matching with a repeated distractor');
    p.push(...pairEcho(e.pairs ?? []));
    mustNotHave('options', e.options?.length, 'options');
    mustNotHave('tests', e.tests?.length, 'tests');
  } else if (e.type === 'ordering') {
    const n = e.items?.length ?? 0;
    if (n < 4) p.push(`ordering with ${n} items (minimum 4)`);
    if (n > 7) p.push(`ordering with ${n} items (maximum 7)`);
    if (new Set(e.items ?? []).size !== n) p.push('ordering with a repeated item');
    if ((e.items ?? []).some(empty)) p.push('ordering with an empty item');
    // Without a named trap the exercise measures common-sense chronology: 3 of 3 were failed
    // for that in the first real round.
    if (empty(e.trap)) p.push('ordering without a declared trap');
    // Anaphora pins the position through the text: "executa **esse** bytecode" only makes
    // sense after the step that produces it, and the student orders by grammar.
    const ANAPHORA = /\b(this|that|these|those|the previous|the former|the latter|it|above)\b/i;
    for (const [i, t] of (e.items ?? []).entries()) {
      if (ANAPHORA.test(t)) p.push(`ordering: item ${i + 1} refers to another step ("${t.match(ANAPHORA)[0]}")`);
    }
    mustNotHave('options', e.options?.length, 'options');
    mustNotHave('tests', e.tests?.length, 'tests');
  }

  return p;
}

export function summary(e) {
  if (e.type === 'quiz' || e.type === 'multiple-choice') return `${e.options?.length ?? 0} options`;
  if (e.type === 'code') return `${e.tests?.length ?? 0} cases`;
  if (e.type === 'ordering') return `${e.items?.length ?? 0} steps`;
  if (e.type === 'matching') return `${e.pairs?.length ?? 0} pairs`;
  if (e.type === 'expression-answer') return e.check_operation ?? '';
  if (e.type === 'expected-output') return e.language;
  return '';
}

/* Human reading of an exercise.
 *
 * Review by a person is the only external signal this pipeline has, and nobody reviews JSON.
 * This is what makes `--view` worth its lines. */
export function render(e, n) {
  const L = [`${'─'.repeat(78)}\n#${n}  ${e.type}  ·  ${e.difficulty}  ·  ${e.topic}\n`];
  L.push(e.statement);
  L.push('');

  if (e.options?.length) {
    for (const a of e.options) {
      L.push(`  [${a.correct ? 'X' : ' '}] ${a.text}`);
      L.push(`        ↳ ${a.why}`);
    }
  } else if (e.type === 'expected-output') {
    L.push(`  code (${e.language}):`);
    L.push(e.given_code.split('\n').map((l) => '    ' + l).join('\n'));
    L.push('  expected output:');
    L.push(e.answer.split('\n').map((l) => '    ' + l).join('\n'));
  } else if (e.type === 'code') {
    L.push(`  skeleton (${e.language}):`);
    L.push(e.skeleton.split('\n').map((l) => '    ' + l).join('\n'));
    for (const [i, t] of (e.tests ?? []).entries()) L.push(`  case ${i + 1} (${t.description}): ${JSON.stringify(t.input)} → ${JSON.stringify(t.expected_output)}`);
  } else if (e.type === 'ordering') {
    for (const [i, t] of e.items.entries()) L.push(`  ${i + 1}. ${t}`);
    L.push(`  trap: ${e.trap}`);
  } else if (e.type === 'matching') {
    for (const p of e.pairs) L.push(`  ${p.left}  ↔  ${p.right}`);
    for (const d of e.right_distractors ?? []) L.push(`  (distractor) ${d}`);
  } else if (e.type === 'expression-answer') {
    L.push(`  variables: ${(e.variables ?? []).join(', ')}`);
    L.push(`  key: ${e.answer_expression}`);
    L.push(`  check: ${e.check_operation}(${e.check_source}, ${e.check_variable})`);
  }

  L.push('');
  L.push(`  hint: ${e.socratic_hint}`);
  return L.join('\n');
}
