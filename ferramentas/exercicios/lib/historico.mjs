/* Registro de rodadas, para responder à única pergunta que importa no fim de uma execução:
 * a ferramenta melhorou ou não?
 *
 * Taxa de aprovação sozinha não responde. Ela muda com o curso, com o tópico e com a
 * dificuldade sorteada, e sobe se o gerador ficar tímido. O número que não mente é outro:
 *
 *   quantos defeitos a ferramenta pegou sozinha, de graça, contra quantos só apareceram
 *   depois de pagar a API.
 *
 * Toda regra nova que vira cálculo empurra defeito da coluna paga para a coluna de graça.
 * Se essa proporção não anda ao longo das rodadas, as rodadas estão consertando conteúdo e
 * não a ferramenta — que é exatamente o que a regra de ouro proíbe.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ARQUIVO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'historico.json');
const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);

export function ler() {
  try {
    return JSON.parse(fs.readFileSync(ARQUIVO, 'utf8')).rodadas ?? [];
  } catch {
    return [];
  }
}

export function registrar(r) {
  const rodadas = ler();
  rodadas.push(r);
  fs.writeFileSync(ARQUIVO, JSON.stringify({ rodadas }, null, 2), 'utf8');
}

/* Compara com a rodada anterior DO MESMO CURSO. Cursos diferentes têm dificuldade
 * diferente; comparar docker com python mediria o assunto, não a ferramenta. */
export function comparar(atual, rodadas = ler()) {
  const L = [];
  const anterior = rodadas.filter((r) => r.curso === atual.curso).pop();

  const medir = (r) => {
    const graca = r.estrutura + r.execucao;
    // A taxa do veredito é a da PRIMEIRA passada, sem os resgatados. Resgate é aprovação
    // comprada: mede quanto se pagou para consertar, não quanto o gerador melhorou. Somar os
    // dois faz uma rodada parada parecer um salto — aconteceu, com +34 pp aparentes sobre um
    // gerador que não tinha se movido um ponto.
    const primeira = r.aprovados_primeira ?? r.aprovados;
    return {
      taxa: pct(primeira, r.gerados),
      primeira,
      graca,
      pagos: r.api,
      gracaPct: pct(graca, graca + r.api),
      // Custo por exercício aprovado, não custo da rodada: é o único jeito de saber se uma
      // etapa que gasta mais — a reescrita — se paga entregando mais aprovados.
      unitario: r.aprovados && r.custo ? r.custo / r.aprovados : 0,
    };
  };
  const a = medir(atual);

  L.push('');
  L.push(anterior ? `progresso — ${atual.curso}, contra a rodada de ${anterior.quando.slice(0, 16).replace('T', ' ')}` : `progresso — ${atual.curso}`);

  const delta = (x, y) => (x - y > 0 ? `+${x - y}` : `${x - y}`);
  if (anterior) {
    const b = medir(anterior);
    L.push(`  1ª passada ...... ${a.primeira}/${atual.gerados} (${a.taxa}%)   antes ${b.primeira}/${anterior.gerados} (${b.taxa}%)   ${delta(a.taxa, b.taxa)} pp`);
    if (atual.refeitos) L.push(`  + resgatados .... ${atual.resgatados} de ${atual.refeitos} reescritos → ${atual.aprovados} aprovados  (aprovação comprada, não conta no veredito)`);
    L.push(`  pegos de graça .. ${a.graca} de ${a.graca + a.pagos} (${a.gracaPct}%)   antes ${b.graca} de ${b.graca + b.pagos} (${b.gracaPct}%)   ${delta(a.gracaPct, b.gracaPct)} pp`);
    if (a.unitario && b.unitario)
      L.push(`  custo/aprovado .. US$ ${a.unitario.toFixed(3)}   antes US$ ${b.unitario.toFixed(3)}   ${delta(pct(a.unitario, b.unitario), 100)}%`);
    // Falta de dado não pode virar silêncio: a rodada que estreou uma etapa PAGA foi comparada
    // sem a dimensão de custo, porque a linha de base não tinha o campo, e ninguém percebeu.
    else if (a.unitario) L.push(`  custo/aprovado .. US$ ${a.unitario.toFixed(3)}   sem comparação: a rodada anterior não registrou custo`);
    L.push(`  causas pagas .... ${causas(atual)}`);
    L.push('');
    L.push(`  ${veredito(a, b)}`);
  } else {
    L.push(`  aprovados ....... ${atual.aprovados}/${atual.gerados} (${a.taxa}%)`);
    L.push(`  pegos de graça .. ${a.graca} de ${a.graca + a.pagos} (${a.gracaPct}%)`);
    L.push(`  causas pagas .... ${causas(atual)}`);
    L.push('');
    L.push('  PRIMEIRA RODADA DESTE CURSO — não há com o que comparar. A próxima responde.');
  }
  return L;
}

function causas(r) {
  const e = Object.entries(r.dimensoes ?? {}).sort((x, y) => y[1] - x[1]);
  return e.length ? e.map(([d, n]) => `${d} ${n}`).join(' · ') : '—';
}

/* O veredito é de propósito grosseiro: três estados e uma frase. Um painel de métricas
 * exigiria interpretação, e interpretar no fim da rodada é o trabalho que este bloco
 * existe para poupar. */
function veredito(a, b) {
  const dGraca = a.gracaPct - b.gracaPct;
  const dTaxa = a.taxa - b.taxa;
  // A ressalva do preço vem colada no veredito, e não numa linha que dá para não ler: uma
  // etapa que aprova mais gastando o dobro por exercício não é evolução, é troca.
  let caro = '';
  if (a.unitario && b.unitario && a.unitario > b.unitario * 1.15)
    caro = ` Mas cada aprovado saiu ${Math.round(pct(a.unitario, b.unitario) - 100)}% mais caro — veja se compensa.`;
  else if (a.unitario && !b.unitario) caro = ' Sem custo na linha de base, o preço desta rodada não foi comparado com nada.';

  if (dGraca >= 5) return `EVOLUIU — a ferramenta pega ${dGraca} pp a mais dos defeitos sozinha, sem pagar API.${caro}`;
  if (dTaxa >= 5) return `EVOLUIU — o gerador acerta ${dTaxa} pp a mais de primeira, e a divisão de trabalho não piorou.${caro}`;
  if (dTaxa <= -5) return `PIOROU — o gerador acerta ${-dTaxa} pp a menos de primeira e nada novo foi pego de graça.`;
  return `PAROU — gerador na mesma taxa de primeira passada, mesma divisão de trabalho. Esta rodada só valeu se saiu regra nova dela.${caro}`;
}

/* Conta as dimensões que o crítico cobrou. Uma rejeição pode ter mais de um achado grave;
 * cada um conta, porque cada um é uma causa distinta a virar regra. */
export function dimensoesDe(rejeitados) {
  const t = {};
  for (const e of rejeitados)
    for (const a of (e._critica ?? []).filter((x) => x.gravidade === 'alta')) t[a.dimensao] = (t[a.dimensao] ?? 0) + 1;
  return t;
}
