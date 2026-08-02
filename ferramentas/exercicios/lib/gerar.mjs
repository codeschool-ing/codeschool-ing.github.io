/* Etapa 1: escrever exercícios a partir dos tópicos de um curso. */
import { contexto } from './catalogo.mjs';
import { perguntar } from './claude.mjs';
import { esquema, REGRAS_POR_TIPO, resumo } from './tipos.mjs';

const REGRAS = (opcoes) => `Você escreve exercícios para uma escola de programação online que
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

export async function gerar({ curso, topicos, tamLote, opcoes, aoProgredir }) {
  const lotes = [];
  for (let i = 0; i < topicos.length; i += tamLote) lotes.push(topicos.slice(i, i + tamLote));

  const todos = [];
  for (const [n, lote] of lotes.entries()) {
    aoProgredir?.(`lote ${n + 1}/${lotes.length} (${lote.length} tópicos)`);

    const r = await perguntar({
      etapa: 'gerar',
      system: `${REGRAS(opcoes)}\n\n---\n\n${contexto(curso)}`,
      esquema: esquema(opcoes),
      maxTokens: 32000,
      pergunta: `Escreva os exercícios para estes tópicos:\n\n${lote.map((t, i) => `${i + 1}. ${t}`).join('\n')}`,
    });

    if (r.erro) {
      aoProgredir?.(`  falhou: ${r.erro}`, true);
      continue;
    }
    const lidos = r.exercicios ?? [];
    todos.push(...lidos);
    aoProgredir?.(`  ${lidos.length} exercícios`, true);
  }
  return todos;
}

export function contagemPorTipo(exercicios) {
  const c = exercicios.reduce((a, e) => ((a[e.tipo] = (a[e.tipo] || 0) + 1), a), {});
  return Object.entries(c)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${v} ${k}`)
    .join(', ');
}

export { resumo };
