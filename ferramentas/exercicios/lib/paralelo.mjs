/* Executa uma função sobre uma lista com limite de concorrência.
 *
 * O pipeline passa a maior parte do relógio esperando rede: um curso de 48 tópicos são
 * ~200 exercícios, cada um com até quatro chamadas em série. Em sequência isso é hora de
 * espera; com N trabalhadores é hora dividida por N.
 *
 * Os resultados voltam **na ordem da entrada**, mesmo terminando fora de ordem — o arquivo
 * gerado não pode depender de quem respondeu primeiro, senão duas rodadas iguais produzem
 * arquivos diferentes.
 */
export async function mapaConcorrente(itens, limite, fn) {
  const resultados = new Array(itens.length);
  let proximo = 0;
  let concluidos = 0;

  const trabalhador = async () => {
    for (;;) {
      const i = proximo++;
      if (i >= itens.length) return;
      resultados[i] = await fn(itens[i], i, () => ++concluidos);
    }
  };

  const n = Math.max(1, Math.min(limite, itens.length));
  await Promise.all(Array.from({ length: n }, trabalhador));
  return resultados;
}
