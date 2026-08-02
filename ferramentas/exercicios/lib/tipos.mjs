/* Os tipos de exercício: o que cada um é, quando usar, como conferir a estrutura.
 *
 * Todos precisam ser corrigíveis por máquina — a escola não tem professor corrigindo.
 * Cada tipo existe porque cobre um caso que os outros não cobrem:
 *
 *   codigo           escrever e executar          cursos de linguagem e ferramenta
 *   saida-esperada   prever o que o código faz    semântica, precedência, tipos
 *   quiz             uma resposta certa           conceito com uma leitura só
 *   multipla-escolha várias certas                conceito com mais de um aspecto
 *   ordenacao        sequência correta            processo, pipeline, ciclo de vida
 *
 * `ordenacao` e `saida-esperada` foram acrescentados porque quiz sozinho não serve às
 * 24 disciplinas de infra e segurança, onde o que se ensina é ordem de operação.
 */

export const TIPOS = ['codigo', 'saida-esperada', 'quiz', 'multipla-escolha', 'ordenacao'];

export const REGRAS_POR_TIPO = ({ alternativas }) => `
**codigo** — quando **o próprio tópico** é algo que se escreve e executa. Preencha
\`linguagem\`, \`esqueleto\` e \`testes\` com 3 a 6 casos.

O teste é: o tópico ensina a escrever aquilo, ou é um conceito que *daria* para simular em
código? Só o primeiro vira exercício de código. Pedir que o aluno programe um algoritmo
para ilustrar um tópico conceitual mede a linguagem de programação, não o tópico — e
reprova quem entendeu o assunto e não é programador.

\`saida_esperada\` de cada caso é o stdout byte a byte, **incluindo o \\n final**: se a
solução termina em \`print(x)\`, o gabarito termina em \`\\n\`. Gabarito sem o \\n reprova a
solução correta. Casos determinísticos: sem relógio, sem aleatoriedade, sem rede, sem ordem
de dicionário. Pelo menos um caso de borda.

**saida-esperada** — mostra um trecho pronto em \`codigo_dado\` e pede o que ele imprime;
o aluno digita a saída, comparada byte a byte com \`resposta\`. É o tipo mais barato de
corrigir e o melhor para semântica: precedência, conversão de tipo, avaliação preguiçosa,
mutabilidade. Use quando o valor de entender está em *prever*, não em escrever.

Cuidado: o gabarito precisa ser o que o interpretador realmente produz, não o que parece
óbvio. Antes de fixar, releia o trecho como se estivesse digitando no interpretador. Se o
texto exibido tiver leitura diferente do valor calculado, troque o exemplo.

**quiz** — conceito com uma resposta defensável só. \`alternativas\` com exatamente
${alternativas} opções e **uma** correta.

**multipla-escolha** — conceito em que mais de uma afirmação se sustenta. \`alternativas\`
com ${alternativas} opções e **duas ou três** corretas, nunca todas. O enunciado avisa que
há mais de uma ("marque todas que se aplicam"). Some com o chute: acertar exige avaliar
cada item, não escolher o melhor. Prefira este ao quiz quando o tópico tem vários aspectos
igualmente verdadeiros e o erro comum é conhecer só um deles.

**ordenacao** — o tópico é uma sequência que só funciona numa ordem. Preencha \`itens\` com
4 a 7 passos **na ordem correta**; o portal embaralha na hora de mostrar. Serve para
processo de deploy, ciclo de requisição, resposta a incidente, etapas de análise. É o tipo
que torna avaliável a parte do catálogo que não executa código.

Cada passo precisa ter uma posição inequívoca: se dois passos puderem ser trocados sem
prejuízo, o exercício tem duas respostas certas e não serve.

## Regras das alternativas (quiz e multipla-escolha)

Estas quatro falhas apareceram em quase todo quiz já gerado neste catálogo — confira uma a
uma antes de fechar a questão:

1. **Tamanho.** A correta sai mais longa e mais qualificada que as outras, cheia de
   ressalvas ("ainda que...", "mas depende de..."), e o aluno acerta pelo formato. As
   ${alternativas} devem ter comprimento e grau de hedge parecidos. Se a correta precisa de
   ressalva, dê ressalva às erradas também.
2. **Absurdo óbvio.** Distrator que ninguém marcaria não é distrator, é enchimento — some
   com ele e a questão encolhe. Cada errada precisa ser algo que um aluno de verdade
   responderia num dia ruim.
3. **Absolutos.** "Sempre", "nunca", "só quando", "apenas depois que" — quem faz prova
   descarta isso por hábito, sem ler o mérito. Evite, a menos que o absoluto seja exatamente
   o erro em teste.
4. **Categoria destoante.** Erradas todas de um assunto e a correta de outro deixam achar a
   diferente sem entender nada. Todas devem pertencer ao mesmo campo.

O teste final: um aluno esperto que **não estudou o tópico** consegue eliminar as erradas só
pela forma? Se consegue, refaça.

## A dica socrática, em qualquer tipo

Aponta o que examinar; não resolve. Se lida sozinha, não pode permitir acertar. Numa questão
de alternativas, ela não deve descartar o distrator mais forte — isso reduz a escolha a duas.
`;

/* Esquema único para todos os tipos. Campos que não valem para o tipo vêm vazios: saída
 * estruturada exige que tudo esteja em `required`, e um esquema por tipo multiplicaria as
 * chamadas sem ganho. */
export function esquema({ alternativas }) {
  return {
    type: 'object',
    properties: {
      exercicios: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            topico: { type: 'string', description: 'o tópico exato que este exercício valida' },
            tipo: { type: 'string', enum: TIPOS },
            dificuldade: { type: 'string', enum: ['facil', 'medio', 'dificil'] },
            enunciado: { type: 'string' },
            linguagem: { type: 'string', description: 'codigo e saida-esperada; vazio nos demais' },
            esqueleto: { type: 'string', description: 'só codigo' },
            testes: {
              type: 'array',
              description: 'só codigo',
              items: {
                type: 'object',
                properties: {
                  descricao: { type: 'string' },
                  entrada: { type: 'string' },
                  saida_esperada: { type: 'string' },
                },
                required: ['descricao', 'entrada', 'saida_esperada'],
                additionalProperties: false,
              },
            },
            codigo_dado: { type: 'string', description: 'só saida-esperada: o trecho mostrado ao aluno' },
            resposta: { type: 'string', description: 'só saida-esperada: o stdout exato do trecho' },
            alternativas: {
              type: 'array',
              description: `só quiz e multipla-escolha; ${alternativas} itens`,
              items: {
                type: 'object',
                properties: {
                  texto: { type: 'string' },
                  correta: { type: 'boolean' },
                  porque: { type: 'string' },
                },
                required: ['texto', 'correta', 'porque'],
                additionalProperties: false,
              },
            },
            itens: {
              type: 'array',
              description: 'só ordenacao: os passos NA ORDEM CORRETA',
              items: { type: 'string' },
            },
            dica_socratica: { type: 'string' },
          },
          required: [
            'topico', 'tipo', 'dificuldade', 'enunciado', 'linguagem', 'esqueleto',
            'testes', 'codigo_dado', 'resposta', 'alternativas', 'itens', 'dica_socratica',
          ],
          additionalProperties: false,
        },
      },
    },
    required: ['exercicios'],
    additionalProperties: false,
  };
}

/* Conferência estrutural: de graça, sem API e sem executar nada. */
export function conferir(e, { alternativas }) {
  const p = [];
  const vazio = (s) => !s?.trim?.();

  if (vazio(e.topico)) p.push('sem tópico');
  if (vazio(e.enunciado)) p.push('sem enunciado');
  if (vazio(e.dica_socratica)) p.push('sem dica socrática');
  if (!TIPOS.includes(e.tipo)) return [...p, `tipo desconhecido: ${e.tipo}`];

  const naoDeveTer = (campo, cond, rotulo) => {
    if (cond) p.push(`${e.tipo} com ${rotulo} preenchido`);
  };

  if (e.tipo === 'codigo') {
    if (vazio(e.linguagem)) p.push('código sem linguagem');
    if (vazio(e.esqueleto)) p.push('código sem esqueleto');
    if ((e.testes?.length ?? 0) < 3) p.push(`código com ${e.testes?.length ?? 0} casos (mínimo 3)`);
    for (const [i, t] of (e.testes ?? []).entries()) {
      if (typeof t.saida_esperada !== 'string') p.push(`caso ${i + 1} sem saida_esperada`);
      if (vazio(t.descricao)) p.push(`caso ${i + 1} sem descrição`);
    }
    naoDeveTer('alternativas', e.alternativas?.length, 'alternativas');
    naoDeveTer('itens', e.itens?.length, 'itens');
  } else if (e.tipo === 'saida-esperada') {
    if (vazio(e.linguagem)) p.push('saida-esperada sem linguagem');
    if (vazio(e.codigo_dado)) p.push('saida-esperada sem codigo_dado');
    if (typeof e.resposta !== 'string' || e.resposta === '') p.push('saida-esperada sem resposta');
    naoDeveTer('alternativas', e.alternativas?.length, 'alternativas');
    naoDeveTer('itens', e.itens?.length, 'itens');
  } else if (e.tipo === 'quiz' || e.tipo === 'multipla-escolha') {
    const n = e.alternativas?.length ?? 0;
    if (n !== alternativas) p.push(`${e.tipo} com ${n} alternativas (esperado ${alternativas})`);
    const certas = (e.alternativas ?? []).filter((a) => a.correta).length;
    if (e.tipo === 'quiz' && certas !== 1) p.push(`quiz com ${certas} corretas (esperado 1)`);
    if (e.tipo === 'multipla-escolha') {
      if (certas < 2) p.push(`multipla-escolha com ${certas} correta(s) (mínimo 2)`);
      if (certas >= n) p.push('multipla-escolha com todas as alternativas corretas');
    }
    if ((e.alternativas ?? []).some((a) => vazio(a.porque))) p.push('alternativa sem "porque"');
    if ((e.alternativas ?? []).some((a) => vazio(a.texto))) p.push('alternativa sem texto');
    naoDeveTer('testes', e.testes?.length, 'testes');
    naoDeveTer('itens', e.itens?.length, 'itens');
  } else if (e.tipo === 'ordenacao') {
    const n = e.itens?.length ?? 0;
    if (n < 4) p.push(`ordenacao com ${n} itens (mínimo 4)`);
    if (n > 7) p.push(`ordenacao com ${n} itens (máximo 7)`);
    if (new Set(e.itens ?? []).size !== n) p.push('ordenacao com itens repetidos');
    if ((e.itens ?? []).some(vazio)) p.push('ordenacao com item vazio');
    naoDeveTer('alternativas', e.alternativas?.length, 'alternativas');
    naoDeveTer('testes', e.testes?.length, 'testes');
  }

  return p;
}

/** Resumo de um exercício para exibir numa linha. */
export function resumo(e) {
  if (e.tipo === 'quiz' || e.tipo === 'multipla-escolha') {
    const certas = (e.alternativas ?? []).filter((a) => a.correta).length;
    return `${e.alternativas?.length ?? 0} alt, ${certas} certa(s)`;
  }
  if (e.tipo === 'codigo') return `${e.testes?.length ?? 0} casos`;
  if (e.tipo === 'ordenacao') return `${e.itens?.length ?? 0} passos`;
  if (e.tipo === 'saida-esperada') return e.linguagem;
  return '';
}
