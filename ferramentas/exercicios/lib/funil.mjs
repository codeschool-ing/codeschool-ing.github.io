/* O funil, em voltas: valida → critica → refaz o que caiu → valida de novo.
 *
 * Está separado do resto porque é contabilidade, e contabilidade errada aqui não aparece na
 * saída: um exercício resgatado contado como rejeitado, ou um rejeitado contado duas vezes,
 * produz um relatório plausível e falso ao fim de uma rodada que custou dólares. Isolado,
 * roda inteiro contra funções de mentira e sem gastar nada — ver teste.mjs.
 *
 * As três funções vêm de fora. Cada uma recebe uma lista e devolve o que passou e o que caiu;
 * `refazer` devolve alinhado com a entrada, com buraco onde não houve reescrita, porque dois
 * exercícios do mesmo tópico e do mesmo tipo no mesmo lote são comuns e identidade por
 * conteúdo confundiria um com o outro.
 */
export async function funil({ exercicios, voltas = 0, validar, criticar, refazer }) {
  const aprovados = [];
  const validados = [];
  let rejeitados = [];
  let entrada = exercicios;

  for (let volta = 0; entrada.length; volta++) {
    let caidos = [];
    let adiante = entrada;

    if (validar) {
      const v = await validar(entrada, volta);
      adiante = v.aprovados;
      caidos = [...v.reprovados];
    }
    validados.push(...adiante);

    if (criticar) {
      const c = await criticar(adiante, volta);
      aprovados.push(...c.aprovados);
      caidos.push(...c.reprovados);
    } else aprovados.push(...adiante);

    if (volta >= voltas || !caidos.length) {
      rejeitados.push(...caidos);
      break;
    }

    const refeitos = await refazer(caidos, volta + 1);
    // Quem não produziu reescrita não tem segunda chance nesta rodada: é rejeição definitiva
    // agora, e não na volta seguinte, senão sairia do relatório sem aparecer em lugar nenhum.
    rejeitados.push(...caidos.filter((_, i) => !refeitos[i]));
    entrada = refeitos.filter(Boolean);
  }

  return { aprovados, validados, rejeitados };
}
