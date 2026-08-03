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
    return { taxa: pct(r.aprovados, r.gerados), graca, pagos: r.api, gracaPct: pct(graca, graca + r.api) };
  };
  const a = medir(atual);

  L.push('');
  L.push(anterior ? `progresso — ${atual.curso}, contra a rodada de ${anterior.quando.slice(0, 16).replace('T', ' ')}` : `progresso — ${atual.curso}`);

  const delta = (x, y) => (x - y > 0 ? `+${x - y}` : `${x - y}`);
  if (anterior) {
    const b = medir(anterior);
    L.push(`  aprovados ....... ${atual.aprovados}/${atual.gerados} (${a.taxa}%)   antes ${anterior.aprovados}/${anterior.gerados} (${b.taxa}%)   ${delta(a.taxa, b.taxa)} pp`);
    L.push(`  pegos de graça .. ${a.graca} de ${a.graca + a.pagos} (${a.gracaPct}%)   antes ${b.graca} de ${b.graca + b.pagos} (${b.gracaPct}%)   ${delta(a.gracaPct, b.gracaPct)} pp`);
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
  if (dGraca >= 5) return `EVOLUIU — a ferramenta pega ${dGraca} pp a mais dos defeitos sozinha, sem pagar API.`;
  if (dTaxa >= 5) return `EVOLUIU — sai mais exercício bom (${dTaxa} pp), e a divisão de trabalho não piorou.`;
  if (dTaxa <= -5) return `PIOROU — ${-dTaxa} pp a menos de aprovação e nada novo pego de graça.`;
  return 'PAROU — mesma taxa, mesma divisão de trabalho. Esta rodada só valeu se saiu regra nova dela.';
}

/* Conta as dimensões que o crítico cobrou. Uma rejeição pode ter mais de um achado grave;
 * cada um conta, porque cada um é uma causa distinta a virar regra. */
export function dimensoesDe(rejeitados) {
  const t = {};
  for (const e of rejeitados)
    for (const a of (e._critica ?? []).filter((x) => x.gravidade === 'alta')) t[a.dimensao] = (t[a.dimensao] ?? 0) + 1;
  return t;
}
