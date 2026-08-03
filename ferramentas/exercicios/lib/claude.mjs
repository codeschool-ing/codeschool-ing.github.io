/* Cliente da API e contabilidade de custo, compartilhados por todas as etapas.
 * Assim o total do pipeline sai numa conta só, em vez de três para somar na mão. */

export const MODELO = 'claude-opus-5';

/* US$ por milhão de tokens, claude-opus-5 */
const PRECO = { entrada: 5.0, saida: 25.0, leitura_cache: 0.5, escrita_cache: 6.25 };

const uso = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
const porEtapa = {};

let cliente = null;

async function obterCliente() {
  // Preguiçoso: revalidar um arquivo que já traz soluções não precisa de chave.
  if (!cliente) {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    cliente = new Anthropic();
  }
  return cliente;
}

/**
 * Uma chamada com saída estruturada. Devolve o objeto já parseado, ou { erro }.
 * O bloco `system` é marcado para cache: entre exercícios do mesmo lote ele não muda.
 */
export async function perguntar({ etapa, system, pergunta, esquema, maxTokens = 8000 }) {
  const c = await obterCliente();
  const r = await c.messages
    .stream({
      model: MODELO,
      max_tokens: maxTokens,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high', format: { type: 'json_schema', schema: esquema } },
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: pergunta }],
    })
    .finalMessage();

  // A contabilidade vem ANTES de qualquer saída por erro: chamada truncada ou recusada é
  // cobrada igual. Contabilizar depois fazia a rodada gastar sem aparecer no relatório —
  // uma geração de 6 tópicos estourou o limite e o custo apareceu como zero.
  porEtapa[etapa] = porEtapa[etapa] ?? { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
  for (const k of Object.keys(uso)) {
    uso[k] += r.usage?.[k] ?? 0;
    porEtapa[etapa][k] += r.usage?.[k] ?? 0;
  }

  if (r.stop_reason === 'refusal') return { erro: 'recusado pelos classificadores' };
  if (r.stop_reason === 'max_tokens') return { erro: 'truncado em max_tokens', truncou: true };

  const texto = r.content.find((b) => b.type === 'text')?.text ?? '';
  try {
    return JSON.parse(texto);
  } catch {
    return { erro: 'resposta não era JSON válido' };
  }
}

function calcular(u) {
  return (
    (u.input_tokens * PRECO.entrada +
      u.output_tokens * PRECO.saida +
      u.cache_read_input_tokens * PRECO.leitura_cache +
      u.cache_creation_input_tokens * PRECO.escrita_cache) /
    1e6
  );
}

export function custoTotal() {
  return calcular(uso);
}

export function relatorio() {
  const linhas = Object.entries(porEtapa).map(([etapa, u]) => `  ${etapa.padEnd(10)} US$ ${calcular(u).toFixed(4)}`);
  return {
    linhas,
    total: calcular(uso),
    tokens: uso,
    houveChamada: Object.keys(porEtapa).length > 0,
  };
}
