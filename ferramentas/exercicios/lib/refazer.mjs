/* Etapa 4: reescrever o que foi reprovado, com o defeito em mãos.
 *
 * Até aqui o exercício rejeitado era descartado. Ele já custou uma geração e uma crítica
 * inteiras, e o defeito veio nomeado — refazer com o laudo na mão é mais barato que gerar
 * outro às cegas e torcer.
 *
 * O RISCO desta etapa é ensinar para a prova. Reescrever até o juiz aprovar otimiza contra o
 * juiz, não contra a qualidade, e um juiz tem vício. Três coisas seguram isso:
 *
 *   · a reescrita volta pelo funil INTEIRO — conferência mecânica, execução e crítica —, e a
 *     conferência mecânica não muda de opinião nem se cansa;
 *   · a sonda cega não lê a crítica, então não há como agradá-la com redação;
 *   · uma tentativa por exercício, por padrão. Subir de volta é escolha explícita, e o
 *     histórico mostra se pagou.
 *
 * O tipo e o tópico ficam presos de propósito. Deixar o modelo trocar um `multipla-escolha`
 * difícil por um `quiz` fácil resolveria a rejeição e estragaria as duas medidas que mantêm
 * o gerador honesto: cobertura do tópico e taxa por tipo.
 */
import { contexto } from './catalogo.mjs';
import { perguntar } from './claude.mjs';
import { REGRAS } from './gerar.mjs';
import { esquema } from './tipos.mjs';
import { mapaConcorrente } from './paralelo.mjs';

const INTERNO = /^_/;
const limpo = (e) => Object.fromEntries(Object.entries(e).filter(([k]) => !INTERNO.test(k)));

/* O laudo, em uma lista. Vem de duas origens: a conferência mecânica grava `_motivo`, a
 * crítica grava `_critica`. As duas descrevem o mesmo tipo de coisa para quem vai reescrever. */
export function laudo(e) {
  const itens = [];
  for (const m of e._motivo ?? []) itens.push(typeof m === 'string' ? m : `caso ${m.caso} (${m.descricao}): ${m.motivo}`);
  for (const a of (e._critica ?? []).filter((x) => x.gravidade === 'alta')) itens.push(`[${a.dimensao}] ${a.explicacao}`);
  return itens;
}

/* Motivo para recusar a reescrita, ou null se ela serve. Separado da chamada para poder ser
 * conferido sem gastar. */
export function aceitar(velho, novo, erro) {
  if (!novo) return erro ?? 'a reescrita voltou vazia';
  // Tipo e tópico são restrição, não pedido: se o modelo trocou, a reescrita não serve — ela
  // mudaria a cobertura do curso ou a taxa por tipo sem que ninguém percebesse. Trocar um
  // `multipla-escolha` difícil por um `quiz` fácil resolve a rejeição e falsifica a medida.
  if (novo.tipo !== velho.tipo || novo.topico !== velho.topico) return `voltou como ${novo.tipo} de "${novo.topico}"`;
  // Devolver o mesmo texto é gastar de novo para reprovar de novo.
  if (JSON.stringify(limpo(novo)) === JSON.stringify(limpo(velho))) return 'voltou idêntico';
  return null;
}

const INSTRUCOES = `Este exercício foi reprovado. Reescreva-o corrigindo o defeito apontado.

**O defeito é fato; a sugestão de conserto é palpite.** Quem apontou o defeito não escreveu o
exercício e pode ter proposto a saída errada. Corrija a causa do jeito que você julgar melhor
— inclusive de um jeito que ninguém sugeriu.

**Mantenha o tópico e o tipo.** Não é permitido escapar de um tipo difícil trocando por um
fácil: o exercício precisa continuar validando o mesmo tópico pelo mesmo meio.

**Conserto cosmético não vale.** Se o defeito é "as erradas se denunciam pela forma", trocar
duas palavras não resolve — reescreva as alternativas. Se é "a dica entrega a resposta",
escreva outra dica, não a mesma com sinônimos. Se é "o gabarito está errado", decida qual é a
resposta certa e refaça o que for preciso para que ela seja a única.

**O resultado passa pelas mesmas conferências que reprovaram este.** Todas as regras acima
continuam valendo; corrigir o defeito apontado e quebrar outra regra não adianta nada.`;

export async function refazer({ exercicios, curso, opcoes, paralelo, aoProgredir }) {
  const system = `${REGRAS(opcoes)}\n\n---\n\n${contexto(curso)}`;

  const saidas = await mapaConcorrente(exercicios, paralelo, async (e, i) => {
    const problemas = laudo(e);
    const r = await perguntar({
      etapa: 'refazer',
      system,
      esquema: esquema(opcoes),
      maxTokens: 16000,
      pergunta: `${INSTRUCOES}

## Exercício reprovado
\`\`\`json
${JSON.stringify(limpo(e), null, 2)}
\`\`\`

## Defeitos apontados
${problemas.map((p) => `· ${p}`).join('\n')}

Devolva **um** exercício: a versão corrigida.`,
    });

    const recusa = aceitar(e, r.erro ? null : r.exercicios?.[0], r.erro);
    if (recusa) {
      aoProgredir?.(e, 'falhou', recusa, i + 1, exercicios.length);
      return null;
    }
    const novo = r.exercicios[0];
    aoProgredir?.(e, 'refeito', problemas[0] ?? '', i + 1, exercicios.length);
    return { ...novo, _refeito: (e._refeito ?? 0) + 1 };
  });

  // Alinhado com a entrada, buracos e tudo: dois exercícios do mesmo tópico e do mesmo tipo
  // são comuns num lote, então identidade por conteúdo não serve para saber qual voltou.
  return saidas;
}
