/* O corpo de prova das rejeições: tudo que já custou uma chamada de API para ser reprovado.
 *
 * São dois corpos de prova, com papéis opostos, e os dois são necessários:
 *
 *   · os exercícios revisados à mão — nenhuma conferência mecânica pode acusar. Mede FALSO
 *     POSITIVO, e é o que impede uma regra nova de derrubar exercício bom;
 *   · este arquivo, as rejeições reais — quanto mais conferência acusar, melhor. Mede
 *     ALCANCE, e é o que responde "essa regra nova teria pego o defeito que pagamos?".
 *
 * Faltava o segundo, e por isso várias rodadas pagas existiram só para testar uma regra em
 * conteúdo novo quando o conteúdo velho serviria. Pior: os arquivos de rejeição eram
 * sobrescritos a cada execução, então o material se perdia sozinho — das doze rodadas
 * pagas, sobraram as rejeições de uma.
 *
 * A taxa NÃO precisa chegar a 100%: gabarito discutível e distrator implausível são
 * semânticos, e cálculo não os alcança. O que ela precisa é **não cair**, e subir quando uma
 * regra nova entra. É a mesma medida do veredito de rodada, medida de graça.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { conferir } from './tipos.mjs';

const ARQUIVO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'corpo-rejeitado.json');
const chave = (e) => `${e.tipo}|${(e.enunciado ?? '').slice(0, 120)}`;

export function ler() {
  try {
    return JSON.parse(fs.readFileSync(ARQUIVO, 'utf8'));
  } catch {
    return { piso: 0, exercicios: [] };
  }
}

/* Guarda o exercício com o laudo e joga fora o resto: solução de referência e campos de
 * execução não dizem nada sobre por que ele foi rejeitado, e incham o arquivo. */
export function acumular(rejeitados, curso) {
  const atual = ler();
  const vistos = new Set(atual.exercicios.map(chave));
  let novos = 0;
  for (const e of rejeitados) {
    if (vistos.has(chave(e))) continue;
    vistos.add(chave(e));
    const { _solucao_referencia, ...resto } = e;
    atual.exercicios.push({ ...resto, _curso: curso });
    novos++;
  }
  if (novos) fs.writeFileSync(ARQUIVO, JSON.stringify(atual, null, 2), 'utf8');
  return novos;
}

/* Quanto do que foi pago seria pego de graça hoje, e — o que mais importa para escolher a
 * próxima regra — em que dimensão está o que ainda escapa. */
export function medirAlcance(corpo = ler()) {
  const porDimensao = {};
  let pego = 0;
  for (const e of corpo.exercicios) {
    const grátis = conferir(e, { alternativas: 5 }).length > 0;
    if (grátis) pego++;
    const dims = new Set([
      ...(e._critica ?? []).filter((a) => a.gravidade === 'alta').map((a) => a.dimensao),
      ...(e._motivo ? ['mecânico'] : []),
    ]);
    for (const d of dims.size ? dims : ['sem laudo']) {
      porDimensao[d] ??= { pago: 0, gratis: 0 };
      porDimensao[d][grátis ? 'gratis' : 'pago']++;
    }
  }
  const total = corpo.exercicios.length;
  return { pego, total, pct: total ? Math.round((pego / total) * 100) : 0, piso: corpo.piso ?? 0, porDimensao };
}

export function relatorio() {
  const m = medirAlcance();
  const L = [`alcance das conferências mecânicas: ${m.pego} de ${m.total} rejeições pagas (${m.pct}%), piso registrado ${m.piso}%`, ''];
  L.push('  dimensão'.padEnd(20) + 'de graça'.padStart(10) + 'ainda pago'.padStart(12));
  for (const [d, v] of Object.entries(m.porDimensao).sort((a, b) => b[1].pago - a[1].pago))
    L.push(`  ${d}`.padEnd(20) + String(v.gratis).padStart(10) + String(v.pago).padStart(12));
  L.push('');
  L.push('A coluna da direita é a fila de trabalho: é onde uma regra nova converte gasto em cálculo.');
  L.push('Nem tudo ali é conversível — gabarito discutível é semântico —, mas o que for aparece aqui primeiro.');
  return L.join('\n');
}
