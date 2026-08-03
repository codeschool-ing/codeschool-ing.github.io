/* Etapa 1: escrever exercícios a partir dos tópicos de um curso. */
import { contexto } from './catalogo.mjs';
import { perguntar } from './claude.mjs';
import { esquema, REGRAS_POR_TIPO, resumo } from './tipos.mjs';
import { mapaConcorrente } from './paralelo.mjs';

// Exportado porque quem reescreve um exercício reprovado obedece às mesmas regras de quem o
// escreveu: uma segunda lista de regras divergiria da primeira na primeira edição.
export const REGRAS = (opcoes) => `Você escreve exercícios para uma escola de programação online que
corrige tudo por máquina. Não existe professor do outro lado: um exercício que precise de
julgamento humano para ser corrigido é inútil aqui.

Para cada tópico recebido, escreva de 3 a 5 exercícios que permitam ao aluno validar se
entendeu **aquele tópico especificamente** — não o curso inteiro, não o tópico vizinho.

**A ordem dos tópicos é restrição, não contexto.** Um exercício do tópico N só pode exigir o
que os tópicos 1 a N já ensinaram. Usar recurso de tópico posterior reprova quem domina o
assunto avaliado e ainda não chegou lá, e a correção automática não distingue as duas coisas.
Antes de fixar o exercício, liste o que ele exige e confira cada item contra a posição do
tópico: método de string, condicional, laço, estrutura de dados, biblioteca. Se algo vier
depois, troque a tarefa.

## Os tipos disponíveis, e quando usar cada um
${REGRAS_POR_TIPO(opcoes)}

## Forma
Distribua as dificuldades: nem tudo fácil, nem tudo difícil. Varie os tipos conforme o
tópico pede — não force o mesmo tipo em tudo. Enunciados em português do Brasil, diretos,
sem "neste exercício você irá". Nome próprio de tecnologia fica intacto.

**O enunciado precisa especificar a saída exigida**, porque a comparação é exata: diga se há
texto além do valor, qual separador decimal, se há espaço no fim da linha. O aluno não pode
descobrir o contrato pelos casos de teste — ele não os vê.`;

export async function gerar({ curso, topicos, tamLote, paralelo, opcoes, aoProgredir }) {
  const lotes = [];
  for (let i = 0; i < topicos.length; i += tamLote) lotes.push(topicos.slice(i, i + tamLote));

  // `max_tokens` limita pensamento + resposta juntos, e o modelo entrega 128k. Com
  // thinking adaptativo em effort alto, 6 tópicos não cabiam em 32k: o lote inteiro
  // truncava e os 6 tópicos saíam sem exercício nenhum.
  const TETO_SAIDA = 64000;

  async function escrever(lote, rotulo) {
    // A ementa é cortada no último tópico do lote: o gerador não vê o que vem depois, e por
    // isso não tem como exigir. O prefixo grande (REGRAS) continua idêntico entre os lotes,
    // então o cache de prompt segue valendo.
    const ate = topicos.indexOf(lote[lote.length - 1]) + 1;
    const r = await perguntar({
      etapa: 'gerar',
      system: `${REGRAS(opcoes)}\n\n---\n\n${contexto(curso, { ate })}`,
      esquema: esquema(opcoes),
      maxTokens: TETO_SAIDA,
      pergunta: `Escreva os exercícios para estes tópicos:\n\n${lote.map((t, i) => `${i + 1}. ${t}`).join('\n')}`,
    });
    if (!r.erro) return { exercicios: r.exercicios ?? [] };

    // Truncar não é motivo para perder o lote inteiro: metade dos tópicos cabe na metade
    // do orçamento. Só desiste quando já é um tópico sozinho.
    if (r.truncou && lote.length > 1) {
      const meio = Math.ceil(lote.length / 2);
      aoProgredir?.(`  ${rotulo}: truncou com ${lote.length} tópicos, dividindo em dois`, 0, 0);
      const [a, b] = await Promise.all([
        escrever(lote.slice(0, meio), `${rotulo}a`),
        escrever(lote.slice(meio), `${rotulo}b`),
      ]);
      return { exercicios: [...a.exercicios, ...b.exercicios] };
    }
    return { exercicios: [], erro: r.erro };
  }

  const porLote = await mapaConcorrente(lotes, paralelo, async (lote, n, concluir) => {
    const rotulo = `lote ${n + 1}`;
    const { exercicios, erro } = await escrever(lote, rotulo);
    const feitos = concluir();
    if (erro && !exercicios.length) {
      aoProgredir?.(`  ${rotulo} falhou: ${erro}`, feitos, lotes.length);
      return [];
    }
    aoProgredir?.(`  ${rotulo}: ${exercicios.length} exercícios`, feitos, lotes.length);
    return exercicios;
  });

  return porLote.flat();
}

export function contagemPorTipo(exercicios) {
  const c = exercicios.reduce((a, e) => ((a[e.tipo] = (a[e.tipo] || 0) + 1), a), {});
  return Object.entries(c)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${v} ${k}`)
    .join(', ');
}

export { resumo };
