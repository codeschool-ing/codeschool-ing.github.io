/* Autoria cega das alternativas: escrever primeiro, decidir a verdade depois.
 *
 * Três rodadas mostraram que fechar um canal de pista de forma abre outro. Tirou-se a ressalva
 * assimétrica e apareceu o comprimento assimétrico; a taxa de primeira passada não saiu dos
 * ~40%. A causa não é o canal, é a assimetria de quem escreve: **o autor sabe qual é a correta
 * enquanto a redige, e cuida dela.**
 *
 * Aqui a autoria é dividida em duas chamadas independentes:
 *
 *   1. escrever N afirmações sobre o tópico, sabendo QUANTAS serão verdadeiras e nunca QUAIS.
 *      Sem gabarito para privilegiar, não há como caprichar na correta;
 *   2. numa chamada separada, sem memória da primeira, julgar cada afirmação. É esse juízo que
 *      vira o gabarito.
 *
 * É o mesmo princípio do oráculo cego que já governa a verificação, aplicado à escrita.
 *
 * Efeito colateral que é ganho: a contagem de verdadeiras deixa de ser decretada pelo autor e
 * passa a ser apurada por um leitor. Se o juízo devolver duas verdadeiras num `quiz`, a
 * conferência mecânica reprova de graça — e o que ela está pegando é um conjunto de afirmações
 * que não sustenta o gabarito pretendido, defeito que antes só o crítico via, pagando.
 */
import { contexto } from './catalogo.mjs';
import { perguntar } from './claude.mjs';
import { mapaConcorrente } from './paralelo.mjs';

const COM_ALTERNATIVAS = new Set(['quiz', 'multipla-escolha']);

export const SYS_ESCREVER = `Você escreve as alternativas de uma questão para uma escola de
programação, e trabalha **sem saber quais serão as corretas**.

Recebe o tópico, o enunciado e quantas afirmações verdadeiras o conjunto precisa conter. Não
recebe, e não deve decidir, **quais** são elas. Escreva o conjunto inteiro com o mesmo cuidado.

**Por que este trabalho é assim.** Quando quem escreve sabe qual é a correta, ela sai melhor:
mais longa, mais precisa, mais ressalvada, mais parecida com o enunciado. O aluno então acerta
pela forma, sem saber o assunto, e a questão deixa de medir o que promete. Escrevendo às cegas,
não existe alternativa a privilegiar.

**Cada afirmação precisa ser defensável à primeira vista.** Nada de absurdo evidente, nada de
enchimento. Uma afirmação falsa boa é a que um aluno de verdade responderia num dia ruim: erro
de escala, mecanismo trocado por outro que existe, conclusão certa por motivo errado, confusão
entre dois conceitos vizinhos do mesmo campo.

**Uniformidade é o critério pelo qual você está sendo medido.** Entre as N afirmações:

- mesmo comprimento aproximado — nenhuma destacadamente mais longa ou mais curta;
- mesmo grau de ressalva — ou todas ressalvam, ou nenhuma ressalva;
- mesma modalidade — não misture "pode acontecer" com "obriga a acontecer";
- mesma fórmula de abertura evitada: não comece três iguais e uma diferente;
- mesma distância do enunciado — nenhuma repetindo o vocabulário dele mais que as outras;
- mesmo nível de abstração e mesmo tempo verbal.

Teste antes de entregar: **lidas sem gabarito, dá para adivinhar quais são as verdadeiras só
pelo jeito como estão escritas?** Se dá, reescreva até não dar.`;

export const SYS_JULGAR = `Você julga afirmações técnicas, uma a uma, e nada mais.

Recebe o tópico de um curso e uma lista de afirmações escritas por outra pessoa, sem gabarito.
Para cada uma, decida se é **verdadeira** no contexto do tópico e escreva a justificativa que
o aluno lerá **depois** de responder.

Julgue pelo mérito técnico, não pela forma. Frase cuidadosa não é mais verdadeira que frase
seca; frase com absoluto não é mais falsa que frase com ressalva. Você é a única defesa contra
um conjunto em que a verdade se adivinha pelo estilo — se você julgar pelo estilo, não há
defesa nenhuma.

Se uma afirmação for verdadeira só sob uma leitura e falsa sob outra igualmente razoável,
marque \`ambigua\`. Ela não serve para nenhum dos dois lados.

A justificativa diz **por que** é verdadeira ou falsa, em uma ou duas frases, com o mecanismo.
"Está errado" não ensina nada; "a imagem declara a plataforma, e o kernel do host não muda"
ensina.`;

const ESQ_ESCREVER = {
  type: 'object',
  properties: { afirmacoes: { type: 'array', items: { type: 'string' } } },
  required: ['afirmacoes'],
  additionalProperties: false,
};

const ESQ_JULGAR = {
  type: 'object',
  properties: {
    juizos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          verdadeira: { type: 'boolean' },
          ambigua: { type: 'boolean' },
          porque: { type: 'string' },
        },
        required: ['verdadeira', 'ambigua', 'porque'],
        additionalProperties: false,
      },
    },
  },
  required: ['juizos'],
  additionalProperties: false,
};

/* Quantas verdadeiras o tipo pede. O `quiz` é exato; o `multipla-escolha` mantém a contagem
 * que o gerador escolheu, porque ela veio do tópico — só o mapeamento afirmação↔verdade é que
 * passa a ser cego. */
export function quantasVerdadeiras(e) {
  if (e.tipo === 'quiz') return 1;
  const n = (e.alternativas ?? []).filter((a) => a.correta).length;
  return n >= 2 ? n : 2;
}

/* Monta as alternativas a partir das afirmações e dos juízos. Devolve `{ alternativas }` ou
 * `{ erro }` — e o erro NÃO é reprovação silenciosa: o exercício segue com as alternativas
 * originais e um aviso, para não perder trabalho já pago por causa de uma chamada torta. */
export function montarAlternativas(afirmacoes, juizos, esperadas) {
  if (!Array.isArray(afirmacoes) || !Array.isArray(juizos)) return { erro: 'resposta sem lista' };
  if (afirmacoes.length !== juizos.length) return { erro: `${afirmacoes.length} afirmações e ${juizos.length} juízos` };
  const ambiguas = juizos.filter((j) => j.ambigua).length;
  if (ambiguas) return { erro: `${ambiguas} afirmação(ões) julgada(s) ambígua(s)` };

  const alternativas = afirmacoes.map((texto, i) => ({
    texto,
    correta: !!juizos[i].verdadeira,
    porque: juizos[i].porque,
  }));
  const certas = alternativas.filter((a) => a.correta).length;
  // A divergência é informação, não acidente: o autor cego produziu um conjunto cuja verdade
  // apurada não bate com a que a questão precisava. Deixa passar para a conferência mecânica,
  // que reprova de graça e manda para a reescrita com o defeito nomeado.
  return { alternativas, divergiu: certas !== esperadas ? `${certas} verdadeiras, o tipo pede ${esperadas}` : null };
}

export async function autoriaCega({ exercicios, curso, opcoes, paralelo, aoProgredir }) {
  // Também escreve às cegas quanto à ementa: só o que já foi ensinado até o tópico.
  const ctx = (e) => contexto(curso, { ate: (curso.topicos.indexOf(e.topico) + 1) || undefined });
  const alvos = exercicios.filter((e) => COM_ALTERNATIVAS.has(e.tipo));
  if (!alvos.length) return exercicios;

  const refeitos = new Map();
  await mapaConcorrente(alvos, paralelo, async (e, i) => {
    const n = opcoes.alternativas;
    const verdadeiras = quantasVerdadeiras(e);

    const escrita = await perguntar({
      etapa: 'cegas',
      system: `${SYS_ESCREVER}\n\n---\n\n${ctx(e)}`,
      esquema: ESQ_ESCREVER,
      maxTokens: 8000,
      pergunta: `## Tópico\n${e.topico}\n\n## Enunciado\n${e.enunciado}\n\nEscreva ${n} afirmações. **${verdadeiras} delas será(ão) verdadeira(s)** — mas não decida quais, e não indique nada: outra pessoa vai julgar cada uma depois de você.`,
    });
    if (escrita.erro || (escrita.afirmacoes?.length ?? 0) !== n) {
      aoProgredir?.(e, 'manteve', escrita.erro ?? `voltaram ${escrita.afirmacoes?.length ?? 0} de ${n}`, i + 1, alvos.length);
      return null;
    }

    // Chamada nova, sem memória da anterior: é o que torna o juízo independente da escrita.
    const juizo = await perguntar({
      etapa: 'cegas',
      system: `${SYS_JULGAR}\n\n---\n\n${ctx(e)}`,
      esquema: ESQ_JULGAR,
      maxTokens: 8000,
      pergunta: `## Tópico\n${e.topico}\n\n## Contexto da pergunta\n${e.enunciado}\n\n## Afirmações a julgar\n${escrita.afirmacoes.map((t, k) => `${k + 1}. ${t}`).join('\n')}`,
    });
    if (juizo.erro) {
      aoProgredir?.(e, 'manteve', juizo.erro, i + 1, alvos.length);
      return null;
    }

    const { alternativas, erro, divergiu } = montarAlternativas(escrita.afirmacoes, juizo.juizos, verdadeiras);
    if (erro) {
      aoProgredir?.(e, 'manteve', erro, i + 1, alvos.length);
      return null;
    }
    refeitos.set(e, alternativas);
    aoProgredir?.(e, divergiu ? 'cega, divergiu' : 'cega', divergiu ?? '', i + 1, alvos.length);
    return null;
  });

  return exercicios.map((e) => (refeitos.has(e) ? { ...e, alternativas: refeitos.get(e), _cega: true } : e));
}
