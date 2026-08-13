# codeschool.ing — a showcase of courses and tracks

The `codeschool.ing` site — **Stage 1: the showcase**. It presents courses, training tracks and the methodology, and hands whoever is convinced to the portal. There is no login, no payment and no student area *here*: that is Stage 2, which was **built to measure** rather than bought off the shelf, and is live — the portal at `codeschool-ing/portal-frontend` and its API at `codeschool-ing/portal-backend` (`api.codeschool.ing`). **The school is self-service end to end**: every "start now" on this page is a link to `app.codeschool.ing`, where the person creates their own account. Nothing here collects a contact, because nobody gets back in touch — see "The way in is the portal".

**This code was born as Televideo Informática's showcase and was transferred to codeschool.ing.** The catalogue — 105 courses and 18 tracks across programming, data, infrastructure, security and AI — was always this school's: the audience is whoever wants to work in technology. Televideo serves another audience (computing as a user, without becoming a programmer) and will get its own version from this same base, swapping `catalog.js` and the identity.

What the transfer required beyond the name: **the claims about history had to go**. "Since 1999", "who has been teaching for 25 years", "5,000+ graduates" and "from Medianeira to the world" are true about Televideo and would be a lie about a school that is just being born. In place of the student counter came the **catalogue's real total workload**, computed in `script.js` from `catalog.js` — a number that is already true on the day the site goes up and that grows by itself when a new course arrives.

A dark/terminal identity, the brand's blue, an optional light theme and **fullpage** — each section fills the screen's height and scrolling (mouse, keyboard or touch) jumps smoothly between them, with side indicators. Long panels (the catalogue, a track on mobile, the testimonials) scroll internally before switching screen. In plain HTML, CSS and JavaScript — no dependencies and no build.

A track is presented as a **dependency graph**: each column is a level and the edges show what unlocks what. The tracks come in two families — **by career** and **by technology** — each in its own row of tabs, both visible at once. Each row stays on **a single line**, with horizontal scrolling, arrows at the ends and a fade at the edge showing which side has more tabs. The active tab is brought into view by itself, so the picker copes with the next track without becoming two lines or leaving an orphan tab.

## A note on language

**English is the product's source language** — the code, the comments, the documentation, the DOM contract and the catalogue. Portuguese was not deleted: it changed role. It used to be the base, which is why it needed no dictionary; it is now the fifth translation, alongside Spanish, French and Italian.

The `en` dictionaries are gone, because they would have been identity maps. A missing entry in any language falls back to the key, and the key is already the string to show. Browser detection falls back to English.

| file | holds |
| --- | --- |
| `assets/i18n-pt.js` | the interface and the testimonials in Portuguese |
| `assets/i18n-courses-pt.js` | the catalogue in Portuguese — names, summaries, syllabus, topics, prerequisites, and the tracks |

**The course and track ids are a contract with `codeschool-ing/portal-frontend`**, which renamed first and stores them in a student's browser. Its `MOVED_IDS` in `app/state.js` is the authoritative old-to-new map. Do not rename an id here without renaming it there.

## Structure

```
index.html            → the site's sections
assets/catalog.js     → COURSES, TRACKS and TESTIMONIALS (this is where the content is maintained)
assets/i18n.js        → es/fr/it interface dictionaries + testimonials
assets/i18n-pt.js     → the interface in Portuguese
assets/i18n-courses-pt.js → the catalogue in Portuguese
assets/i18n-courses-es.js → the catalogue in Spanish
assets/i18n-courses-fr.js → the catalogue in French
assets/i18n-courses-it.js → the catalogue in Italian
assets/i18n-runtime.js→ language detection, switching and reapplication
assets/style.css      → styles
assets/script.js      → tracks, catalogue, course modal, newsletter
assets/favicon.svg    → a chevron and a prompt cursor, in the theme's colours
.devcontainer/        → the development environment; needs Node and Python
                        (the bundler is Python, the catalogue validator is Node)
tools/                → utilities, outside the site; one folder per tool
  bundle/             → builds the single HTML file; writes at the root
  validate-catalog/   → checks `requires`: non-existent ids and cycles
```

## Components that change shape with the width

Three scrollable rows become a **dropdown menu** where they do not fit — below 700px, where "← item item →" would show half an item at a time and the arrow would take up more room than the label:

| where | wide screen | narrow screen |
| --- | --- | --- |
| tracks | two rows of tabs, one per family | a single menu, with the list grouped by family |
| catalogue filters | chips on one line with arrows | a menu with the current category and the count |
| top menu | links on show | burger menu (below 1180px) |

The top bar collapses at **1180px**, not 960px: with the language picker and the student area, below that the links wrapped onto two lines and the bar covered the first row of tracks. The bar has a fixed height of 64px precisely so the sections can count on it. Below 620px the **student area** goes — it is a placeholder for future functionality, so it is the first to give up space, before the burger menu.

## Five languages, with English as the source

The site speaks **English, Portuguese, Spanish, French and Italian**. The picker sits next to the theme button, and the initial language comes from `navigator.languages` — the **language configured in the browser**, not geolocation. That is the right signal: a Brazilian browsing from abroad still wants Portuguese, and it asks the user for no permission. An explicit choice lives in `localStorage` and beats the detection.

**The translation key is the English text itself.** That has three practical consequences:

1. English needs no dictionary — it is the source.
2. The HTML needs no `data-i18n` attributes: a walk of the **text nodes** stores each fragment's original on load. Text nodes, not elements, because sentences broken by a `<strong>` or a `<span>` in the middle would be left out.
3. **Every missing key falls back to English by itself.** The dictionary can grow gradually without the screen breaking along the way — which is exactly the current state.

The catalogue's data does not go through a translation function: on a language switch, the `COURSES`, `TRACKS` and `TESTIMONIALS` objects are **rewritten in place** from a copy of the English stored on load. That way all the rest of the code goes on reading `c.name` without knowing a translation exists, and each field falls back to English on its own when the translated version is missing.

**Everything is translated, in all four non-source languages**: the interface (163 keys), all 18 tracks in full (name, objective, outcome, the fork's label, the note and the option names), the testimonials and the whole catalogue — `name`, `summary`, `syllabus`, `topics` and `prerequisites` for all 105 courses. That is **2,988 strings per language**, close to twelve thousand in total. The catalogue lives in its own file per language (`i18n-courses-<code>.js`) because on its own it weighs more than the rest of the site put together.

Adding a language is: one line in `LANGUAGES` (in `i18n-runtime.js`), a `ui`/`testimonials` block in `i18n.js` and a `tracks` block in the catalogue file and a catalogue file. The check that runs against the source flags any missing field and any topic list whose length differs from the original — that is how the five languages closed with no gaps.

Vocabulary per language for "track": *trilha* in Portuguese, *itinerario* in Spanish, *parcours* in French, *percorso* in Italian. It is the term each country's vocational training uses, not the literal translation.

**What is deliberately not translated**: the brand ("codeschool.ing"), the social network names, the e-mail address and the hero terminal's commands. They are proper names and contact data — translating them would break the identity or the datum.

**In the terminal, the command is always in English and the response follows the user's language.** `codeschool --status`, `tracks --career`, `course <id> --info` and `start` are a tool's name, and a tool is not translated; the output lines are text, and text is translated — including the thousands separator, which comes out of `toLocaleString` with the current language. See "The hero terminal" below.

**A sentence assembled from pieces does not survive translation.** "faz parte de 2 trilhas de carreira" was prefix + noun + suffix, which works in Portuguese, where the qualifier comes after — and came out as "part of 2 tracks career tracks" in English, where it comes before. Sentences like that become **a single key**, with `{n}` in place of the number. Word order is something only the whole sentence settles.

Course names are translated the way the local market advertises them, not word for word: "Testes Automatizados e CI/CD" becomes *Automated Testing and CI/CD*, because that is how a student abroad searches. A technology's proper name stays intact in all five languages. The Spanish is neutral Latin American — the audience arriving from Mercosur.

## How to maintain the catalogue

Everything lives in `assets/catalog.js`:

- **`COURSES`**: each course has `id`, `name`, `category`, `level`, `hours`, `summary`, `syllabus` (a list), `topics` (a list), **`requires`** (a list of prerequisite ids) and `prerequisites` (a free note, almost always empty). The categories are free-form — the filter chips build themselves.
> The tracks cover the topics of the public roadmaps for [Front-end](https://roadmap.sh/frontend) (34 nodes), [Back-end](https://roadmap.sh/backend) (23), [DevOps](https://roadmap.sh/devops) (22), [Data Engineer](https://roadmap.sh/data-engineer) (36), [Network Engineer](https://roadmap.sh/network-engineer) (29), [Prompt Engineering](https://roadmap.sh/prompt-engineering) (30), [AI Engineer](https://roadmap.sh/ai-engineer) (18), [Software Architect](https://roadmap.sh/software-architect) (17), [Cyber Security](https://roadmap.sh/cyber-security) (6 nodes, ~300 items), [DevSecOps](https://roadmap.sh/devsecops) (17), [BI Analyst](https://roadmap.sh/bi-analyst) (45), [Go](https://roadmap.sh/golang) (~160 items), [Docker](https://roadmap.sh/docker) (37), [Kubernetes](https://roadmap.sh/kubernetes) (~52), [Java](https://roadmap.sh/java) (~95) and [QA Engineer](https://roadmap.sh/qa) (~120) from the roadmap.sh community — the *learning sequence* served as a reference; the syllabuses and the copy are our own.

- **`TRACKS`**: each track has `name`, `goal`, `outcome` (the role or outcome) and `courses`, an array of ids **in the order they should be taken**. The same course can be in as many tracks as it likes: the site works out by itself how many tracks contain each course and shows the "em N trilhas" badge.
- **`TESTIMONIALS`**: text, author and context.

Adding a course to a track is just including the `id` in the sequence — the total workload, the number of steps, the badges and the form's selector all update automatically.

### A track is a graph, not a queue

`requires` is the list of a course's prerequisite ids. It is structured data, not text: the site uses it to **draw the track's graph**, to link the courses in the modal and to compute levels.

```js
{ id: 'git',        depende: ['web-fundamentals'] },
{ id: 'html-css',   depende: ['web-fundamentals'] },   // the same prerequisite
{ id: 'react-ts',   depende: ['javascript', 'git'] }, // two prerequisites
{ id: 'apis',       depende: ['node', 'sql-databases'] },
```

**A course's level is 1 + the highest level among its prerequisites.** Whatever lands on the same level can be done in any order — `git` and `html-css` sit side by side because both depend only on `web-fundamentals`. It was exactly that parallelism the linear presentation hid.

On screen, each level is a column and the edges are drawn in **SVG over the cards' real positions**, measured after the layout exists (and redone on `resize` and when the fonts load). Below 861px the graph becomes a list: the edges disappear, the levels stack and the dependency is read in the card's footer, in "depois de X". The breakpoint is where three or four levels fit at once — below that the lane would show a card and a half at a time, and the list conveys more than the graph.

### The order within each level is optimised, not written

The order of the nodes inside a level is **not the declaration order, and it is not pinned track by track**. The algorithm measures the drawing that will come out and looks for the order that produces the fewest line crossings — a new track comes in and is optimised the same way, with nobody fixing anything by hand.

The cost has **three criteria, compared in priority order** (lexicographically, not summed — that way no lesser criterion buys an extra crossing):

1. **Crossings.** An edge from one level to the next becomes a direct curve: two cross when the vertical order of their endpoints inverts. An edge that skips levels does **not** enter as a straight line — it is diverted outside the graph by the router (see below), and therefore only crosses anything on the way out and on the way in, going up or down to the free lane. The cost counts exactly that, and picks the same side the router would pick.
2. **Upward bias.** With up and down tied, the diversion goes up. It is a convention, but a uniform one: with every shortcut leaving the same side, the track's main body stays contiguous instead of being split by lines passing on both sides.
3. **Curriculum order.** Among equally clean drawings, the one that keeps the courses in the sequence the track declares wins. Without that criterion each start of the optimiser returned an arbitrary permutation among the good ones, and a level like "Qualidade · Performance · Entrega · Multiplataforma" showed up shuffled for no gain at all.

The search is three pieces of Sugiyama's method:

- **barycentre** — each node is pulled towards the mean (or median) height of its neighbours in the next column. It gets close fast, but it gets stuck: some cases only improve by moving **two** columns, and no isolated swap improves anything on its own;
- **transposition** — swap neighbouring pairs within a column as long as that does not make things worse. Accepting the **tied** swaps is what unlocks those cases: the first swap moves sideways, the second collects the gain;
- **multiple starts** — the two above are pure greedy and the result depends on where you begin. It restarts from the curriculum order, the reverse and four shuffles, keeping the best. The shuffle uses a fixed-seed generator: the output is always the same, the graph does not change shape between visits. On the shuffled starts the transposition runs **before** the barycentre — if the barycentre ran first it would reorder everything by neighbours and erase the shuffle, and the start would stop being a different start.

It costs ~1.5 ms per track, once per page open. **Result across the 16 tracks: 5 crossings → 0.** It is as a consequence of that, and not of a written rule, that Git e Controle de Versão sits above Linux e Linha de Comando in DevOps e SRE and in Engenharia de Dados: Git is a leaf in those two tracks and its outgoing line crosses the whole graph; at the top it goes straight over, in the middle it would cross Linux's lines.

**No edge passes behind a card.** The decision to go around is **geometric, not topological**: the rectangle between the two endpoints is measured and, if there is any card inside it, the line goes around the outside. The old rule was "skipped more than one column, go around" — and it let through the case that only appears on a **wide and short** screen, when `splitLevels()` divides a level into sub-columns and the neighbouring card enters the corridor of an edge between **adjacent** levels.

The detour is local: it passes just above the highest card in the way, or just below the lowest, on the cheaper side. If that short detour bumps into another card, the line retreats to the free lane above or below the whole graph — which is always clear, and that is what `.grafo-niveis` has `padding: 20px 0` for. The side is re-evaluated on that retreat, because the cheaper one for the short detour is almost never the same as for the long one.

**The detour's clearance is 16px, not 11.** At 11 some lines passed within 2px of a card that was not one of their endpoints — measuring point by point along each curve, the worst case in the whole catalogue was 1.8px. Raising the clearance on its own was not enough: the corridor between two stacked cards was 10px, and would not fit 16 on each side. That is why `.subcol` opened up to 16px alongside. The worst case went from 1.8px to 8px, and the median settled around 33px.

The curve's two rises have independent widths, computed from **each endpoint's real clearance**. With sub-columns the gap between cards falls from 48px to 14px, and a fixed 26px rise went straight through the neighbour — it was precisely through that rise that the line entered the card.

This is verifiable, and now it is verified on every pull request: `tools/graph-test/graph-test.js` renders every track in Chromium, samples 120 points of each drawn path and fails if one falls inside a card that is not an endpoint of that edge. **1,852 edges across 18 tracks, every branch of every fork, at four screen sizes — zero.** It was checked by breaking the router on purpose: with the detour around obstacles disabled it reports 513 crossings and exits non-zero, which is the only reason to believe the zero.

Each edge is a `<g>` with two paths — one transparent and thick, only to catch the cursor, and the visible one. Hovering **the line** highlights it; hovering **the card** lights up every edge entering and leaving it.

**The track's description sits beside the numbers, pinned to 58ch, and not at the page's width.** The alternative was tried — title and numbers on top, description filling the whole line below — and it gave 26px of height back to the graph, because the 16 tracks then fitted in two lines instead of four to six. But the ~1250px line was too wide for the eye to follow, and the title lost the company of the numbers. It was reverted: **graph height does not buy text legibility**.

Of what came along with that attempt, only the Go track's objective stayed, which was the one at 375 characters and was shortened in all five languages — the sentence that went was the usual one about roadmap.sh, and the text ended up more like the other tracks'.

**The graph's lane hugs the graph**, instead of taking up all the height left over. The splitting is still measured at full height — that is what decides how many courses fit in a column — but afterwards the lane shrinks to the content's size. Without that the cards sat centred in a much taller lane, and the name+objective block had 33px of slack to the tabs above against 103px to the first card below.

Three layout rules keep the graph inside the screen, with no scrollbar on show:

1. **The graph takes whatever height is left** in the section, instead of a fixed height.
2. **A level with many courses breaks into sub-columns** instead of stretching downwards — the graph grows horizontally, which is where the navigation is. It is the last resort, not the first: see below.
3. **Arrows at the ends** move forwards and backwards one screenful of levels, and a fade shows which side still has graph. The same arrows exist in the track picker.

**Height is this section's scarce resource, and the section was designed around that.** Rule 1 has a direct consequence: every pixel spent above the graph is one course fewer per column, and a column broken in two breaks the reading of "column = level". The arithmetic on a 768px laptop (a usable window of 681px) was this:

| block | before | after |
| --- | --- | --- |
| section heading (tag + `h2` + paragraph) | 161px | — |
| tag on the same line as the switcher | — | 41px |
| tabs | 52px | 48px |
| track top (name, objective, numbers) | 120px | 98px |
| **the graph's lane** | **207px** | **402px** |

The `h2` "Um caminho, não uma lista de cursos" and the paragraph explaining the graph metaphor **were removed from this section** — they are the only screens on the site without a complete `.sec-head`. The `// TRACKS DE FORMAÇÃO` tag shares the line with the family switcher, so the section keeps its identity at zero height cost. The explanatory text was lost on purpose: the `N níveis · 4 deles com ordem livre` strip already says the track is not a queue, and the graph shows it.

With 402px instead of 207px, **three courses fit in a column** where one used to. Of the 16 tracks, at 1920×950 none breaks into sub-columns; at 1366×768 only one is left — Front-end's level 05, which has four courses and genuinely does not fit. `splitLevels()` now subtracts the lane's real padding instead of a constant, because the magic number would silence any future gain.

### The arrows: a click pages, a hold glides

A screenful per click is the right size for crossing a long track and the wrong size for arriving at one. The last press overshoots, and the card you were reaching for ends up cut in half against the edge of the lane — the graph scrolls in pixels, and a level does not divide into screenfuls.

Snapping the jump to a card boundary was the obvious fix and is not the one taken: it changes what a click does, and a click that sometimes moves 1,018px and sometimes 840px is harder to predict than one that always moves the same amount. The behaviour was added underneath instead. **Press and hold and the graph glides**, continuously, stopping the instant the button is released — the adjustment a click cannot make is made by not letting go yet.

The two do not collide. Nothing happens for the first 300ms, so an ordinary click is untouched; once the glide has started, the click that the release would otherwise fire is swallowed in the capture phase, before either handler sees it. It ramps from 0.22px/ms to 0.95px/ms over 700ms: at full speed from the first frame it would overshoot exactly like the click does, and without the ramp holding on would never get you across a twelve-level track.

Both families of arrow answer to it — the graph's and the tab rows' — because two identical-looking controls that behave differently is worse than either behaviour. The frame delta is clamped to 64ms, or a tab returning from the background would jump the width of however long it was away, and the loop stops itself when `scrollLeft` stops changing, which is the end of the track.

Breaking into sub-columns is **measured in JavaScript**, in `splitLevels()`: each `.nivel` gets one `.subcol` per column, and the function measures each card's real `offsetHeight` to fill a sub-column up to the limit before opening the next. It is not fussiness — neither `flex-wrap` in `flex-direction: column` nor CSS multi-column expands the container's width, so the cards left over ended up **on top of the neighbouring level**. That is what scrambled the Front-end graph, whose level 05 has four courses. The function runs before `drawEdges()`, and collapses everything back into a single sub-column when the CSS is in list mode.

### The corridor the router could not see

Not crossing a card and taking a sensible route are two different things, and only the first was checked. An edge from Linux and the Command Line to Web Servers and Caching, on Back-end at 1920×950, was **1,132px long for a 682px gap** and climbed to y=6 — the lane above the entire graph — to get there. It crossed nothing. It also went nowhere near the straight line, and it only did it at some window heights, because it depends on how the level splits into sub-columns.

The router knew two ways past an obstacle: above every card in the way, or below every one of them. Between two of them was not a case it had. So when a fork block sat above a course card with a gap between them, the edge went over the top of the block instead of through the gap.

Now every free horizontal corridor across the span is a candidate — above, below, and each gap between merged obstacles — and the cheapest by deviation from the two endpoints wins. Any corridor between them costs exactly the height difference the edge had to cover anyway, so a corridor beats going around whenever one exists.

**The threshold is not `CLEARANCE`.** That constant is how far a detour stays from a card it goes *around*, with open space on the far side; threading needs only enough room to read as a corridor. Set at 32px, it rejected every real gap — the layout leaves about 17px between a fork block and the card beneath it — and the first attempt at this improved nothing: 88 crooked edges became 82. At 14px:

| | before | after |
| --- | --- | --- |
| crookedness across 1,852 edges | 1.1488 | **1.1113** |
| edges over 1.35× their straight line | 88 | **5** |
| the worst one | 2.20× | **1.40×** |
| the edge in the report, at 1920×950 | 1,132px, rising to y=6 | **700px, ratio 1.03** |

The graph test prints the crookedness ratio now. It does not fail on it — a threshold there would be arbitrary — but a change that makes the graph more tangled shows up as a number in CI instead of as a complaint about a screenshot.

When a course has **no prerequisite inside that track**, it inherits the previous item in the `courses` list as a dependency. Without that, courses like `cloud` and `testing-cicd` — whose real prerequisites are in other tracks — would all land on the Data track's first level. The declared order still applies where there is no better information.

Every path ends at the **finish node** — a circular seal with a flag, deliberately different from a course card, carrying the track's `outcome`. It exists so that no course is left visually loose: terminal courses like `ai-dev` in Back-end are nobody's prerequisite, and without the finish node they would look forgotten in the middle of the graph.

When the order is the curriculum's and not the content's, the track declares it in **`links`**:

```js
ligacoes: { 'sql-databases': [3], 'apis': [3] }   // 3 = the index of the choice step
ligacoes: { 'sql-databases': ['excel-analytics'] } // or a course id
```

SQL does not require a server language — but in the Back-end track it comes after one. `requires` holds the **content** prerequisite, which is global; `links` holds **that track's** order.

A step with a fork enters the graph as **a single node** — it is a decision, not a course. Whoever depends on a course inside the block (`sql-databases` depends on `node`) receives the edge from the whole block, so the graph stays correct on whichever path is chosen.

In the modal, `requires` becomes **prerequisite** buttons (red, pointing backwards) and its inverse becomes **"abre caminho para"** (blue, pointing forwards) — you can navigate the catalogue by its dependencies.

### The step key is a position, and positions move

A track's fork is translated under `steps`, keyed by **the index of the choice in `courses`**. Inserting a step before it moves the key, and nothing in the file says so.

That shipped. The `requires` audit put `linux-terminal` into Back-end and `networks` into Data; both forks moved one place along; the dictionaries kept the old keys. The label of the Back-end fork — *you choose the server language* — and of the Data one fell back to English in Portuguese, Spanish, French and Italian. The page rendered, nothing threw, and the only way to see it was to open the track in another language and read the strip.

That fallback is correct behaviour: a missing key is what a half-finished translation looks like, and falling back to the source beats an empty label. It is also what makes the mistake invisible, which is why it had to become a check rather than a habit. `tools/validate-i18n/validate-i18n.js` compares the four dictionaries against the catalogue: every course present, `syllabus` and `topics` the same length as the source, every track's fork translated at the position it actually forks at, and no translated step at a position that does not fork. It exits non-zero and runs in CI beside the catalogue check.

It found the two shipped labels, and it fails on them again if the key is moved back.

### `requires` was doing two jobs

The field said "what this course depends on", and the catalogue used it for two different things: **content** — you cannot understand Kubernetes without Docker — and **curriculum order** — in the Data track, governance comes after big data. The second is not a property of the course, it is a property of one track, and `links` already existed for exactly that.

The cost of the conflation was measured before it was fixed. A check was added first — *a prerequisite absent from the track showing the course* — and it found **30** of them: places where a card displayed `← Big Data` on a track that does not contain Big Data. The arrow pointed at nothing.

Reading all 115 edges against the rule split them cleanly:

**26 of the 102 courses had their `requires` rewritten: 27 edges removed, 16 put back pointing at what the course actually needs.** The graph went from 115 edges to 104.

| what it turned out to be | what happened |
| --- | --- |
| curriculum order in disguise | dropped from `requires`. Six tracks gained a `links` entry, where the earlier position would have taught the course out of order |
| content, but naming the wrong course | repointed — `pentest` needs the attacks course, not the SOC one; `soc-response` needs attacks, not hardening |
| content, and the track had a hole | the missing course went in: `linux-terminal` into Back-end, `networks` into Data, `sql-databases` into Architecture, `prompt-engineering` into Security |
| content, correct as written | untouched — the large majority |

The worst offenders were chains: `multimodal ← llm-observability ← agents-mcp ← rag` put 500h in front of a course about reading images, and `data-governance ← bigdata` put Spark in front of LGPD. Neither is knowledge the course needs.

**Nothing floated loose.** A node with no dependency inside its track falls back to the previous step — the graph already did that, and it is what made deleting an edge safe while adding a false one is not.

The levels moved in both directions, which is the sign the edges were wrong rather than merely inconvenient. Back-end went from 9 levels to 7 and BI from 7 to 6, because work that was genuinely parallel had been serialised. Software Architecture went from 9 to 12 and Data Engineering from 9 to 11, because a course whose false prerequisite sat early in the track had been floating up to meet it, and the fallback to the previous step is a stronger constraint than the lie it replaced. Eight of the eighteen tracks did not move at all.

Fifteen `prerequisites` sentences were rewritten in the same pass, in five languages: a sentence promising an API that is no longer required is the same lie in prose.

The `prerequisites` field is left for what the ids do not say: `'Basta um dos dois — SQL não exige programação.'`, `'Este curso ensina a linguagem do zero.'`, `'Nenhum. É o primeiro curso da escola.'` It used to be empty in 59 of the courses; all 105 carry one now, because a student who lands on a single course has only that sentence to tell them whether they can start there.

**Mind the order.** A course must not depend on another that comes *after* it in a track's `courses` list: that closes a cycle, the level computation does not terminate and the whole track stops rendering. That is what happened with the old `containers` (now split into `docker` and `kubernetes`), which depended on `testing-cicd` even though it came before it in three tracks.

When creating a course, **fill `requires` with real ids**. The validator walks the catalogue looking for a non-existent id, a cycle and an out-of-order dependency:

```
node tools/validate-catalog/validate-catalog.js
  → OK — sem dependências quebradas nem ciclos
  → OK — nenhuma dependência fora de ordem nas trilhas
```

The levels are computed by **iterative topological sort (Kahn)**, not by recursion — the recursive version had a depth ceiling and blew up on the long tracks. If a cycle survives anyway, the stuck nodes go in after the highest prerequisite already resolved and a warning goes to the console: the track comes out crooked, but it appears.

### Steps with a fork

Some decisions belong to the student, not to the school. The Back-end roadmap does not choose the server language — and the track should not either. For that, an item of `courses` can be a **choice object** instead of an id:

```js
cursos: [
  'web-fundamentals',
  'html-css',
  'git',
  {
    escolha: 'a linguagem do servidor',
    nota: 'Domine uma bem antes de saltar para outra.',   // optional
    opcoes: [
      { nome: 'JavaScript / Node.js', cursos: ['javascript', 'node'] },
      { nome: 'Python',               cursos: ['python', 'python-back'] },
      { nome: 'Java',                 cursos: ['java-back'] },
      { nome: 'Go',                   cursos: ['go-back'] },
    ],
  },
  'sql-databases',
  // ...from here on the path is the same
]
```

Each option can have **one or several courses** — the Python path needs the language before the framework; the Java one settles both in a single course. The first option is the suggested one by default.

On the site, the step appears as a dashed block with the options as tabs, each showing its workload. On switching, the flow is rebuilt on the spot, the step numbering redoes itself and the heading comes to show **that path's workload** plus the possible range — today, `760h neste caminho (690h a 760h)`.

What this changes in the rest of the code:

| Reading | Function | For what |
| --- | --- | --- |
| every possible course | `allCourses(t)` | the "em N trilhas" badge, statistics, search |
| the path visible right now | `trackPath(t)` | the flow, the number of steps, the workload |
| shortest and longest path | `hoursRange(t)` | the range in the heading |

**When creating a new track, use a fork when the roadmap does not choose for you.** Candidates already mapped: the scripting language in DevSecOps (Ruby, Python, Rust, Go, JS), Python or R in Business Intelligence, and the cloud provider (AWS, Azure, GCP) in DevOps.

### The two track families

roadmap.sh separates its roadmaps **by role** and **by skill**. They are different questions, and the site answers both with the `family` field:

```js
{ id: 'backend',    familia: 'carreira',   nome: 'Desenvolvimento Back-end', … }
{ id: 'python-tech', familia: 'tecnologia', nome: 'Python', … }
```

| | answers | outcome |
| --- | --- | --- |
| `career` | which profession do I want | a role — `Back-end Developer júnior` |
| `technology` | which tool do I want to master | the mastery — `Domínio de Python` |

On screen, a switcher above the picker changes the row of tabs. It is not decoration: 14 tabs do not fit in a single row, and the separation is the message itself — whoever does not yet know which career they want can come in via a technology.

**A technology track always has the same shape: a short trunk and a fan at the end.** The trunk teaches the technology in depth; the final fork opens up the applications, assembled from courses that already exist. A queue of three courses in a straight line would be worse than the old list and would contradict the section's promise. The fan is what a career track cannot say: one technology opens more than one door.

Unlike the Back-end fork, **here the paths do not come back together** — the step's `note` says so. It is the only place on the site where the choice is terminal, and it works because the finish node connects to the whole step.

**Which technology deserves a track.** roadmap.sh has ~45 skill roadmaps; becoming a track is the exception, not the rule. It has to pass three criteria:

1. **It already has 2+ courses in the catalogue** that fall into it — or they are worth producing.
2. **It opens more than one professional outcome** — otherwise the career track already covers it and the technology one is redundant.
3. **It has an audience on the internet.** The criterion was born geographic, when the target was one town; the school is 100% online and the criterion stopped being about maps.

Python and SQL pass all three and cost **zero new courses**. Go passes too, and cost 220h — see below.

### Dividing by capability, not by level: the Go case

Go went in after an assessment that first rejected it, for two errors worth recording so they are not repeated: the demand criterion was still local, and the reading that "Go's fan flows into back-end and nothing else" was wrong — roadmap.sh's own related roadmaps are Backend, **DevOps, Docker and Kubernetes**. Go is the language those three tools were written in. Its fan is services on one side and infrastructure tooling on the other.

What prompted the revision was an objective datum: `go-back` compressed the whole roadmap — syntax, pointers, interfaces, errors, modules, goroutines, HTTP, database, tests, cross-compilation — into **70h, less than `python` spends on the language alone (80h)**. It was the same error the proposal to split was trying to fix.

The natural division seems to be fundamentals / intermediate / advanced. **It is not**, for three reasons:

- **A level does not describe a capability.** Whoever finishes "Intermediate Go" cannot say what they can do. All the rest of the catalogue is named by capability.
- **It is duplicated information.** `level` is already a field and appears in each card's footer (`80h · intermediário`).
- **Three does not fit.** There are ~160 topics in the roadmap, some 280h — three courses would give ~95h each, larger than the largest course in the catalogue.

The division that stuck is by capability, and the beginner → advanced progression appears on its own:

| course | hours | what the student can now do |
| --- | --- | --- |
| `go` | 80h | write idiomatic Go — types, interfaces, generics, errors, modules |
| `go-concurrency` | 70h | thousands of tasks at once, with tests that prove it |
| `go-back` | 70h | serve HTTP and gRPC with a database behind — *reworked, without the language part* |
| `go-production` | 70h | operate Go: CLIs, pprof, cross-compilation and the advanced corners |

Concurrency got its own course on purpose: it is ~16 topics, it is the hardest part of the language and it is what distinguishes Go from anything else. Cramming it into the end of a syntax course was exactly the old `go-back`'s defect.

**That fixed the Back-end fork's asymmetry for free**: the Go option became `['go','go-concurrency','go-back']`, in the same format as `['python','python-back']`. The option became the longest in the step, and that laid bare that `java-back` was making the same mistake — 90h for the language, Spring, security, tests and deployment. That was the debt the Java case, just below, paid off.

**Go is the first technology track that costs new content: 220h.** Python and SQL cost zero. It is the catalogue's single largest addition — for comparison, the whole DevSecOps track cost 120h. Worth knowing that this is the price of a language track done properly, and that the same price will apply to Java, Rust or C# when their turn comes. Better treated as policy ("one deep track per major language") than case by case.

### The redundant fan: the Java case

Java does **not** become a track, and the interesting part is that it passes the criteria that rejected the others. Size: ~95 squares in the roadmap, more than Kubernetes's ~52. Audience: **52,672 people** following the roadmap, against Go's 8,698 — six times more. By the "a language with several outcomes" ruler, it looked like it was in.

What rejects it is a test that only appeared when there were three technology tracks to compare: **where the fan flows to.**

| track | branches | career tracks reached |
| --- | --- | --- |
| Python | server / data / AI | Back-end, Data Eng., BI, Architecture, Prompt, AI |
| Go | services / infrastructure | Back-end **and** DevOps, Networks, Security, DevSecOps, Support |
| SQL | analysis / engineering / administration | BI, Data Eng., DBA |

The four possible fans for Java were measured, and all of them fail:

- **Enterprise services** (`sql-databases`+`java-back`+`apis`) → Back-end. Identical to Go's and Python's branch.
- **Quality and testing** (`testing-cicd`) → a single course, already inside Back-end.
- **Data on the JVM** (`bigdata`) → depends on `pipelines-etl`, deep in the Data track. Unreachable.
- **Enterprise architecture** (`architecture-role` → `design-patterns` → `architecture-modeling` → `enterprise-software`) → 230h, balanced, and it flows into another track. It almost works — but it would be **the only branch in the catalogue without a course in the technology itself**. Go's infrastructure branch has `go-production`; Python's AI branch has `ai-models`. This one would have four courses that do not mention Java: it is not a second door into the technology, it is a career change glued to the end.

The roadmap agrees, and says so twice: at the top, *"intentionally skips some backend topics → Visit Backend Roadmap"*; in the footer, *"Visit Backend path and see what you missed"*. One outcome only. **A Java track would be the Back-end track without the front-end** — the student would gain nothing entering through it.

### The same test, applied to a cloud: the AWS and Google Cloud case

Two vendor technology tracks were built and then retired, in the same week, and the reason is worth recording because the mistake is the one this repository exists to avoid.

They shared **ten courses and 640h**. Only the four vendor courses differed. That is Alura's five back-end careers, reproduced here — and the shape said so before the count did: eight steps, fourteen courses, 890h each, larger than every career track but two, while `sql-tech` has three steps. A trunk repeated once per vendor is duplication whatever the family field says.

The vendor choice was never a track. It was a fork, and it now sits in the two careers where the choice actually propagates:

| track | the fork | what changes |
| --- | --- | --- |
| Cloud Engineering | the provider | three courses — foundations, compute, operations |
| Data Engineering | the cloud the data lives in | two courses — foundations and the data services |

Then the Java test was applied to what was left, and it fails the same way:

| track | branches | career tracks reached |
| --- | --- | --- |
| Python | server / data / AI | six |
| Go | services / infrastructure | six |
| SQL | analysis / engineering / administration | three |
| **AWS** | operations / data | **Cloud Engineering. That is all.** |

Criterion 2 is explicit — *it opens more than one professional outcome, otherwise the career track already covers it and the technology one is redundant*. Before Cloud Engineering existed the question did not arise, because the vendor track was standing in for a career that had not been written. Once it was written, the technology track had nothing left to say that the career did not say better, with a job title at the end.

**A postscript, from the other direction.** The DBA career came in afterwards, and it gave the SQL technology track a third branch — administration — for the price of listing two courses that already existed. Its fan now reaches BI, Data Engineering and Database Administration. The test cuts both ways: writing a career can retire a technology track, as it did for the two clouds, or it can be what finally justifies one.

**The rule that comes out of it**: a technology gets a track when its fan reaches more than one career. A cloud provider's fan reaches one, because operating it *is* the career. The three vendor course sets stay — they are 12 courses and 780h, reachable from two careers — and the tracks named after the vendors do not.

**The three courses came anyway**, because the debt was real and independent of the track:

| course | h | level |
| --- | --- | --- |
| `java` | 80h | beginner — the JVM, syntax, both boxes of OOP in full, collections, generics, exceptions, modules |
| `java-functional` | 70h | intermediate — lambdas, the Stream API, `Optional`, virtual threads, the memory model, the standard library |
| `java-back` | 70h | intermediate — *reworked*: Maven/Gradle, Spring Boot, persistence, security, logging, tests |

220h, **exactly Go's** — which is the right symmetry, because they are two server languages of equivalent weight. The option became `['java','java-functional','java-back']`. Cost: 150h of new content, since `java-back` already existed.

**What would unlock the track:** **Android/Kotlin**, where the JVM is *the* language and not one of the options. Then Java would gain a real second door and the track would come out almost free.

> In a first version of this note I had written that *a QA track* would also unlock it. **That was wrong**, and the error showed up when the QA track was actually designed: QA's natural fork is **by target, not by language** — the roadmap itself draws Backend Automation, Frontend Automation and Mobile Automation. The tools inside them are JavaScript (Cypress, Playwright, Jest, Webdriver.io) or polyglot (Selenium, Appium); only REST Assured and Karate are JVM. A "quality" branch in a Java track would have tooling courses, not Java courses — the same defect as the architecture branch.

### A tool does not become a track: the Docker case

Docker does **not** become a track, and the reason differs from what rejected Go on the first assessment: it fails criterion 2. Go has two sides — building services or building infrastructure tooling. Docker has no side at all: the continuations the roadmap itself offers are **Kubernetes and DevOps**, which are the same direction. Nobody is a "Docker developer"; it is a tool used inside another career, and the track would be a queue with no fork — the very shape the technology family exists to avoid.

The size confirms it: the Docker roadmap has **~37 squares**, against Go's ~160. It is one course's worth of content.

**But the question revealed a real defect.** The old `containers` — "Containers e Orquestração", 50h, 12 topics — covered *two* roadmaps, Docker and Kubernetes, with 8 topics for the first and 4 for the second. It was `go-back`'s defect on a smaller scale. It was split:

| course | hours | level | where it goes |
| --- | --- | --- | --- |
| `docker` | 50h | intermediate | Back-end, DevOps, Data Eng., DevSecOps and Go's infrastructure branch |
| `kubernetes` | 80h | advanced | DevOps and DevSecOps only |

**The split was not only by size — it was by who needs what.** Back-end and Data Engineering need to package the application; they do not need to operate a cluster. Before, they paid for orchestration embedded in a course they could not decline. Now Kubernetes sits where it is the subject: DevOps and DevSecOps.

Cost: 80h of new content. The DevOps and DevSecOps tracks gained 80h each; Back-end and Data kept the same workload as before, covering Docker with more than twice the depth (28 topics against 8).

**The Kubernetes course was later checked against its roadmap**, and the result corrected an underestimate: the roadmap has **~52 squares**, more than Docker's 37. Missing were the local cluster (minikube, kind, k3d), CSI, topology spread, priority and eviction, VPA and node scaling, in-cluster release patterns, a custom scheduler, extension APIs and all of cluster operation (control plane, worker nodes, multi-cluster). The course went from 26 to **48 topics** and from 60h to **80h**.

Three roadmap nodes touch courses that already exist, and the division of labour is deliberate: **the Kubernetes course teaches the mechanism inside the cluster; the others teach the practice around it.**

| roadmap node | here | gone into depth in |
| --- | --- | --- |
| CI/CD Integration, GitOps | an overview of ArgoCD and Flux | `gitops` (60h) |
| Logs, Metrics, Traces, Observability Engines | `kubectl logs`, events, `kubectl top`, metrics-server | `observability` (70h) |
| Canary, Blue-Green, Rolling Updates | as a cluster object: maxSurge, maxUnavailable, Ingress weight | `testing-cicd` (60h), at the pipeline level |

The order sustains the division: in DevOps, the three come **after** Kubernetes (indices 10, 11 and 12 against 7). In DevSecOps only `testing-cicd` exists, also afterwards — `gitops` and `observability` are not in that track, and that is why the overview inside the Kubernetes course has to stand on its own.

### A course's two levels of content

| Field | For whom | Where it appears |
| --- | --- | --- |
| `syllabus` | whoever is deciding whether to enrol | the course modal, always visible — 5 to 7 lines |
| `topics` | whoever wants to check topic by topic | the modal, inside the collapsed **"conteúdo detalhado"** block |

The syllabus **condenses**; the topics **list**. It is `topics` that carries the roadmap's fine items — the little beige squares hanging under each yellow topic (`ARP`, `VRRP`, `802.1X`, `throughput`, `Top-P`, `SCD`...) — without turning the modal into a wall of technical terms. The field is optional: a course with no `topics` does not show the block. The catalogue's search looks in both.

**All 105 courses have `topics` filled in — 1,968 topics in the catalogue.** When creating a new course, fill in both fields: without `topics` it looks visibly poorer than its neighbours.

### The language of the names

- **Course**: the concept in Portuguese (`Infraestrutura como Código`), a technology's proper name intact (`JavaScript`, `Node.js`, `GitOps`, `Python`).
- **Track**: the name in Portuguese (`Desenvolvimento Front-end`), and the role in English — as the market advertises the vacancy — in the `outcome` field (`Front-end Developer júnior`).

### The intermediate unit: the decision left to Stage 2

**Between "one course" and "the whole track" there is nothing, and the career tracks are long:**

| track | courses | hours |
| --- | --- | --- |
| Engenharia de Dados | 17 | 1,040h |
| DevSecOps | 16 | 970h |
| Segurança Cibernética | 15 | 970h |
| Business Intelligence | 14 | 900h |

Eight of the thirteen pass 720h. That is a lot of time with no milestone of arrival — and it is exactly the hole Alura fills with the extra level it has.

**Alura stacks; here the families sit side by side.** There it goes `Career ⊃ Track ⊃ Course`: the Track is a slice by subject *inside* a Career, and it is what the certificate attaches to. Here, `career` and `technology` are two species at the same level, and below them there is only the course.

The difference is not cosmetic. A hierarchy forces each course to have a single parent, and this catalogue does not fit that: **47 of the 105 courses are in two or more tracks** — `web-fundamentals` is in 13, `linux-terminal` in 12, `sql-databases` and `networks` in 9. That is 236 slots for 105 distinct courses, a reuse factor of 2.25×. In a tree that becomes duplication; it is the graph that sustains the promise that nobody studies the same thing twice.

In other words: the split by family solves **where to come in**; Alura's Track solves **how to know you have advanced**. They are orthogonal problems, and only the first one is solved here.

**Why not now.** The change is additive — a new field in `TRACKS` does not invalidate the `courses` that already exists, nothing migrates and no link dies. The cost only jumps at the **first certificate issued to a real student**, because from then on changing the unit of certification becomes a reissue or an exception. That deadline belongs to the LMS, not to the showcase.

**The trap is the same as the Go case's.** The obvious axis for cutting a track into blocks is fundamentals / intermediate / advanced — and it was already rejected one floor below, when Go was divided: a level does not describe a capability, `level` is already a field, and whoever finishes the "intermediate" block cannot say what they can do. Blocking by level would repeat the error under another name.

**What is left to decide, in order:**

1. **The axis.** If it is not level, what is it? The candidate consistent with the rest of the catalogue is *capability* — each block delivers something the student can now do, like the four Go courses. The more ambitious candidate is *a partial employable outcome*: the block ends where you can already work at something.
2. **The name.** "Trilha" is already used up one level above and "etapa" already names the graph's columns. That leaves *módulo* and *bloco*.
3. **The certificate's anchor.** The topology here creates a question Alura's does not have: the technology tracks end in a **fan with a terminal choice**, where the paths do not come back together. Certifying "Domínio de Python" certifies which branch — all of them, or the chosen one?
4. **The translation cost.** A block name is a translatable string. Thirteen tracks with three or four blocks each is ~45 new names × 4 languages.

**The benefit that would already exist today** — 1,040h on a single screen is intimidating on a showcase whose job is to convert an enrolment — is a *presentation* problem, and does not require inventing the unit of certification to be solved.

## Expansion map

The roadmaps that appear **in blue** inside roadmap.sh's roadmaps are whole other roadmaps. Not all of them become a track — the classification that guides the catalogue's growth:

| Type | Roadmaps | Becomes |
| --- | --- | --- |
| Tool / skill | Docker, Kubernetes, TypeScript, MCP | a shared **course** (e.g. `docker` serves five tracks today) |
| Cross-cutting discipline | System Design, Design & Architecture, API Security | a shared **advanced course** |
| Entry career | DevOps, Network Engineer, AI Engineer, QA Engineer | its own **track** |
| Senior career | Software Architect, Engineering Manager | a **continuation track**, with another track as a prerequisite |
| Specialisation | Prompt Engineering, AI Red Teaming, Vibe Coding | a **short track** or a course, depending on the volume |
| A roadmap with two audiences | Cyber Security | **two tracks**, one serving as the base for the other |
| The intersection of two careers | DevSecOps | its own **track**, if it brings a course neither of the two has |
| The same subject for another audience | BI Analyst | its own **track**, with a path that does not go through programming |
| A language with several outcomes | Python, SQL, Go, JavaScript | a **`technology`-family track** — a short trunk and a fan of applications |
| A language with a single outcome | Java | **courses** inside the career track that uses it — the fan would be redundant |
| A tool with a single outcome | Docker, Kubernetes, Terraform, Spring Boot | a shared **course** — the fan does not exist, and a track would be padding |

### The same subject for another audience: the BI Analyst case

BI and Data Engineering deal with the same data, but for different people: the engineer builds the plumbing, the analyst answers the director's question. The BI track **does not go through programming** in its first 260h — it starts at essential computing, business, Excel and statistics, and only meets Python at the ninth step.

It is the most sellable track for the real audience of a small-town school: an accountant, a shop manager, a production supervisor. None of them is going to do Data Engineering.

**It also fixed a gap that had slipped under the radar across nine tracks:** there was **no statistics course** in the catalogue. The Data Engineering track went from Python straight to dimensional modelling without ever teaching a mean, a standard deviation, a p-value or a regression. `statistics` (80h) went into both.

### The second door without programming: the QA Engineer case

By size, QA is an ordinary track: ~120 squares in the roadmap, 22,366 followers, 720h. **What makes it strategic is the same thing that made BI:** the first **330h do not require programming.** The roadmap puts fundamentals, black/grey/white box approaches, lifecycle models, methodologies, manual testing and functional techniques **before** any automation — JavaScript only appears in the eighth course.

BI and QA serve different audiences arriving through the same door: BI serves whoever likes analysing numbers, QA serves whoever likes breaking things. They are today the catalogue's only two entrances for someone changing career who does not yet program.

It cost **310h of new content across five courses** — the most expensive addition so far, above Go's 220h. It is worth it because it is the only recent addition that **opens a new door** instead of deepening an existing one; Go, Java, Docker and Kubernetes all deepened paths that already existed.

It reuses 410h: `web-fundamentals`, `git`, `sql-databases`, `html-css`, `javascript`, `security-fundamentals` and `testing-cicd`. And it took `web-fundamentals` to **nine tracks** — it is the catalogue's most shared course.

**A graph detail it exposed:** `security-fundamentals` and `testing-cicd` are the closing of the QA curriculum, but their content prerequisites are at the start of the track (`web-fundamentals` and `apis`, the latter not even present). The graph threw them to level 03, beside JavaScript. It was the classic case for **`links`** — curriculum order rather than content dependency — and with it the two went back to level 06, before the finish.

### An intersection is not a combo: the DevSecOps case

DevSecOps sits between DevOps and Security, and **87% of the track already existed**. By the Full Stack ruler, that raises the right suspicion — but it passes, and the difference is objective: it brings **three courses neither of the two tracks had** (Secure Coding, Threat and Risk Modelling, Pipeline and Supply Chain Security) and an order of its own. Full Stack brought zero.

**The test, therefore, is not "how much repeats", it is "does it bring content and an order that do not exist?".** DevSecOps brings 120h that are exclusive and delivers 890h.

`secure-code` also went into the Cyber Security track, which had nothing on application security — the gap only became visible when this roadmap was mapped.

### One roadmap can become more than one track: the Cyber Security case

The Cyber Security roadmap has only **6 yellow nodes**, but around **300 items** hanging off them — it is by far the largest. A single track would pass 1,300h and would mix two audiences that never meet: whoever wants to work on a help desk and whoever wants to be a pentester.

It was split where the roadmap itself already separates:

| Roadmap blocks | Became |
| --- | --- |
| Fundamental IT Skills · Operating Systems · networking base | **Fundamentos de TI e Suporte** (7 courses, 400h) |
| Security Skills and Knowledge · Cloud Skills · Programming Skills | **Segurança Cibernética** (15 courses, 970h) |

The first is the school's entrance — it requires nothing and ends at Support Technician. The second uses the first as its base. **Rule:** when a roadmap contains two audiences with different outcomes, it becomes two tracks, not one giant track.

`computing-essentials`, the first course of the IT track, is the **"Informática Essencial"** that had been pending since the start of the project: hardware, Office, personal cloud and home networking. It came out of this roadmap's *Fundamental IT Skills* block.

### A continuation track: the Software Architect case

Software Architecture is the catalogue's first track that is **not an entrance**. There is no junior architect: the roadmap asks for Back-end, Full Stack or System Design first, and the track declares that in its `goal` and in the first course's `prerequisites` field. The real journey is **760h of Back-end + 740h of Architecture**.

That changes what the school sells: instead of only training beginners, it accompanies a career — the student of 2027 comes back in 2030. It is worth opening other tracks like this (Engineering Manager, Staff Engineer) keeping the rule: **a senior track always declares the preceding track**.

**Full Stack is left out, by decision.** It is exactly the sum of Front-end and Back-end: it brings no new course, no new order and no outcome the two tracks do not already deliver. Whoever wants everything does both — and the catalogue does not gain a track that only repeats the others.

The ruler, refined after the Prompt/AI case: **combining complete tracks does not justify a new track; slicing the start of a track for an audience that would never do the rest, does.** Prompt Engineering is today a subset of AI Engineering and goes on existing for that reason — it tells whoever does not program "stop here, this is already enough for you", which Full Stack would say to nobody.

**Courses shared today** (they show the "em N trilhas" badge):

| Course | No. of tracks |
| --- | --- |
| `web-fundamentals` | 9 |
| `git` · `python` · `linux-terminal` | 7 |
| `networks` · `cloud` | 6 |
| `testing-cicd` | 5 |
| `javascript` · `sql-databases` · `docker` · `observability` | 4 |
| `html-css` · `ai-dev` · `iac` · `warehouse-modeling` · `ai-security` · `security-fundamentals` | 3 |
| `servers-cache` · `kubernetes` · `statistics` · `pipelines-etl` · `data-governance` · `analytics-bi` · `networks-security` · `prompt-engineering` · `prompt-reliability` · `computing-essentials` · `operating-systems` · `cryptography` · `attacks-threats` · `secure-code` · `soc-response` · `cloud-security` | 2 |

**The model's economics**: added up, the thirteen career tracks deliver up to 9,610 hours of training — but the content to produce is 5,310 hours, because the shared courses are made only once. **45% savings**, and it grows with every new track.

The number is computed **only over the `career` family** — both the delivered workload and the "exclusive to it" column below. The technology tracks are 100% reuse by construction: including them would push the savings up without the school having produced a single hour, and the indicator would stop measuring what matters. That is why the table below did not move when Python and SQL went in; the Back-end line changed for another reason — the Go option gained two courses, which are exclusive to it and dropped the reuse from 37% to 25%.

How that appears in practice, track by track (exclusive hours = content only it uses):

| Track | Workload | Exclusive to it | Reused |
| --- | --- | --- | --- |
| Desenvolvimento Front-end | 590h | 320h | 46% |
| Desenvolvimento Back-end | 760-840h | 760h | 10% |
| DevOps e SRE | 780h | 60h | 92% |
| Engenharia de Dados | 1,040h | 170h | 84% |
| Redes e Infraestrutura | 730h | 210h | 71% |
| Engenharia de Prompt | 200h | 0h | 100% |
| Engenharia de IA | 730h | 370h | 49% |
| Arquitetura de Software | 740h | 340h | 54% |
| Fundamentos de TI e Suporte | 400h | 100h | 75% |
| Segurança Cibernética | 970h | 150h | 85% |
| DevSecOps | 970h | 120h | 88% |
| Business Intelligence | 900h | 350h | 61% |
| Qualidade e Testes de Software | 720h | 310h | 57% |

**DevOps e SRE costs 60 hours of new content** and delivers 780 — it is the model's extreme case. And **Engenharia de Prompt costs zero**: it is entirely a slice of Engenharia de IA.

Note the cross effect: when DevSecOps went in, Segurança Cibernética's exclusive hours fell from 450h to 150h; when BI went in, Engenharia de Dados fell from 360h to 170h. It is not that they lost content — they started sharing it. **Every new track makes the old ones cheaper.**

The Go and Java cases go in the opposite direction and show the other side of the arithmetic: `go`, `go-concurrency`, `java` and `java-functional` only appear in Back-end within the career family, so its exclusive hours rose from 480h to **760h** and the reuse fell from 37% to 10%. Back-end became the catalogue's most expensive track — and that is fair, because it is the one bankrolling four server languages. A language course is expensive precisely because it does **not** get shared.

That is why Docker was born as its own course instead of becoming a block inside another: today `docker` serves five tracks.

## A course's modal

On screens of **1024px and up** the modal opens in **two columns**: on the left what convinces — what the course is, the introduction video and the enrolment button —, on the right what details it — syllabus, detailed content, prerequisites and tracks. Below that it goes back to one column, and the HTML order is already the right reading order. The breakpoint is where each column still gets ~440px: any narrower than that and two columns read worse than one. Above 1500px the box stops growing — on a 4K screen the modal took up half the width in blank on one side and lines that were too long on the other.

A course with 48 topics open made the whole modal scroll, and the left column — the video and the enrolment button — went up out of view with it. On large screens **the modal's body does not scroll**: what scrolls is the topic list, inside itself.

The list's ceiling is **measured in JavaScript**, not fixed in CSS. A fixed ceiling does not solve it: at 420px the list stopped, but the whole column (syllabus + topics + prerequisites + tracks) still overflowed and the modal went back to scrolling. `fitTopics()` measures how much the column overflows and takes that much off the list — the only block that can shrink without losing information, because it scrolls. A 140px floor; below that the column scrolls, as a safety net.

It was meant to be pure CSS (`flex:1 1 auto` on the list inside a `<details>` in `display:flex`), and it does not work: Chrome wraps the `<details>` content in a slot, so the `ul` does **not** become a flex item. The computed style accepts the rule and the layout ignores it — the list ended up 1387px inside a 246px block and spilled over the rest. Measuring is what showed that; looking at the CSS there was no way to know.

On mobile none of this applies: there, a single screen scroll is more natural than a box scrolling inside another.

**With the modal open, the background does not scroll.** Trapping only the wheel and touch in JavaScript was not enough — the handlers had a bare `return` before the `preventDefault()`, and the browser's scrollbar and the trackpad's inertia were still left over. It is two halves: a class on `<html>` cuts the overflow of the document and of the screen (handling the scrollbar and the inertia) and the handlers let through only what has its own scrolling **inside** the modal (handling the chaining). The page's position stays exactly where it was, because nothing is repositioned.

**The video is a facade, not an iframe.** The frame shows the YouTube thumbnail and a button; only after a click does the player come in. That way the modal opens light and whoever does not watch receives no YouTube cookie at all. A course with no `video` filled in shows the reserved frame with "vídeo em breve" — the space is already held, so publishing the videos one at a time does not rearrange anyone's screen.

## The hero terminal

Four commands, and **not one hand-written response**: the numbers, the track names and the course card all come out of `COURSES` and `TRACKS`, in `buildTerminal()`. A new track comes in and it counts right by itself; no line can contradict the rest of the page, because it reads the same source.

```
$ codeschool --status
✓ 105 cursos · 18 trilhas · 6.640 horas de conteúdo

$ codeschool tracks --career
→ Desenvolvimento Front-end · 590h
→ Desenvolvimento Back-end · 760–840h
→ DevOps e SRE · 780h
  … e mais 11 trilhas de carreira

$ codeschool course kubernetes --info
→ Kubernetes: Orquestração em Produção · 80h · avançado
↳ precisa antes: Docker e Containers

$ codeschool start▊
```

The Back-end track shows `760–840h` because it has a fork: the range comes from `hoursRange()`, the same computation the tracks screen uses. The course in the third response is fixed (`SHOWCASE_COURSE`) and chosen for being advanced **and** having a prerequisite — that way the card shows both. If the id disappears from the catalogue, it falls back to the first course with `requires` filled in.

**The animation delay is computed, not written by position.** It used to be six `nth-child` rules with each line's delay; the terminal has thirteen now, and everything past the sixth appeared at once. `buildTerminal()` writes the position into `--i` and the CSS does `calc(.2s + var(--i) * .16s)` — the staggering comes to apply to however many lines there are.

The terminal **only appears above 1180px**, along with the menu on show. Below that the text column takes the full width.

## The way in is the portal

**There is no enrolment form, and that is the model, not a gap.** The school is
self-service: whoever wants in creates their own account at
`app.codeschool.ing`, picks a track, studies, sits the exams and issues their own
certificate. Changing an e-mail, a password or a name, exporting everything and
deleting the account are all in the portal's account screen. Nobody is contacted,
and nobody waits to be.

So every "start now" on this page is an **anchor to the portal**, not a dialog:
the navigation button, the three plan cards' buttons, and the button inside a
course modal. There used to be a signup modal here — two fields and a plan
selector, submitted to a form provider — and it is gone along with `ENROL_URL`,
the phone mask and the plan selector that fed it. It collected a contact so that
somebody could get back in touch, and there is nobody to get back in touch.

**The `#contact` section stayed, because the anchor is published**, but it says
what is true: everything is self-service, here is the portal, and here is one
address for what genuinely needs a person. That address promises no reply time
and no opening hours, because there are none — an earlier version of this page
offered "write to us and we will reply", which was inventing a service that does
not exist.

**The e-mail is a line, not a card, on purpose.** Making it prominent invites
people to write instead of doing the thing themselves, which is slower for them
and for a school with no counter. It is still the address the privacy policy
points at for a data request under the LGPD — which is the one kind of message
that genuinely needs a person, and the reason the channel exists at all.

## Deliberately left out

- **Collaboration tools** (Slack, Trello, Atlassian) appear in the Software Architect roadmap, but they do not sustain a course or a step — they come in as everyday use inside `process-management`.
- **Big Data in the Architecture track**: the roadmap cites Hadoop, Spark and MapReduce. The architect needs the overview, which `warehouse-modeling` gives; `bigdata`'s 70h stayed only in the Data track so as not to inflate the track with content they will not operate.
- **Certifications** (PMI, ITIL, Prince2, Scrum, CompTIA, OSCP, CISSP…) are presented as an overview in `process-management`, `tech-support` and `pentest`; the school does not prepare anyone for a certifier's exam.
- **A red team track separate from the blue team one**: the Cyber Security roadmap does not separate them, and dividing now would create two 400h tracks with half the content repeated. `pentest` (offensive) and `soc-response` (defensive) coexist in the same track, each with 70-80h. If demand justifies it, the split can be done later without redoing a single course.
- **A technology track for every skill roadmap**: there are ~45 on roadmap.sh. Only those that pass the three criteria above go in; the rest go on being a course inside a career track, which is where they already were.
- **Standalone courses, outside any track**: the catalogue is good for finding a course you already know you want, but a course with no track loses the "em N trilhas" badge, loses the "faz parte de" block in the modal and becomes a dead end in the navigation. Today there are **zero standalone courses**, and it is worth keeping it that way — it was the alternative discarded when the technology tracks were designed.
- **`ai-security` went into the Cyber Security track** even though it is not in the Cyber Security roadmap: application security with LLMs is the subject a 2026 analyst will run into, and the course already existed. It is the only deliberate deviation from the roadmap in that track.

## What still needs filling in

- Real testimonials (with the students' permission) — remembering that there are **five** places: `catalog.js` for the English and `i18n.js`/`i18n-pt.js` for pt, es, fr and it. The quotes themselves now read as finished copy; what is still missing is the **byline**, and that is the half that cannot be written by anyone but a student
- Introduction videos: the YouTube id in each course's `video` field, in `catalog.js`
- **The price is decided but nothing is charged**: R$ 490 a year, in 12 instalments, and no payment provider exists yet. The monthly option was dropped — see the "Plans" section below. The currency is also still an open question, since the site speaks five languages and the audience is not only Brazilian.
- A real e-mail address (today `contact@codeschool.ing`)
- **One FAQ answer still carries a marker**: the payment methods, which cannot be stated until a provider is chosen. The other three — cancellation, standalone sales and companies — now describe the decided model and are no longer samples.
- The example testimonials sign off with "class of [year]", the vocabulary of enrolling in a cohort. When the real accounts come in, each one's sign-off has to match the enrolment model.
- Real social media profiles: the footer's five links point at `codeschool.ing`/`codeschool-ing` handles that still need to exist
- A review of the syllabuses and workloads against the courses the school actually offers

## Plans

The `#planos` section replaced the old "Como funciona" — the four steps ("choose your track", "study when you can"…) described a method the whole page already demonstrates, and the space is worth more showing what costs what.

**The three cards are the three plans the portal grants**, and keeping them that way is the point: the cards used to advertise a set of names `plans.js` did not know, so somebody could subscribe to one here, sign in, and find a plan by another name including other things. The names, straplines, benefit lines and numbers are `plans.js`'s, line for line, and the benefit lines are literally its `FEATURES` sentences — which is why they read as capabilities rather than marketing.

**The model the two cards describe.** The first course of every track is free
forever, and everything else is one subscription bought for a year:

| card | id in `plans.js` | price | grants |
| --- | --- | --- | --- |
| Guest | `guest` | R$ 0 forever | the entry course of each track, exercises, the map |
| Student | `student` | R$ 490/year, in 12 instalments | the whole school |

**There is no monthly option, and that is the decision rather than an omission.**
A track's median is twelve courses and about 720 hours — over a year of study —
so monthly billing creates fourteen separate chances to cancel something
unfinished. A yearly commitment matches the length of what is being bought, and
the instalments are what keep the ticket from being the barrier: the student pays
month by month, the school is committed to for a year. The instalment line sits
under the price for exactly that reason, and hiding it is what would make R$ 490
look like a wall.

**Free is an entry course rather than a trial period** because a track's median is twelve courses and about 720 hours. Seven days measures nothing against fourteen months; one finished course does, and it leaves the student looking at the map with the rest of the track ahead — which is where this page's argument and the product's actually meet.

**The ids are the names, and getting there cost a migration.** `guest` and `student` are what `subscriptions.plan_id` stores in portal-backend, matching what the cards say. The trap they were dug out of: `student` used to be the id of the FREE plan, so once the paid card took that name, any id left alone would have meant the opposite of what a reader expects. Migration 0013 over there moves the rows; `app/state.js` moves the ids kept in a browser, once and only once — that rename swaps two values, so a second pass would read the `student` it just wrote and demote a paying account.

**The prices are decided and nothing is charged**, because there is no payment provider. The footer says so. `R$ 0` forever on the free plan is not decoration but a description — a new account is given `PLANS[0]`, so a paid entry plan would mean every student silently holding a subscription nobody charged for.

Swapping the three for another structure means editing `index.html`, the corresponding keys in the four dictionaries, **and `plans.js` in the portal**. All three, or they are back to describing different products.

**The plan buttons link straight to the portal**, like every other "start now" on the page — see "The way in is the portal" above.

## FAQ

It took over the screen the enrolment form used to occupy. There are eight questions: the four that already existed beside the form and four the subscription brought — cancellation, payment methods, standalone sales and contracting by a company.

**One question open at a time.** The `toggle` listener sits on the container and on the capture phase — `toggle` does not bubble — so it also covers questions added later, without one listener per `<details>`.

At **861px and up** the questions sit in two columns. Eight accordions in a single column turned into a narrow ribbon in the middle of a wide screen. It is `grid`, not `columns`: CSS multi-column splits an open `<details>` down the middle.

**Three of the four now describe decided policy**, and are no longer samples:

- *cancellation* — done on your own account screen, access to the end of the paid period, and **certificates already earned stay valid forever**, because they record something that happened and revoking them for non-payment would break every validation code's credibility;
- *standalone sales* — no, and the answer says why rather than just refusing: what is sold is the track, and a course bought alone loses the order that makes it a track;
- *companies* — not yet, each person subscribes their own account, and a team plan waits for a company to ask.

**Only payment methods keeps a marker**, because a provider has not been chosen and a payment method written on a showcase is a commitment somebody will hold you to.

The answer about live classes is not a sample either, and it is the one worth reading twice: it says there are **no** live sessions. Whatever a FAQ answer promises, somebody has to deliver, and here the only thing that delivers is the software.

## Contact

**The section leads with the portal**, because that is where the answer to almost everything is: account, track, exams, certificate, and the whole of the LGPD self-service — export and deletion included.

**One human channel is left**, and it is a line rather than a card: `contact@codeschool.ing`, for what genuinely cannot be resolved alone. It promises no reply time and no opening hours. WhatsApp and "seg–sex · 8h às 18h" went long ago — a phone number and business hours are a promise of synchronous support, and the school has no counter. The heading that said "prefere falar com a gente?" and the line "escreva e a gente responde" went with them, for the same reason: they described a service nobody staffs.

The newsletter keeps its half of the row (`.contact-row`), and on mobile they stack.

## Publishing on GitHub Pages

The destination is `codeschool-ing/codeschool-ing.github.io`, which is the organisation's Pages: the content goes in the repository's **root**, not in `escola/`. For the custom domain, a `CNAME` file at the root with one line, `codeschool.ing`, and DNS pointing at GitHub — `A` records for the four Pages addresses, or `ALIAS`/`ANAME` to `codeschool-ing.github.io`.

There is no build: it is copying `index.html` and `assets/` and committing. The `showcase.html` from `tools/bundle/bundle.py` is for sending by e-mail or opening from disk, not for publishing — on Pages the separate files are better, because the browser caches each one.
