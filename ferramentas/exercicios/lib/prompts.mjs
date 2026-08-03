/* Todos os prompts do pipeline num lugar só, para leitura e para anexo.
 *
 * Eles são o ativo mais caro desta base: cada parágrafo saiu de um defeito real, e juntos
 * pesam mais que o código que os envia. Espalhados por quatro arquivos, ficavam ilegíveis de
 * uma vez e impossíveis de anexar sem alguém recortar à mão — e "recorte à mão, na hora, sem
 * errar" é o tipo de instrução que falha em silêncio.
 *
 * `prompts.md` é gerado daqui e versionado, e um teste confere que o arquivo bate com o que
 * este módulo produz. Editar um prompt sem regerar quebra o teste em vez de deixar um anexo
 * desatualizado circulando.
 */
import { REGRAS } from './gerar.mjs';
import { REGRAS_POR_TIPO } from './tipos.mjs';
import { SYS_SOLUCAO } from './validar.mjs';
import { SYS_CEGO, SYS_CEGO_PARES, SYS_DICA_ABERTA, SYS_DICA_ALTERNATIVAS, SYS_JULGA } from './criticar.mjs';
import { INSTRUCOES } from './refazer.mjs';
import { SYS_ESCREVER, SYS_JULGAR } from './cegas.mjs';

/* A moldura de autoria interpola as regras por tipo dentro de si. Mostrar as duas inteiras
 * repetiria o maior prompt da base e faria a contagem de palavras mentir por 2.800 — então a
 * parte interpolada vira marcador, e cada uma aparece uma vez só. */
const MARCA = '\n\n> ⟨aqui entram as regras por tipo, o prompt 2 desta lista⟩\n\n';
function moldura(opcoes) {
  const inteiro = REGRAS(opcoes);
  const dentro = REGRAS_POR_TIPO(opcoes);
  return inteiro.includes(dentro) ? inteiro.replace(dentro, MARCA) : inteiro;
}

/* A ordem é a do funil, não a dos arquivos: quem lê isto quer entender o pipeline. */
export const PROMPTS = ({ alternativas = 5 } = {}) => [
  {
    nome: 'Autoria — moldura',
    etapa: 'gerar',
    papel: 'Abre o system prompt de quem escreve. Fixa o que a escola é (correção por máquina, sem professor do outro lado) e a restrição de ordem dos tópicos. As regras por tipo entram interpoladas no ponto marcado.',
    texto: moldura({ alternativas }),
  },
  {
    nome: 'Autoria — regras por tipo',
    etapa: 'gerar',
    papel: 'O maior de todos e o que mais rende. Descreve os sete tipos e, para cada um, os defeitos que já apareceram e como não repeti-los. É o texto que uma reconstrução não consegue derivar do resumo.',
    texto: REGRAS_POR_TIPO({ alternativas }),
  },
  {
    nome: 'Autoria cega — escrever as afirmações',
    etapa: 'cegas',
    papel: 'Experimental. Escreve as N alternativas sabendo quantas serão verdadeiras e nunca quais. Ataca na origem a família inteira de pistas de forma: quando quem escreve sabe qual é a correta, ela sai melhor, e o aluno acerta pela forma.',
    texto: SYS_ESCREVER,
  },
  {
    nome: 'Autoria cega — julgar cada afirmação',
    etapa: 'cegas',
    papel: 'Chamada separada, sem memória da anterior. É este juízo que vira o gabarito — e a contagem de verdadeiras deixa de ser decretada pelo autor para ser apurada por um leitor.',
    texto: SYS_JULGAR,
  },
  {
    nome: 'Solução de referência às cegas',
    etapa: 'validar',
    papel: 'Escreve a solução de um exercício de código SEM ver os casos de teste. A cegueira é o ponto: concordar às cegas com os casos é evidência de que enunciado e gabarito descrevem a mesma coisa.',
    texto: SYS_SOLUCAO,
  },
  {
    nome: 'Sonda cega',
    etapa: 'criticar',
    papel: 'Responde a questão sem ver o que está marcado como correto. Divergiu do gabarito, alguém está errado — e ela também reporta ambiguidade, que é quando mais de uma leitura se defende.',
    texto: SYS_CEGO,
  },
  {
    nome: 'Sonda cega de pares',
    etapa: 'criticar',
    papel: 'O mesmo para `associacao`, que passou quatro rodadas sem sonda alguma — só o juiz olhava para ela, e o juiz é o instrumento mais fraco do funil. A direita vai ordenada alfabeticamente, nunca na ordem em que foi escrita: no JSON o par correto é esquerda[i] ↔ direita[i], e apresentar assim entregaria o gabarito pela posição.',
    texto: SYS_CEGO_PARES,
  },
  {
    nome: 'Sonda da dica — tipos sem alternativas',
    etapa: 'criticar',
    papel: 'Julga se a dica entrega a solução em exercício de código ou de saída esperada.',
    texto: SYS_DICA_ABERTA,
  },
  {
    nome: 'Sonda da dica — tipos com alternativas',
    etapa: 'criticar',
    papel: 'O mesmo, para questões de alternativas, onde o falso positivo é o risco: toda dica útil estreita o campo, e estreitar não é defeito. Separado do anterior por isso.',
    texto: SYS_DICA_ALTERNATIVAS,
  },
  {
    nome: 'Juiz',
    etapa: 'criticar',
    papel: 'O único passe de opinião do pipeline, para o que sonda não alcança: enunciado ambíguo, gabarito discutível, distrator implausível, escopo fora do tópico. Precisa conhecer as convenções da escola, senão reporta decisões de projeto como defeito — e está proibido de julgar generosidade de dica, que é da sonda.',
    texto: SYS_JULGA,
  },
  {
    nome: 'Reescrita',
    etapa: 'refazer',
    papel: 'Acompanha o exercício reprovado e o laudo. Diz que o defeito é fato e a sugestão de conserto é palpite, e que tipo e tópico estão presos.',
    texto: INSTRUCOES,
  },
];

const palavras = (s) => s.trim().split(/\s+/).length;

export function montar(opcoes) {
  const lista = PROMPTS(opcoes);
  const L = [];

  L.push('# Prompts do pipeline, na íntegra');
  L.push('');
  L.push('Gerado por `node exercicios.mjs --prompts`. **Não edite este arquivo** — edite o prompt');
  L.push('no código e rode o comando de novo; `npm test` confere que os dois batem.');
  L.push('');
  L.push('Este é o anexo de prompts do [`RECONSTRUIR.md`](RECONSTRUIR.md). Ele existe porque a');
  L.push('descrição de um prompt não substitui o prompt: o que some no resumo são os casos');
  L.push('trabalhados, e caso concreto é obedecido onde regra abstrata é obedecida às vezes.');
  L.push('');
  L.push(`Alternativas por questão: ${opcoes?.alternativas ?? 5}.`);
  L.push('');
  L.push('| # | prompt | etapa | palavras |');
  L.push('| --- | --- | --- | --- |');
  for (const [i, p] of lista.entries()) L.push(`| ${i + 1} | ${p.nome} | \`${p.etapa}\` | ${palavras(p.texto)} |`);
  L.push(`| | **total** | | **${lista.reduce((s, p) => s + palavras(p.texto), 0)}** |`);

  for (const [i, p] of lista.entries()) {
    L.push('');
    L.push('---');
    L.push('');
    L.push(`## ${i + 1}. ${p.nome}`);
    L.push('');
    L.push(`**Etapa:** \`${p.etapa}\` · **${palavras(p.texto)} palavras**`);
    L.push('');
    L.push(p.papel);
    L.push('');
    // Cerca de quatro crases: os prompts contêm blocos de código com três.
    L.push('````');
    L.push(p.texto.trim());
    L.push('````');
  }

  L.push('');
  return L.join('\n');
}
