/* API client and cost accounting, shared by every stage. That way the pipeline total comes
 * out as a single figure instead of three to add up by hand. */

export const MODEL = 'claude-opus-5';

/* US$ per million tokens, claude-opus-5 */
const PRICE = { input: 5.0, output: 25.0, cache_read: 0.5, cache_write: 6.25 };

const usage = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
const byStage = {};

let client = null;

async function getClient() {
  // Lazy: revalidating a file that already carries solutions needs no key.
  if (!client) {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    client = new Anthropic();
  }
  return client;
}

/**
 * One call with structured output. Returns the parsed object, or { error }.
 * The `system` block is marked for caching: it does not change between exercises in a batch.
 */
export async function ask({ stage, system, question, schema, maxTokens = 8000 }) {
  const c = await getClient();
  const r = await c.messages
    .stream({
      model: MODEL,
      max_tokens: maxTokens,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high', format: { type: 'json_schema', schema } },
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: question }],
    })
    .finalMessage();

  // Accounting comes BEFORE any error return: a truncated or refused call is billed all the
  // same. Counting afterwards made a round spend without showing up in the report — a
  // six-topic generation blew the limit and the cost printed as zero.
  byStage[stage] = byStage[stage] ?? { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
  for (const k of Object.keys(usage)) {
    usage[k] += r.usage?.[k] ?? 0;
    byStage[stage][k] += r.usage?.[k] ?? 0;
  }

  if (r.stop_reason === 'refusal') return { error: 'refused by the classifiers' };
  if (r.stop_reason === 'max_tokens') return { error: 'truncated at max_tokens', truncated: true };

  const text = r.content.find((b) => b.type === 'text')?.text ?? '';
  try {
    return JSON.parse(text);
  } catch {
    return { error: 'response was not valid JSON' };
  }
}

function cost(u) {
  return (
    (u.input_tokens * PRICE.input +
      u.output_tokens * PRICE.output +
      u.cache_read_input_tokens * PRICE.cache_read +
      u.cache_creation_input_tokens * PRICE.cache_write) /
    1e6
  );
}

export function totalCost() {
  return cost(usage);
}

export function report() {
  const lines = Object.entries(byStage).map(([stage, u]) => `  ${stage.padEnd(10)} US$ ${cost(u).toFixed(4)}`);
  return {
    lines,
    total: cost(usage),
    tokens: usage,
    anyCalls: Object.keys(byStage).length > 0,
  };
}
