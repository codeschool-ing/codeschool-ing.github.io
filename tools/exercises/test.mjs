#!/usr/bin/env node
/* Tests for everything that needs no API: mechanical checks, rewrite guards, the verdict.
 *
 *   node test.mjs
 *
 * What this file protects is the calibration. Every mechanical check was born from a real
 * defect and was tuned until it flagged none of the 48 hand-reviewed exercises — and that
 * tuning was redone by hand every round, in a script thrown away afterwards. Here it stays:
 * the 48 are the permanent corpus, and each rule also keeps the case that motivated it, so
 * that loosening one by accident breaks a test instead of slipping through.
 *
 * Cheap to run, so run it before anything that costs money.
 *
 * The fixtures below are in Brazilian Portuguese because the mechanical layer analyses
 * Portuguese text — a translated fixture would exercise nothing.
 */
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { check, pairEcho, formTells } from './lib/types.mjs';
import { accept, report as defectReport } from './lib/rewrite.mjs';
import { compare } from './lib/history.mjs';
import { courseContext } from './lib/catalog.mjs';
import { funnel } from './lib/funnel.mjs';
import { buildOptions, howManyTrue } from './lib/blind.mjs';
import { build } from './lib/prompts.mjs';
import { measureReach } from './lib/corpus.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
let failures = 0;
let counted = 0;

function ok(condition, name, detail = '') {
  counted++;
  if (condition) return;
  failures++;
  console.log(`  FAILED  ${name}${detail ? '\n          ' + detail : ''}`);
}

async function group(name, fn) {
  console.log(name);
  await fn();
}

const alt = (text, correct) => ({ text, correct, why: 'explicação' });
const question = (extra) => ({
  type: 'quiz',
  topic: 'um tópico',
  difficulty: 'medium',
  statement: 'Um enunciado qualquer sobre a ferramenta.',
  socratic_hint: 'Uma dica que não aponta para lugar nenhum.',
  ...extra,
});

/* ---- 1. calibration: the 48 hand-reviewed ones must flag nothing ---------- */

await group('corpus — the 48 hand-reviewed exercises', () => {
  const d = JSON.parse(fs.readFileSync(path.join(HERE, 'exercises-python.json'), 'utf8'));
  ok(d.exercises.length === 48, 'the corpus has 48 exercises', `it has ${d.exercises.length}`);

  /* THE CORPUS HAS TO BE IN THE SOURCE LANGUAGE, and this check exists because the alternative
     is silence. The mechanical layer's vocabulary is English; run it over Portuguese text and
     every check returns clean, the 48 "pass", and the suite reports a calibrated layer that is
     in fact switched off. An assertion that can only be satisfied by absence guards nothing —
     so this one asserts presence: the corpus must read as English.

     It fails while the corpus is still being translated. That is the point: an unfinished
     translation should break the build, not quietly pass it. */
  const PT_ONLY = /\b(que|não|para|uma|com|dos|das|você|quando|onde|mais|sem|pelo|pela|então|porque|cada|ser|seu|sua)\b/i;
  const portuguese = d.exercises.filter((e) => PT_ONLY.test(`${e.statement} ${e.socratic_hint}`));
  ok(portuguese.length === 0,
    'the corpus is in the source language, so the mechanical checks actually analyse it',
    `${portuguese.length} of ${d.exercises.length} exercises still read as Portuguese — until they are `
    + 'translated the checks below pass vacuously');

  for (const [i, e] of d.exercises.entries()) {
    const p = check(e, { options: d.options ?? 5 });
    ok(p.length === 0, `#${i + 1} (${e.type}) passes the mechanical check`, p.join('; '));
  }
});

/* ---- 2. each check still catches the defect that created it -------------- */

await group('the form tells still fire on the cases that motivated them', () => {
  const catches = (name, e, fragment) => {
    const p = formTells(e);
    ok(p.some((x) => x.includes(fragment)), name, p.length ? p.join('; ') : 'flagged nothing');
  };

  catches('correct one much longer than every wrong one', question({
    options: [
      alt('Uma explicação longa e cuidadosa que cobre o mecanismo inteiro com todos os detalhes que importam.', true),
      alt('Curta.', false), alt('Também curta.', false), alt('Curta igual.', false), alt('Curtíssima.', false)],
  }), 'longer');

  catches('an absolute in the wrong ones only', question({
    options: [
      alt('O valor é recalculado a cada chamada da função.', true),
      alt('O valor nunca muda depois da primeira chamada.', false),
      alt('O valor sempre acompanha a variável original.', false),
      alt('Isso é impossível de acontecer em Python.', false),
      alt('Qualquer chamada produz o mesmo objeto.', false)],
  }), 'absolute');

  catches('wrong ones all with the same opening formula', question({
    options: [
      alt('A função devolve o valor acumulado até ali.', true),
      alt('Serve para evitar que o laço rode duas vezes.', false),
      alt('Serve para converter o tipo antes da soma.', false),
      alt('Serve para limpar a memória entre as chamadas.', false),
      alt('Serve para registrar o resultado no console.', false)],
  }), 'all open with');

  catches('technical identifier from the statement in one option only', question({
    statement: 'A instalação com back-end WSL2 falhou no meio do processo. O que explica?',
    options: [
      alt('O recurso de virtualização exigido pelo WSL2 está desligado na BIOS da máquina.', true),
      alt('O disco não tinha espaço suficiente para a imagem base.', false),
      alt('A conta usada não tinha permissão de escrita na pasta de destino.', false),
      alt('O antivírus bloqueou a gravação do executável.', false),
      alt('A rede caiu durante o download do pacote.', false)],
  }), 'technical term');

  // Real case from the Docker round of 18: the correct one was "the only one protecting itself
  // with an adverb of uncertainty". The hedge test did not catch it — it demands two correct ones.
  catches('adverb of uncertainty in one option only, the correct one', question({
    options: [
      alt('As imagens continuam válidas, e os roteiros provavelmente precisam ser reescritos.', true),
      alt('Os comandos continuam válidos, bastando que a ferramenta seja certificada.', false),
      alt('Tudo continua igual, imagens e comandos.', false),
      alt('Não é preciso mudar nada nos roteiros existentes.', false),
      alt('Os comandos passam por conversão automática na primeira execução.', false)],
  }), 'adverb of uncertainty');

  // Real case: marking the cautious ones and discarding the categorical ones gave the exact set.
  catches('the exam heuristic produces the exact key', question({
    type: 'multiple-choice',
    options: [
      alt('As operações sobre arquivos montados de fora costumam ficar mais lentas.', true),
      alt('A memória disponível em geral fica limitada ao que foi atribuído à máquina.', true),
      alt('Imagens de Linux não são executadas nesse arranjo.', false),
      alt('Os processos recebem o nome da imagem no gerenciador de tarefas.', false),
      alt('Containers de Windows sobem no mesmo modo de operação.', false)],
  }), 'hedged options');

  // Real case: "conte quantos kernel de sistema operacional estão carregados", with a single
  // option mentioning the kernel.
  catches('a bundle of hint words in one option only', question({
    socratic_hint: 'Conte quantos kernel de sistema operacional estão carregados em memória em cada cenário.',
    options: [
      alt('Cada máquina virtual carrega um kernel de sistema operacional próprio, e os containers compartilham o kernel já carregado.', true),
      alt('As imagens passam por uma etapa de compressão antes de subir.', false),
      alt('O hipervisor duplica as páginas de memória entre os hóspedes.', false),
      alt('O disco virtual precisa ser formatado a cada inicialização.', false),
      alt('A rede virtual exige uma negociação inicial demorada.', false)],
  }), 'hint words');

  // Real case: "the three correct ones are statements of possibility and the two wrong ones of
  // obligation". Neither is an absolute in the sense of the earlier test.
  catches('the modal axis separates correct from wrong', question({
    type: 'multiple-choice',
    statement: 'Sobre a conformidade com a especificação.',
    options: [
      alt('Uma imagem conforme pode ser baixada e executada por qualquer runtime que siga a mesma especificação.', true),
      alt('Duas ferramentas podem ter subcomandos bem diferentes e ainda assim produzir o mesmo artefato.', true),
      alt('Um registro conforme atende clientes de projetos diferentes, e nada impede a troca.', true),
      alt('A norma faz uma imagem de outra arquitetura rodar sem camada de emulação.', false),
      alt('A norma obriga as implementações a usar o mesmo serviço e o mesmo diretório.', false)],
  }), 'obligatory or guaranteed');

  // The syntactic mould used to demand 3 wrong ones; two opening with the same formula, in a
  // set of five, is just as revealing — and that was the case the critic caught.
  catches('syntactic mould with only two wrong ones', question({
    type: 'multiple-choice',
    options: [
      alt('Uma imagem conforme roda em qualquer runtime que siga a especificação publicada.', true),
      alt('Ferramentas distintas produzem artefatos intercambiáveis entre si.', true),
      alt('Um registro conforme atende clientes de projetos diferentes sem adaptação.', true),
      alt('A conformidade estende o alcance para arquiteturas que o processador não executa.', false),
      alt('A conformidade determina o mesmo diretório de trabalho em toda implementação.', false)],
  }), 'all open with');

  catches('the hint that counts how many options are wrong', question({
    type: 'multiple-choice',
    socratic_hint: 'Duas das afirmações são falsas: procure as que confundem imagem com container.',
    options: [
      alt('A imagem é o artefato parado em disco.', true), alt('O container é a imagem em execução.', true),
      alt('A imagem muda de conteúdo enquanto executa.', false), alt('O container existe antes da imagem.', false),
      alt('Os dois nomes designam a mesma coisa.', false)],
  }), 'how many options');
});

/* ---- 3. and they must not fire on ordinary prose ------------------------- */

await group('the form tells do not fire on ordinary prose', () => {
  const clean = (name, e) => {
    const p = formTells(e);
    ok(p.length === 0, name, p.join('; '));
  };

  // "enquanto" is a caveat in one sentence and a contrastive conjunction in another. It used
  // to knock out one of the 48.
  clean('a contrastive conjunction in the correct one is not a caveat', question({
    options: [
      alt('O conjunto calcula a posição a partir do valor, enquanto a lista compara elemento por elemento.', true),
      alt('O conjunto mantém os elementos ordenados e faz busca binária, cortando o espaço pela metade.', false),
      alt('O conjunto guarda menos elementos por descartar as repetições, e a varredura termina antes.', false),
      alt('O conjunto é implementado em C e a lista em Python, então cada comparação custa bem menos.', false),
      alt('O conjunto mantém um índice auxiliar com a posição de cada elemento, lido antes da busca.', false)],
  }));

  // One word shared between hint and option is coincidence: "outro", "valor" and "saída" fell
  // that way in three of the 48.
  clean('a single hint word is not a bundle', question({
    socratic_hint: 'Escreva dois arquivos e rode os dois para comparar o valor que aparece.',
    options: [
      alt('O bloco executa na chamada direta e é ignorado na importação por outro módulo.', true),
      alt('O módulo é carregado uma única vez, mesmo com vários arquivos importando ele.', false),
      alt('As funções definidas ali deixam de ficar visíveis para quem importa o módulo.', false),
      alt('O interpretador muda a ordem em que procura os diretórios na hora da busca.', false),
      alt('A função chamada ali vira o ponto de entrada quando o módulo é importado.', false)],
  }));
});

/* ---- 3a2. a multiple-choice statement with mixed polarity ---------------- */

await group('the statement has to say which side to mark', () => {
  const multi = (statement) => ({
    type: 'multiple-choice', topic: 't', difficulty: 'medium', statement,
    socratic_hint: 'Uma dica qualquer.',
    options: [alt('a', true), alt('b', true), alt('c', false), alt('d', false), alt('e', false)],
  });
  // Real case: the two wrong ones were precisely statements about what the container does NOT
  // do, so marking "the limits" gave the set opposite to the key.
  ok(check(multi('Sobre o que a adoção de containers resolve e o que não resolve, marque todas as afirmações que se aplicam.'), { options: 5 })
    .some((x) => x.includes('polarities')), 'flags "o que X e o que não X"');
  for (const good of [
    'Sobre o que a adoção de containers efetivamente muda na entrega de uma aplicação, marque todas as afirmações que se aplicam.',
    'Marque todas as afirmações que se sustentam sobre namespaces, cgroups e sistemas de arquivos em união.',
    'Marque todas as consequências práticas que decorrem dessa conformidade.',
  ]) ok(!check(multi(good), { options: 5 }).length, `does not flag a single-polarity statement: "${good.slice(0, 45)}…"`);
});

/* ---- 3b. echo between the columns of a matching -------------------------- */

await group('the matching that closes by word matching', () => {
  const p = pairEcho([
    { left: 'O roteiro de publicação tem 40 passos manuais', right: 'Os passos manuais passam a ser um arquivo de texto versionado' },
    { left: 'Um serviço exige a versão 3.8 e outro a versão 3.12', right: 'Os dois serviços continuam no ar lado a lado, cada um com sua versão' },
    { left: 'A máquina de quem desenvolve difere da de produção', right: 'A máquina de produção passa a rodar a mesma imagem da máquina local' },
    { left: 'Cada implantação derruba o serviço por alguns minutos', right: 'A implantação troca o serviço sem derrubar o que já atende' },
  ]);
  ok(p.length === 1, 'catches the lexical echo between a left item and its own right', p.join('; ') || 'flagged nothing');

  // Describing behaviour in its own vocabulary is what the rule asks for, and must not be flagged.
  const cleanPairs = pairEcho([
    { left: 'pip list --outdated', right: 'Aparece uma coluna com o número mais novo publicado' },
    { left: 'deactivate', right: 'O prefixo some do prompt e o python volta a ser o do sistema' },
    { left: 'df.head(3)', right: 'Devolve um objeto do mesmo tipo, com três linhas' },
    { left: 'requests.get(url).json()', right: 'Converte o corpo da resposta em dicionário ou lista' },
  ]);
  ok(cleanPairs.length === 0, 'does not flag a right column written in its own vocabulary', cleanPairs.join('; '));

  ok(pairEcho([{ left: 'a', right: 'a' }, { left: 'b', right: 'b' }]).length === 0,
    'with fewer than three pairs it gives no opinion — too small a sample to tell method from chance');
});

/* ---- 3c. blind authoring: assembly and divergence ------------------------ */

await group('blind authoring builds the key from the judgement, not from the author', () => {
  const statements = ['primeira', 'segunda', 'terceira', 'quarta', 'quinta'];
  const j = (v, amb = false) => ({ true_statement: v, ambiguous: amb, why: 'porque sim' });

  const r = buildOptions(statements, [j(false), j(true), j(false), j(false), j(false)], 1);
  ok(!r.error && !r.diverged, 'a set that matches the type passes clean', r.error ?? r.diverged);
  ok(r.options[1].correct && r.options.filter((a) => a.correct).length === 1,
    'the correct one is the one the judgement pointed at, in the position it was written');
  ok(r.options.map((a) => a.text).join() === statements.join(),
    'the order of the statements is preserved — reordering would put the correct one somewhere predictable');

  // Diverging is not an error: it is the blind author producing a set that does not sustain
  // the intended key. It goes on to the mechanical check, which fails it for free.
  const d = buildOptions(statements, [j(true), j(true), j(false), j(false), j(false)], 1);
  ok(!d.error && d.diverged, 'two true ones in a quiz becomes a recorded divergence, not an error', JSON.stringify(d.diverged));
  ok(d.options.filter((a) => a.correct).length === 2,
    'and the set comes out as the judgement decided, for the structure to fail — the count is not touched up');

  ok(buildOptions(statements, [j(false), j(true, true), j(false), j(false), j(false)], 1).error,
    'an ambiguous statement invalidates the set: it serves neither as true nor as false');
  ok(buildOptions(statements, [j(true), j(false)], 1).error, 'a mismatched count between statements and judgements is an error');
  ok(buildOptions(null, [], 1).error, 'an answer without a list is an error, not an exception');

  ok(howManyTrue({ type: 'quiz' }) === 1, 'quiz asks for exactly one true statement');
  ok(howManyTrue({ type: 'multiple-choice', options: [{ correct: true }, { correct: true }, { correct: true }, { correct: false }] }) === 3,
    'multiple-choice keeps the count the generator chose — it came from the topic');
  ok(howManyTrue({ type: 'multiple-choice', options: [{ correct: true }] }) === 2,
    'and it never drops below two, which is the type\'s minimum');
});

/* ---- 3d. the generator must not see what comes later --------------------- */

await group('the syllabus is cut for whoever writes and whole for whoever critiques', () => {
  const course = { name: 'C', category: 'x', level: 'y', hours: 1, summary: 'r', syllabus: 'e', topics: ['one', 'two', 'three', 'four'] };
  const cut = courseContext(course, { upTo: 2 });
  ok(cut.includes('two') && !cut.includes('three'), 'cut at 2 shows the first two and hides the rest');
  ok(/de propósito/.test(cut), 'and it says the rest is hidden on purpose, so the author does not assume it was taught');
  ok(courseContext(course).includes('four'), 'with no cut, the syllabus comes whole — that is what the critic needs to recognise a forward reference');
  ok(courseContext(course, { upTo: 9 }).includes('four'), 'a cut beyond the end hides nothing');
  ok(courseContext(course, { upTo: undefined }).includes('four'), 'a topic missing from the syllabus must not blind the author by accident');
});

/* ---- 3e. reach against the already-paid rejections ----------------------- */

await group('the mechanical checks must not lose reach', () => {
  const m = measureReach();
  ok(m.total >= 16, 'the rejection corpus is loaded', `${m.total} rejections`);
  // It is not meant to reach 100%: a debatable key and an implausible distractor are semantic.
  // What it must not do is FALL — loosening a threshold to silence a false positive takes reach
  // away without anyone seeing, and this is the only place where that shows up for free.
  ok(m.pct >= m.floor, `reach of ${m.pct}% has not fallen below the floor of ${m.floor}%`,
    'if the drop is intentional, lower `floor` in rejected-corpus.json and say why in the commit');
});

/* ---- 3f. the SQL runner -------------------------------------------------- */

await group('SQL runs and respects the declared format', () => {
  const run = (sql, input = '') => {
    const r = spawnSync('python3', [path.join(HERE, 'lib', 'run_sql.py')],
      { input: JSON.stringify({ sql, input }), encoding: 'utf8', timeout: 10000 });
    return r.status === 0 ? r.stdout : `ERROR: ${(r.stderr || '').trim()}`;
  };

  // The student sees the whole script; everything but the last statement is setup.
  ok(run(`CREATE TABLE p (nome TEXT, qtd INTEGER);
INSERT INTO p VALUES ('a', 2), ('b', 1);
SELECT nome, qtd FROM p ORDER BY qtd;`) === 'nome | qtd\nb | 1\na | 2\n',
    'embedded script: setup separated from the query, header and " | " as separator');

  ok(run('SELECT nome FROM p ORDER BY nome', "CREATE TABLE p (nome TEXT); INSERT INTO p VALUES ('x');") === 'nome\nx\n',
    'setup passed separately through the input, which is how the `code` type runs');

  // The column type decides how the number is written, and that fails a careless key.
  ok(run('CREATE TABLE n (i INTEGER, r REAL); INSERT INTO n VALUES (120, 120); SELECT i, r FROM n;') === 'i | r\n120 | 120.0\n',
    'INTEGER prints 120 and REAL prints 120.0 — the column type rules');

  ok(run('CREATE TABLE v (a TEXT); INSERT INTO v VALUES (NULL); SELECT a FROM v;') === 'a\nNULL\n', 'NULL comes out as the word NULL');
  ok(run("CREATE TABLE z (a INTEGER); SELECT a FROM z WHERE a > 1;") === 'a\n', 'a query with no records prints only the header');
  ok(run("CREATE TABLE w (a INTEGER); INSERT INTO w VALUES (1), (2);") === '2 linha(s) afetada(s)\n', 'a statement with no result set reports the affected rows');

  // Without this, an exercise about referential integrity would approve an INSERT any real
  // database refuses: SQLite ships with the check turned off.
  ok(run(`CREATE TABLE mae (id INTEGER PRIMARY KEY);
CREATE TABLE filha (mae_id INTEGER REFERENCES mae(id));
INSERT INTO filha VALUES (99);`).startsWith('ERROR'), 'the foreign key is on and the orphan INSERT is refused');

  ok(run('SELECT * FROM nao_existe').startsWith('ERROR'), 'a SQL error becomes an error, not empty output');
});

/* ---- 4. the rewrite guards ----------------------------------------------- */

await group('the rewrite refuses what does not serve', () => {
  const old = question({ type: 'multiple-choice', topic: 'containers', statement: 'original' });
  ok(accept(old, null, 'timed out') === 'timed out', 'an empty rewrite is refused with the call\'s error');
  ok(/came back as quiz/.test(accept(old, { ...old, type: 'quiz' }) ?? ''), 'changing type is refused — it would escape a hard type for an easy one');
  ok(/came back as/.test(accept(old, { ...old, topic: 'outro assunto' }) ?? ''), 'changing topic is refused — it would change the course coverage');
  ok(accept(old, { ...old }) === 'came back identical', 'an identical rewrite is refused');
  ok(accept({ ...old, _critique: [{ dimension: 'hint', severity: 'high', explanation: 'x' }] }, { ...old, statement: 'outro' }) === null,
    'a real rewrite is accepted, and internal fields do not count as a difference');

  const withReport = {
    ...old,
    _reason: ['pista de forma: absoluto só de um lado'],
    _critique: [
      { dimension: 'hint', severity: 'high', explanation: 'a dica entrega a resposta' },
      { dimension: 'style', severity: 'low', explanation: 'ressalva menor' }],
  };
  const l = defectReport(withReport);
  ok(l.length === 2, 'the report joins both sources and discards what is not serious', l.join(' | '));
  ok(l[1].startsWith('[hint]'), 'the report identifies the finding\'s dimension', l[1]);
});

/* ---- 5. the funnel in laps ----------------------------------------------- */

await group('the funnel counts correctly what passed, what fell and what was rescued', async () => {
  // Five exercises; the even-numbered ones fail the critique until rewritten once.
  const list = (n) => Array.from({ length: n }, (_, i) => ({ id: i, type: 'quiz', topic: 't' }));
  const split = (xs, falls) => ({ approved: xs.filter((e) => !falls(e)), failed: xs.filter(falls) });

  const fallsIfEvenAndFresh = (e) => e.id % 2 === 0 && !e._rewritten;
  const rewriteAll = (fallen) => fallen.map((e) => ({ ...e, _rewritten: (e._rewritten ?? 0) + 1 }));

  let r = await funnel({
    exercises: list(5),
    laps: 1,
    validate: null,
    critique: async (xs) => split(xs, fallsIfEvenAndFresh),
    rewrite: async (fallen) => rewriteAll(fallen),
  });
  ok(r.approved.length === 5, 'with a rewrite that works, everything ends up approved', `${r.approved.length} approved`);
  ok(r.rejected.length === 0, 'and nothing is left rejected', `${r.rejected.length} rejected`);
  ok(r.approved.filter((e) => e._rewritten).length === 3, 'three were rescued (ids 0, 2 and 4)');

  // With no laps at all, the funnel behaves as it did before the rewrite existed.
  r = await funnel({ exercises: list(5), laps: 0, critique: async (xs) => split(xs, fallsIfEvenAndFresh), rewrite: async () => [] });
  ok(r.approved.length === 2 && r.rejected.length === 3, '--rewrite 0 restores the old behaviour', `${r.approved.length}/${r.rejected.length}`);

  // A rewrite that does not come back for one item: it is a final rejection, and by position —
  // the two fallen ones share topic and type, so only the position tells them apart.
  r = await funnel({
    exercises: list(4),
    laps: 1,
    critique: async (xs) => split(xs, fallsIfEvenAndFresh),
    rewrite: async (fallen) => fallen.map((e, i) => (i === 0 ? null : { ...e, _rewritten: 1 })),
  });
  ok(r.rejected.length === 1 && r.rejected[0].id === 0, 'whoever did not come back from the rewrite is rejected, identified by position',
    JSON.stringify(r.rejected.map((e) => e.id)));
  ok(r.approved.length === 3, 'and the others carry on', `${r.approved.length}`);

  // A rewrite that fails again: it does not vanish from the report.
  r = await funnel({
    exercises: list(2),
    laps: 1,
    critique: async (xs) => split(xs, () => true),
    rewrite: async (fallen) => fallen.map((e) => ({ ...e, _rewritten: 1 })),
  });
  ok(r.rejected.length === 2 && r.rejected.every((e) => e._rewritten), 'a rewrite that fails again is rejected, in its new version',
    `${r.rejected.length} rejected`);

  // Validation also feeds the rewrite, and what it approves enters `validated`.
  r = await funnel({
    exercises: list(4),
    laps: 1,
    validate: async (xs) => split(xs, fallsIfEvenAndFresh),
    critique: async (xs) => ({ approved: xs, failed: [] }),
    rewrite: async (fallen) => rewriteAll(fallen),
  });
  ok(r.approved.length === 4, 'something failed in validation also comes back through the rewrite', `${r.approved.length}`);
  ok(r.validated.length === 4, 'and `validated` accumulates both laps', `${r.validated.length}`);
});

/* ---- 6. the prompt attachment must not go stale -------------------------- */

await group('prompts.md matches the prompts in the code', async () => {
  const file = path.join(HERE, 'prompts.md');
  const saved = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  ok(saved === build({ options: 5 }), 'prompts.md is up to date — if this failed, run `node exercises.mjs --prompts`');

  // The real failure here is not the stale file, it is the forgotten prompt: someone adds a new
  // system prompt, the pipeline starts using it, and the attachment comes out incomplete
  // without warning. So the test looks in the code, not in the list.
  const source = fs.readdirSync(path.join(HERE, 'lib'))
    .filter((f) => f.endsWith('.mjs'))
    .flatMap((f) => [...fs.readFileSync(path.join(HERE, 'lib', f), 'utf8').matchAll(/^export const (SYS_\w+|RULES\w*|INSTRUCTIONS)\b/gm)].map((m) => `${f}:${m[1]}`));
  const registered = build({ options: 5 });
  for (const found of source) {
    const [file, name] = found.split(':');
    // `RULES_BY_TYPE` and `RULES` go in by text, not by name; they are checked by sample.
    const mod = await import(`./lib/${file}`);
    const text = typeof mod[name] === 'function' ? mod[name]({ options: 5 }) : mod[name];
    const sample = text.trim().split('\n')[0].slice(0, 60);
    ok(registered.includes(sample), `${name} (${file}) is in the attachment`, 'an exported prompt that does not appear in prompts.md — register it in lib/prompts.mjs');
  }
  ok(source.length >= 7, 'the sweep found the prompts in the code', `found ${source.length}`);
});

/* ---- 7. the progress verdict --------------------------------------------- */

await group('the verdict answers "did it improve or not"', () => {
  const base = { when: '2026-01-01T00:00:00.000Z', course: 'x', topics: 6, generated: 20, structure: 0, execution: 0, api: 10, approved: 10, approved_first_pass: 10, cost: 3, dimensions: {} };
  const says = (current, previous) => compare(current, [previous]).join('\n');

  ok(says({ ...base, structure: 5, api: 5 }, base).includes('IMPROVED'), 'catching more defects for free is progress, even with a flat rate');
  ok(says({ ...base, approved: 15, approved_first_pass: 15, api: 5 }, base).includes('IMPROVED'), 'approving more with the same division of labour is progress');
  ok(says(base, base).includes('STALLED'), 'everything the same means it stalled');
  ok(says({ ...base, approved: 4, approved_first_pass: 4, api: 16 }, base).includes('WORSE'), 'approving far fewer is a regression');

  // The defect that motivated the separation: 4 of 9 first pass, 3 bought in the rewrite, and
  // the verdict of the day said IMPROVED with +34 pp over a generator that had not moved.
  const bought = { ...base, generated: 9, approved: 7, approved_first_pass: 4, rewritten: 5, rescued: 3, api: 6, cost: 2.87 };
  const before = { ...base, generated: 18, approved: 8, approved_first_pass: 8, api: 9, structure: 1, cost: 2.62 };
  ok(says(bought, before).includes('STALLED'), 'a rescue does not become progress: the same first-pass rate is STALLED', says(bought, before).split('\n').pop());
  ok(says(bought, before).includes('more expensive'), 'and the verdict warns that each approval came out more expensive');
  ok(says({ ...bought, cost: 2.87 }, { ...before, cost: undefined }).includes('compared against nothing'),
    'a baseline with no cost becomes a warning, not silence — that is how the 25% rise went unnoticed');
  ok(compare(base, []).join('\n').includes('FIRST ROUND'), 'with no previous round, the verdict says so instead of inventing one');
  ok(!says(base, { ...base, course: 'outro' }).includes('before'), 'it does not compare with a round from another course — that would measure the subject');
});

console.log('');
console.log(failures ? `${failures} of ${counted} failed` : `${counted} checks, all passed`);
process.exit(failures ? 1 : 0);
