#!/usr/bin/env node
/* Testes do que não precisa de API: conferências mecânicas, guardas da reescrita, veredito.
 *
 *   node teste.mjs
 *
 * O que este arquivo protege é a calibração. Toda conferência mecânica nasceu de um defeito
 * real e foi ajustada até não acusar nenhum dos 48 exercícios revisados à mão — e esse ajuste
 * era refeito à mão a cada rodada, num script que se jogava fora depois. Aqui ele fica: os 48
 * são o corpo de prova permanente, e cada regra guarda também o caso que a motivou, para que
 * afrouxar uma sem perceber quebre um teste em vez de passar despercebido.
 *
 * Barato de rodar, então rode antes de qualquer coisa que custe dinheiro.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { conferir, pistasDeForma } from './lib/tipos.mjs';
import { aceitar, laudo } from './lib/refazer.mjs';
import { comparar } from './lib/historico.mjs';
import { funil } from './lib/funil.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
let falhas = 0;
let contados = 0;

function ok(condicao, nome, detalhe = '') {
  contados++;
  if (condicao) return;
  falhas++;
  console.log(`  FALHOU  ${nome}${detalhe ? '\n          ' + detalhe : ''}`);
}

async function grupo(nome, fn) {
  console.log(nome);
  await fn();
}

const alt = (texto, correta) => ({ texto, correta, porque: 'explicação' });
const questao = (extra) => ({
  tipo: 'quiz',
  topico: 'um tópico',
  dificuldade: 'medio',
  enunciado: 'Um enunciado qualquer sobre a ferramenta.',
  dica_socratica: 'Uma dica que não aponta para lugar nenhum.',
  ...extra,
});

/* ---- 1. calibração: os 48 revisados à mão não podem acusar nada ----------- */

await grupo('corpo de prova — os 48 exercícios revisados à mão', () => {
  const d = JSON.parse(fs.readFileSync(path.join(AQUI, 'exercicios-python.json'), 'utf8'));
  ok(d.exercicios.length === 48, 'o corpo de prova tem 48 exercícios', `tem ${d.exercicios.length}`);

  for (const [i, e] of d.exercicios.entries()) {
    const p = conferir(e, { alternativas: d.alternativas ?? 5 });
    ok(p.length === 0, `#${i + 1} (${e.tipo}) passa na conferência mecânica`, p.join('; '));
  }
});

/* ---- 2. cada conferência ainda pega o defeito que a criou ---------------- */

await grupo('as pistas de forma ainda disparam nos casos que as motivaram', () => {
  const pega = (nome, e, trecho) => {
    const p = pistasDeForma(e);
    ok(p.some((x) => x.includes(trecho)), nome, p.length ? p.join('; ') : 'não acusou nada');
  };

  pega('correta muito mais longa que toda errada', questao({
    alternativas: [
      alt('Uma explicação longa e cuidadosa que cobre o mecanismo inteiro com todos os detalhes que importam.', true),
      alt('Curta.', false), alt('Também curta.', false), alt('Curta igual.', false), alt('Curtíssima.', false)],
  }), 'mais longa');

  pega('absoluto só nas erradas', questao({
    alternativas: [
      alt('O valor é recalculado a cada chamada da função.', true),
      alt('O valor nunca muda depois da primeira chamada.', false),
      alt('O valor sempre acompanha a variável original.', false),
      alt('Isso é impossível de acontecer em Python.', false),
      alt('Qualquer chamada produz o mesmo objeto.', false)],
  }), 'absoluto');

  pega('erradas todas com a mesma fórmula inicial', questao({
    alternativas: [
      alt('A função devolve o valor acumulado até ali.', true),
      alt('Serve para evitar que o laço rode duas vezes.', false),
      alt('Serve para converter o tipo antes da soma.', false),
      alt('Serve para limpar a memória entre as chamadas.', false),
      alt('Serve para registrar o resultado no console.', false)],
  }), 'começam todas com');

  pega('identificador técnico do enunciado numa alternativa só', questao({
    enunciado: 'A instalação com back-end WSL2 falhou no meio do processo. O que explica?',
    alternativas: [
      alt('O recurso de virtualização exigido pelo WSL2 está desligado na BIOS da máquina.', true),
      alt('O disco não tinha espaço suficiente para a imagem base.', false),
      alt('A conta usada não tinha permissão de escrita na pasta de destino.', false),
      alt('O antivírus bloqueou a gravação do executável.', false),
      alt('A rede caiu durante o download do pacote.', false)],
  }), 'termo técnico');

  // Caso real da rodada de 18 do Docker: a correta era "a única que se protege com um
  // advérbio de incerteza". O teste de hedge não pegava — exige duas corretas.
  pega('advérbio de incerteza numa alternativa só, a correta', questao({
    alternativas: [
      alt('As imagens continuam válidas, e os roteiros provavelmente precisam ser reescritos.', true),
      alt('Os comandos continuam válidos, bastando que a ferramenta seja certificada.', false),
      alt('Tudo continua igual, imagens e comandos.', false),
      alt('Não é preciso mudar nada nos roteiros existentes.', false),
      alt('Os comandos passam por conversão automática na primeira execução.', false)],
  }), 'advérbio de incerteza');

  // Caso real: marcar as cautelosas e descartar as taxativas dava o conjunto exato.
  pega('heurística de prova produz o gabarito exato', questao({
    tipo: 'multipla-escolha',
    alternativas: [
      alt('As operações sobre arquivos montados de fora costumam ficar mais lentas.', true),
      alt('A memória disponível em geral fica limitada ao que foi atribuído à máquina.', true),
      alt('Imagens de Linux não são executadas nesse arranjo.', false),
      alt('Os processos recebem o nome da imagem no gerenciador de tarefas.', false),
      alt('Containers de Windows sobem no mesmo modo de operação.', false)],
  }), 'ressalvadas');

  // Caso real: "conte quantos kernel de sistema operacional estão carregados", com uma
  // única alternativa falando em kernel.
  pega('feixe de palavras da dica numa alternativa só', questao({
    dica_socratica: 'Conte quantos kernel de sistema operacional estão carregados em memória em cada cenário.',
    alternativas: [
      alt('Cada máquina virtual carrega um kernel de sistema operacional próprio, e os containers compartilham o kernel já carregado.', true),
      alt('As imagens passam por uma etapa de compressão antes de subir.', false),
      alt('O hipervisor duplica as páginas de memória entre os hóspedes.', false),
      alt('O disco virtual precisa ser formatado a cada inicialização.', false),
      alt('A rede virtual exige uma negociação inicial demorada.', false)],
  }), 'palavras da dica');

  pega('a dica que conta quantas alternativas erram', questao({
    tipo: 'multipla-escolha',
    dica_socratica: 'Duas das afirmações são falsas: procure as que confundem imagem com container.',
    alternativas: [
      alt('A imagem é o artefato parado em disco.', true), alt('O container é a imagem em execução.', true),
      alt('A imagem muda de conteúdo enquanto executa.', false), alt('O container existe antes da imagem.', false),
      alt('Os dois nomes designam a mesma coisa.', false)],
  }), 'quantas alternativas');
});

/* ---- 3. e não podem disparar no que é prosa normal ----------------------- */

await grupo('as pistas de forma não disparam em prosa normal', () => {
  const limpa = (nome, e) => {
    const p = pistasDeForma(e);
    ok(p.length === 0, nome, p.join('; '));
  };

  // "enquanto" é ressalva numa frase e conjunção de contraste noutra. Derrubava um dos 48.
  limpa('conjunção de contraste na correta não é ressalva', questao({
    alternativas: [
      alt('O conjunto calcula a posição a partir do valor, enquanto a lista compara elemento por elemento.', true),
      alt('O conjunto mantém os elementos ordenados e faz busca binária, cortando o espaço pela metade.', false),
      alt('O conjunto guarda menos elementos por descartar as repetições, e a varredura termina antes.', false),
      alt('O conjunto é implementado em C e a lista em Python, então cada comparação custa bem menos.', false),
      alt('O conjunto mantém um índice auxiliar com a posição de cada elemento, lido antes da busca.', false)],
  }));

  // Uma palavra em comum entre dica e alternativa é coincidência: "outro", "valor" e "saída"
  // caíram assim em três dos 48.
  limpa('uma palavra só da dica não é feixe', questao({
    dica_socratica: 'Escreva dois arquivos e rode os dois para comparar o valor que aparece.',
    alternativas: [
      alt('O bloco executa na chamada direta e é ignorado na importação por outro módulo.', true),
      alt('O módulo é carregado uma única vez, mesmo com vários arquivos importando ele.', false),
      alt('As funções definidas ali deixam de ficar visíveis para quem importa o módulo.', false),
      alt('O interpretador muda a ordem em que procura os diretórios na hora da busca.', false),
      alt('A função chamada ali vira o ponto de entrada quando o módulo é importado.', false)],
  }));
});

/* ---- 4. guardas da reescrita --------------------------------------------- */

await grupo('a reescrita recusa o que não serve', () => {
  const velho = questao({ tipo: 'multipla-escolha', topico: 'containers', enunciado: 'original' });
  ok(aceitar(velho, null, 'estourou o tempo') === 'estourou o tempo', 'reescrita vazia é recusada com o erro da chamada');
  ok(/voltou como quiz/.test(aceitar(velho, { ...velho, tipo: 'quiz' }) ?? ''), 'trocar de tipo é recusado — escaparia de um tipo difícil para um fácil');
  ok(/voltou como/.test(aceitar(velho, { ...velho, topico: 'outro assunto' }) ?? ''), 'trocar de tópico é recusado — mudaria a cobertura do curso');
  ok(aceitar(velho, { ...velho }) === 'voltou idêntico', 'reescrita idêntica é recusada');
  ok(aceitar({ ...velho, _critica: [{ dimensao: 'dica', gravidade: 'alta', explicacao: 'x' }] }, { ...velho, enunciado: 'outro' }) === null,
    'reescrita de verdade é aceita, e campos internos não contam como diferença');

  const comLaudo = {
    ...velho,
    _motivo: ['pista de forma: absoluto só de um lado'],
    _critica: [
      { dimensao: 'dica', gravidade: 'alta', explicacao: 'a dica entrega a resposta' },
      { dimensao: 'estilo', gravidade: 'baixa', explicacao: 'ressalva menor' }],
  };
  const l = laudo(comLaudo);
  ok(l.length === 2, 'o laudo junta as duas origens e descarta o que não é grave', l.join(' | '));
  ok(l[1].startsWith('[dica]'), 'o laudo identifica a dimensão do achado', l[1]);
});

/* ---- 5. o funil em voltas ------------------------------------------------ */

await grupo('o funil conta certo o que passou, o que caiu e o que foi resgatado', async () => {
  // Cinco exercícios; os de nome par reprovam na crítica até serem refeitos uma vez.
  const lista = (n) => Array.from({ length: n }, (_, i) => ({ id: i, tipo: 'quiz', topico: 't' }));
  const separa = (xs, cai) => ({ aprovados: xs.filter((e) => !cai(e)), reprovados: xs.filter(cai) });

  const caiSeParEQuaseNovo = (e) => e.id % 2 === 0 && !e._refeito;
  const refazTodos = (caidos) => caidos.map((e) => ({ ...e, _refeito: (e._refeito ?? 0) + 1 }));

  let r = await funil({
    exercicios: lista(5),
    voltas: 1,
    validar: null,
    criticar: async (xs) => separa(xs, caiSeParEQuaseNovo),
    refazer: async (caidos) => refazTodos(caidos),
  });
  ok(r.aprovados.length === 5, 'com reescrita que funciona, todos acabam aprovados', `${r.aprovados.length} aprovados`);
  ok(r.rejeitados.length === 0, 'e nada sobra rejeitado', `${r.rejeitados.length} rejeitados`);
  ok(r.aprovados.filter((e) => e._refeito).length === 3, 'três foram resgatados (ids 0, 2 e 4)');

  // Sem volta nenhuma, o funil se comporta como antes de existir a reescrita.
  r = await funil({ exercicios: lista(5), voltas: 0, criticar: async (xs) => separa(xs, caiSeParEQuaseNovo), refazer: async () => [] });
  ok(r.aprovados.length === 2 && r.rejeitados.length === 3, '--refazer 0 devolve o comportamento antigo', `${r.aprovados.length}/${r.rejeitados.length}`);

  // Reescrita que não volta para um item: ele é rejeição definitiva, e por posição — os
  // dois caídos têm o mesmo tópico e o mesmo tipo, então só a posição distingue.
  r = await funil({
    exercicios: lista(4),
    voltas: 1,
    criticar: async (xs) => separa(xs, caiSeParEQuaseNovo),
    refazer: async (caidos) => caidos.map((e, i) => (i === 0 ? null : { ...e, _refeito: 1 })),
  });
  ok(r.rejeitados.length === 1 && r.rejeitados[0].id === 0, 'quem não voltou da reescrita é rejeitado, identificado por posição',
    JSON.stringify(r.rejeitados.map((e) => e.id)));
  ok(r.aprovados.length === 3, 'e os demais seguem', `${r.aprovados.length}`);

  // Reescrita que reprova de novo: não some do relatório.
  r = await funil({
    exercicios: lista(2),
    voltas: 1,
    criticar: async (xs) => separa(xs, () => true),
    refazer: async (caidos) => caidos.map((e) => ({ ...e, _refeito: 1 })),
  });
  ok(r.rejeitados.length === 2 && r.rejeitados.every((e) => e._refeito), 'reescrita que reprova de novo é rejeitada, na versão nova',
    `${r.rejeitados.length} rejeitados`);

  // A validação também alimenta a reescrita, e o que ela aprova entra em `validados`.
  r = await funil({
    exercicios: lista(4),
    voltas: 1,
    validar: async (xs) => separa(xs, caiSeParEQuaseNovo),
    criticar: async (xs) => ({ aprovados: xs, reprovados: [] }),
    refazer: async (caidos) => refazTodos(caidos),
  });
  ok(r.aprovados.length === 4, 'reprovado na validação também volta pela reescrita', `${r.aprovados.length}`);
  ok(r.validados.length === 4, 'e `validados` acumula as duas voltas', `${r.validados.length}`);
});

/* ---- 6. veredito de progresso -------------------------------------------- */

await grupo('o veredito responde "evoluiu ou não"', () => {
  const base = { quando: '2026-01-01T00:00:00.000Z', curso: 'x', topicos: 6, gerados: 20, estrutura: 0, execucao: 0, api: 10, aprovados: 10, dimensoes: {} };
  const diz = (atual, anterior) => comparar(atual, [anterior]).join('\n');

  ok(diz({ ...base, estrutura: 5, api: 5 }, base).includes('EVOLUIU'), 'pegar mais defeito de graça é evolução, mesmo com a taxa parada');
  ok(diz({ ...base, aprovados: 15, api: 5 }, base).includes('EVOLUIU'), 'aprovar mais com a mesma divisão de trabalho é evolução');
  ok(diz(base, base).includes('PAROU'), 'tudo igual é ter parado');
  ok(diz({ ...base, aprovados: 4, api: 16 }, base).includes('PIOROU'), 'aprovar bem menos é piora');
  ok(comparar(base, []).join('\n').includes('PRIMEIRA RODADA'), 'sem rodada anterior, o veredito diz isso em vez de inventar');
  ok(!diz(base, { ...base, curso: 'outro' }).includes('antes'), 'não compara com rodada de outro curso — mediria o assunto');
});

console.log('');
console.log(falhas ? `${falhas} de ${contados} falharam` : `${contados} conferências, todas passaram`);
process.exit(falhas ? 1 : 0);
