/* Runs a function over a list with a concurrency limit.
 *
 * The pipeline spends most of the wall clock waiting on the network: a 48-topic course is
 * ~200 exercises, each with up to four calls in sequence. Done serially that is hours of
 * waiting; with N workers it is hours divided by N.
 *
 * Results come back **in input order**, even when they finish out of order — the generated
 * file must not depend on who answered first, or two identical runs produce different files.
 */
export async function concurrentMap(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  let done = 0;

  const worker = async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i, () => ++done);
    }
  };

  const n = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: n }, worker));
  return results;
}
