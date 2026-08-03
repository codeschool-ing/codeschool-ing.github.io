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

export const TIPOS = ['codigo', 'saida-esperada', 'quiz', 'multipla-escolha', 'ordenacao', 'associacao', 'resposta-expressao'];

/* Tipos que não pressupõem programação. Só `codigo` e `saida-esperada` dependem de um
 * interpretador; os outros quatro servem a qualquer disciplina. */
export const TIPOS_NEUTROS = ['quiz', 'multipla-escolha', 'ordenacao', 'associacao', 'resposta-expressao'];

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

**Quatro regras dos casos de teste, cada uma vinda de um exercício que passou na validação
e mediu a coisa errada. Antes de fechar, responda as quatro por escrito:**

1. **Existe solução que ignora o tópico e passa em todos os casos?** Se existe, o exercício
   não mede o tópico. Um exercício sobre argumento com valor padrão em que todos os casos
   usam o padrão é resolvido cravando o valor: passou 5 de 5 sem que o parâmetro existisse.
   Pelo menos um caso precisa forçar o mecanismo que dá nome ao tópico.

2. **A ferramenta natural do tópico produz o seu gabarito?** Se o recurso óbvio da biblioteca
   dá resultado diferente do que você espera, o exercício pune justamente quem estudou.
   Caso real: exigir desempate alfabético num tópico de \`collections\`, quando
   \`Counter.most_common\` desempata por ordem de inserção. Ajuste a especificação para
   coincidir com a ferramenta, ou escolha outra tarefa.

3. **Se o tópico é desempenho ou complexidade, algum caso separa as classes?** Casos com três
   elementos aprovam o laço aninhado igual à solução linear. Inclua uma entrada grande o
   bastante para a solução ingênua estourar o tempo — aí a complexidade vira critério
   executável em vez de assunto de redação.

4. **A dificuldade está no tópico ou em ler a entrada?** \`"valores separados por espaço"\`
   convida a \`split(" ")\`, e numa linha vazia isso devolve \`[""]\` em vez de \`[]\` — o aluno
   reprova por fatiamento de string num exercício sobre exceções. Ou o esqueleto já entrega
   a entrada já convertida, ou o enunciado diz exatamente o que fazer com campo vazio.

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

**Regra da dica em \`saida-esperada\`: nunca mande executar o trecho.** Em todo outro tipo,
"rode e observe" é uma boa dica socrática, porque o aluno ainda precisa interpretar o que
viu. Aqui a resposta pedida **é** a saída do programa, então "rode o trecho" equivale a
"copie o gabarito do terminal". Aponte o conceito, a linha suspeita ou a comparação a fazer
— nunca a execução.

**ordenacao** — o tópico é uma sequência que só funciona numa ordem. Preencha \`itens\` com
4 a 7 passos **na ordem correta**; o portal embaralha na hora de mostrar. Serve para
processo de deploy, ciclo de requisição, resposta a incidente, etapas de análise. É o tipo
que torna avaliável a parte do catálogo que não executa código.

Cada passo precisa ter uma posição inequívoca: se dois passos puderem ser trocados sem
prejuízo, o exercício tem duas respostas certas e não serve.

**E há uma segunda exigência, que reprovou três de três ordenações na primeira rodada real.**
Ordem inequívoca não basta, porque a cronologia narrativa costuma entregar a resposta: quem
nunca estudou o assunto ordena "montar a URL, pedir, converter, guardar, repetir" no primeiro
palpite. Duas coisas decorrem disso:

1. **Preencha \`armadilha\`** com o par de passos vizinhos que um aluno desatento inverte, e
   por que inverter dá errado. Se você não conseguir nomear esse par, o exercício mede senso
   comum e não o tópico — escolha outro tipo. É campo obrigatório justamente para forçar essa
   decisão antes de escrever os itens.
2. **Nenhum passo pode referenciar o anterior.** "Executa **esse** bytecode", "congelar as
   versões **instaladas**", "versionar o **requirements.txt**" logo depois do passo que o cria:
   cada uma dessas amarras entrega a posição pelo texto. Escreva cada passo de modo que ele
   faça sentido sozinho, fora de ordem.

3. **Nenhum passo pode justificar a própria posição.** Esta é mais sutil que a anáfora e
   anula a armadilha por dentro. Caso real: a armadilha declarada era inverter o sistema
   operacional hospedeiro e o hipervisor tipo 2 — e o item do hipervisor dizia "executado
   como um programa comum", o que já entrega que existe um SO embaixo dele. O autor nomeou a
   armadilha e a desarmou na mesma frase. Depois de escrever os itens, releia cada um
   perguntando: **este texto diria a alguém que ignora o assunto onde ele vai?** Se disser,
   corte a parte que diz.

**associacao** — o tópico tem itens que se emparelham um a um. Preencha \`pares\` com 4 a 6
duplas \`{esquerda, direita}\`; o portal embaralha a coluna da direita. Serve para comando e
efeito, erro e causa, conceito e definição, padrão e problema que ele resolve, campo do
protocolo e função.

A regra que faz ou quebra o tipo: **cada item da esquerda casa com exatamente um da
direita, e isso tem de ser inequívoco.** Se um item da direita puder ser defendido para
duas entradas da esquerda, o exercício tem mais de um gabarito. Antes de fechar, teste cada
item da direita contra todas as esquerdas, não só contra a sua.

Mantenha as duas colunas homogêneas: se as direitas forem definições, todas são definições,
com comprimento parecido. Uma direita muito mais longa ou específica que as outras se
entrega pelo formato, do mesmo jeito que a alternativa longa num quiz.

**Duas regras que vieram de quatro associações reprovadas numa rodada real:**

**Preencha \`distratores_direita\`** com 1 ou 2 itens da direita que não emparelham com nada.
Sem eles, N esquerdas contra N direitas fazem o último par sair de graça, por eliminação, e
o aluno acerta um item que nunca avaliou.

O distrator só cumpre essa função se **disputar com o par mais difícil**. Um distrator
descartável de imediato não muda nada: o aluno resolve os pares triviais, e o difícil
continua sobrando por eliminação. Caso real: numa associação de operadores aritméticos,
\`"ababab"\` era visivelmente \`"ab" * 3\` e saía na hora, então o par entre \`9 // 2\` e \`9 / 2\`
— o único que exigia saber os tipos — continuava saindo de graça. Trocado por \`4.0\` e \`1.0\`,
que disputam com as **duas** expressões de resultado inteiro, o exercício passou a exigir o
que dizia avaliar. Pergunta a fazer: depois de resolver os pares fáceis, o difícil ainda tem
concorrente?

**Os distratores têm de ser indistinguíveis das corretas pela forma.** De nada adianta o
distrator ser plausível se ele se denuncia pelo molde. Caso real: as quatro direitas corretas
descreviam efeitos observados pela equipe ("os dois continuam no ar", "o artefato volta a ser
executado") e os dois distratores começavam com sujeito de mecanismo interno ("um tradutor
converte…", "cada processo recebe uma cópia dedicada do kernel…"). Categoria diferente, e o
aluno descarta os dois sem saber nada do assunto. Mesmo sujeito, mesmo tempo verbal, mesmo
comprimento, mesmo nível de abstração — em corretas e distratores.

**Nenhuma direita pode ecoar palavra da esquerda.** Isto é parente da regra da tradução, mas
o eco vem do enunciado e não do nome. Caso real: a situação dizia "o roteiro tem 40 passos
manuais" e a direita certa dizia "os passos passam a ser um arquivo de texto"; "exige a versão
3.8 e outro a 3.12" casava com "os dois continuam no ar lado a lado". Quatro pares fechados só
casando palavra, sem saber o que a tecnologia faz. Descreva o efeito com vocabulário que não
apareça na coluna oposta.

**A direita não pode ser a tradução do nome da esquerda.** \`pip list --outdated\` → "mostra o
que está desatualizado", \`df.head(3)\` → "as três primeiras linhas", \`deactivate\` → "desativa
o ambiente": nesses casos o exercício mede inglês, não o tópico. Descreva o **comportamento
observável** — o que muda depois de rodar, que tipo volta, o que acontece no caso de borda.
"Depois dele, \`pip list\` mostra pacotes que não estavam lá" exige ter usado a ferramenta;
"instala as dependências" exige ler a palavra install.

**resposta-expressao** — o aluno escreve uma expressão matemática e a correção compara por
**equivalência simbólica**, não por texto: \`2*x\`, \`x*2\` e \`x+x\` são a mesma resposta.
Serve para derivada, integral, limite, simplificação algébrica — qualquer coisa cuja
resposta seja uma expressão.

Preencha \`expressao_gabarito\` em sintaxe sympy (\`**\` para potência, \`*\` explícito,
\`sqrt\`, \`log\`, \`sin\`), e \`variaveis\` com os símbolos usados. Uma variável aceita
suposição de domínio no formato \`x:positive\` — sem ela, sympy não simplifica
\`sqrt(x**2)\` para \`x\`, e o aluno que responder assim é reprovado. Declare a suposição
sempre que o enunciado a implicar.

**Os três campos de verificação são o que torna este tipo o mais confiável do conjunto.**
Eles mandam o sympy **recalcular o gabarito por conta própria**:

- \`verificacao_origem\` — a expressão de partida (o integrando, a função a derivar)
- \`verificacao_operacao\` — \`diff\`, \`integrate\`, \`simplify\` ou \`nenhuma\`
- \`verificacao_variavel\` — a variável da operação

Aplicando a operação à origem, o resultado tem de bater com o seu gabarito. Se não bater, o
gabarito está errado e o exercício reprova — sem julgamento nenhum. Use \`nenhuma\` só
quando a conta não couber nessas três operações; um exercício sem verificação depende do seu
gabarito estar certo, que é exatamente o que não dá para supor.

Em integral, escrever \`+ C\` é aceito: a comparação ignora termo sem a variável de
integração.

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

5. **Plausibilidade destoante.** Parente do absurdo óbvio, mas por mecanismo: se as erradas
   inventam comportamento mágico ("traduz chamadas em tempo de execução", "obriga o servidor
   a trocar de distribuição") e a correta é a única afirmação sóbria, quem não estudou marca
   a sóbria. Cada errada precisa descrever algo que **existe** em algum lugar, aplicado ao
   caso errado.
6. **Molde sintático.** Se três erradas seguem a mesma fôrma ("X, para que Y") e a correta
   não, a diferente se destaca sem mérito. Idem quando a pergunta é plural e a correta é a
   única que enumera vários itens: o aluno escolhe a mais abrangente por hábito. Varie a
   fôrma entre as erradas, ou aplique a mesma à correta.

O teste final: um aluno esperto que **não estudou o tópico** consegue eliminar as erradas só
pela forma? Se consegue, refaça. **Quatro destes traços são conferidos por cálculo, de graça,
antes de qualquer chamada:** correta destacadamente mais longa que toda errada; absoluto
presente só de um lado; correta ecoando muito mais vocabulário do enunciado que qualquer
errada; erradas todas começando com a mesma fórmula e a correta não. Separação estrita em
qualquer um dos quatro reprova na estrutura.

## A dica socrática, em qualquer tipo

Aponta o que examinar; não resolve. Se lida sozinha, não pode permitir acertar. Numa questão
de alternativas, ela não deve descartar o distrator mais forte — isso reduz a escolha a duas.

**A dica não pode oferecer um critério que contradiga o gabarito.** É o defeito mais caro do
conjunto, porque reprova exatamente quem domina o assunto e confia na orientação da escola.
Caso real: a dica mandava "verifique se a afirmação promete algo entre ferramentas ou entre
hardwares", sugerindo que promessa entre ferramentas é verdadeira — e uma das alternativas
marcadas como errada era precisamente uma promessa entre ferramentas. Quem aplicasse a
heurística oferecida erraria o conjunto. Depois de escrever a dica, aplique-a a **cada**
alternativa e confira se o resultado bate com o gabarito.
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
            armadilha: {
              type: 'string',
              description:
                'só ordenacao: qual par de passos vizinhos o aluno desatento inverte, e por que inverter dá errado. Sem isso o exercício mede cronologia de senso comum.',
            },
            pares: {
              type: 'array',
              description: 'só associacao: duplas que se emparelham um a um',
              items: {
                type: 'object',
                properties: {
                  esquerda: { type: 'string' },
                  direita: { type: 'string' },
                },
                required: ['esquerda', 'direita'],
                additionalProperties: false,
              },
            },
            distratores_direita: {
              type: 'array',
              description:
                'só associacao: 1 ou 2 itens da coluna da direita que não emparelham com nada, para o último par não sair por eliminação',
              items: { type: 'string' },
            },
            expressao_gabarito: { type: 'string', description: 'só resposta-expressao: a resposta em sintaxe sympy' },
            variaveis: {
              type: 'array',
              description: 'só resposta-expressao: símbolos usados, opcionalmente "nome:suposicao"',
              items: { type: 'string' },
            },
            verificacao_origem: { type: 'string', description: 'só resposta-expressao: expressão de partida' },
            verificacao_operacao: { type: 'string', enum: ['diff', 'integrate', 'simplify', 'nenhuma'] },
            verificacao_variavel: { type: 'string' },
            dica_socratica: { type: 'string' },
          },
          required: [
            'topico', 'tipo', 'dificuldade', 'enunciado', 'linguagem', 'esqueleto',
            // Todo campo é obrigatório, com valor vazio quando não se aplica ao tipo. Campo
            // opcional aqui vira campo omitido na resposta, e `conferir` exige `armadilha`
            // em ordenacao e `distratores_direita` em associacao — os dois ficaram de fora
            // ao serem acrescentados, o que reprovaria na estrutura todo exercício desses
            // dois tipos, justamente os que sustentam os 24 cursos de infra.
            'testes', 'codigo_dado', 'resposta', 'alternativas', 'itens', 'armadilha', 'pares',
            'distratores_direita', 'expressao_gabarito', 'variaveis',
            'verificacao_origem', 'verificacao_operacao', 'verificacao_variavel', 'dica_socratica',
          ],
          additionalProperties: false,
        },
      },
    },
    required: ['exercicios'],
    additionalProperties: false,
  };
}

/* Pistas de forma: o gabarito se denuncia sem que o aluno saiba o assunto.
 *
 * Isto substitui uma sonda que pedia a um modelo para "responder sem usar conhecimento do
 * assunto". Ela acertou o gabarito em 9 de 9 e reprovou o curso inteiro: um modelo não
 * consegue suspender o que sabe, então inventa uma justificativa de forma para a resposta
 * em que já acredita — num caso chegou a notar um absoluto na alternativa correta e a
 * argumentar que "vinha qualificado" para poder incluí-la. Sonda que precisa responder
 * sempre responde, e vira opinião com outro nome.
 *
 * As heurísticas que ela listava são computáveis, e computadas não confabulam. Todas exigem
 * SEPARAÇÃO ESTRITA entre corretas e erradas — o tell só existe quando dá para separar os
 * dois grupos por aquele traço sozinho. */
const ABSOLUTOS = /\b(sempre|nunca|jamais|somente|apenas|qualquer|nenhum[a]?|todo[as]?|impossível|garante|garantem|dispensa|elimina|impede|obriga)\b/i;
const IRRELEVANTES = new Set(['para', 'como', 'quando', 'porque', 'entre', 'sobre', 'depois', 'antes', 'mesmo', 'mesma', 'pode', 'podem', 'ser', 'seu', 'sua', 'que', 'com', 'dos', 'das', 'uma', 'este', 'esta', 'esse', 'essa', 'pelo', 'pela', 'mais', 'menos']);

const palavras = (s) =>
  new Set(
    String(s)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .match(/[a-z_]{5,}/g) ?? [],
  );

export function pistasDeForma(e) {
  const p = [];
  const certas = (e.alternativas ?? []).filter((a) => a.correta);
  const erradas = (e.alternativas ?? []).filter((a) => !a.correta);
  if (!certas.length || !erradas.length) return p;

  // 1. Comprimento: toda correta mais longa que toda errada (ou o contrário).
  const cL = certas.map((a) => a.texto.length);
  const eL = erradas.map((a) => a.texto.length);
  if (Math.min(...cL) > Math.max(...eL) * 1.25)
    p.push(`pista de forma: toda correta é >25% mais longa que toda errada (${Math.min(...cL)} vs ${Math.max(...eL)})`);
  if (Math.max(...cL) * 1.25 < Math.min(...eL))
    p.push(`pista de forma: toda correta é bem mais curta que toda errada (${Math.max(...cL)} vs ${Math.min(...eL)})`);

  // 2. Absolutos: presentes só de um lado. Quem faz prova descarta por hábito.
  const cAbs = certas.filter((a) => ABSOLUTOS.test(a.texto)).length;
  const eAbs = erradas.filter((a) => ABSOLUTOS.test(a.texto)).length;
  if (cAbs === 0 && eAbs === erradas.length && erradas.length >= 2)
    p.push(`pista de forma: todas as ${erradas.length} erradas têm absoluto ("sempre", "nunca", "só"…) e nenhuma correta tem`);
  if (eAbs === 0 && cAbs === certas.length && certas.length >= 2)
    p.push('pista de forma: só as corretas têm absoluto');

  // 3. Eco léxico: a correta repete o vocabulário do enunciado mais que qualquer errada.
  const alvo = palavras(e.enunciado);
  const eco = (a) => [...palavras(a.texto)].filter((w) => alvo.has(w) && !IRRELEVANTES.has(w)).length;
  const cEco = certas.map(eco);
  const eEco = erradas.map(eco);
  // Margem de 1 palavra é ruído: calibrado contra os 48 exercícios escritos à mão, o limiar
  // de +1 acusava 2 questões que o crítico havia aprovado. Exige-se vantagem de 3.
  if (Math.min(...cEco) >= 3 && Math.min(...cEco) >= Math.max(...eEco) + 3)
    p.push(`pista de forma: toda correta ecoa muito mais palavras do enunciado que qualquer errada (${Math.min(...cEco)} vs ${Math.max(...eEco)})`);

  // 4. Molde sintático: as erradas começam todas igual e a correta não.
  const inicio = (a) => a.texto.toLowerCase().replace(/[`*]/g, '').trim().split(/\s+/).slice(0, 2).join(' ');
  const moldes = new Set(erradas.map(inicio));
  if (erradas.length >= 3 && moldes.size === 1 && !certas.some((a) => inicio(a) === [...moldes][0]))
    p.push(`pista de forma: as ${erradas.length} erradas começam todas com "${[...moldes][0]}" e nenhuma correta começa assim`);

  return p;
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

  if (e.tipo === 'quiz' || e.tipo === 'multipla-escolha') p.push(...pistasDeForma(e));

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
  } else if (e.tipo === 'resposta-expressao') {
    if (vazio(e.expressao_gabarito)) p.push('resposta-expressao sem expressao_gabarito');
    if (!(e.variaveis?.length)) p.push('resposta-expressao sem variaveis declaradas');
    const op = e.verificacao_operacao;
    if (!['diff', 'integrate', 'simplify', 'nenhuma'].includes(op)) p.push(`verificacao_operacao inválida: ${op}`);
    if (op && op !== 'nenhuma') {
      if (vazio(e.verificacao_origem)) p.push('verificação sem origem');
      if (vazio(e.verificacao_variavel)) p.push('verificação sem variável');
      const nomes = (e.variaveis ?? []).map((v) => String(v).split(':')[0].trim());
      if (e.verificacao_variavel && !nomes.includes(e.verificacao_variavel))
        p.push(`variável da verificação ("${e.verificacao_variavel}") não está em variaveis`);
    }
    naoDeveTer('alternativas', e.alternativas?.length, 'alternativas');
    naoDeveTer('testes', e.testes?.length, 'testes');
    naoDeveTer('itens', e.itens?.length, 'itens');
    naoDeveTer('pares', e.pares?.length, 'pares');
  } else if (e.tipo === 'associacao') {
    const n = e.pares?.length ?? 0;
    if (n < 4) p.push(`associacao com ${n} pares (mínimo 4)`);
    if (n > 6) p.push(`associacao com ${n} pares (máximo 6)`);
    const esq = (e.pares ?? []).map((x) => x.esquerda);
    const dir = (e.pares ?? []).map((x) => x.direita);
    // Coluna repetida significa mais de um gabarito possível.
    if (new Set(esq).size !== n) p.push('associacao com item repetido na esquerda');
    if (new Set(dir).size !== n) p.push('associacao com item repetido na direita');
    if ([...esq, ...dir].some(vazio)) p.push('associacao com item vazio');
    // Sem distrator, N contra N faz o último par sair por eliminação: o aluno acerta um
    // item que nunca avaliou.
    const dist = e.distratores_direita ?? [];
    if (dist.length < 1) p.push('associacao sem distrator na coluna da direita (mínimo 1)');
    if (dist.length > 2) p.push(`associacao com ${dist.length} distratores (máximo 2)`);
    if (dist.some(vazio)) p.push('associacao com distrator vazio');
    if (dist.some((x) => dir.includes(x))) p.push('associacao com distrator igual a uma direita correta');
    if (new Set(dist).size !== dist.length) p.push('associacao com distrator repetido');
    naoDeveTer('alternativas', e.alternativas?.length, 'alternativas');
    naoDeveTer('testes', e.testes?.length, 'testes');
    naoDeveTer('itens', e.itens?.length, 'itens');
  } else if (e.tipo === 'ordenacao') {
    const n = e.itens?.length ?? 0;
    if (n < 4) p.push(`ordenacao com ${n} itens (mínimo 4)`);
    if (n > 7) p.push(`ordenacao com ${n} itens (máximo 7)`);
    if (new Set(e.itens ?? []).size !== n) p.push('ordenacao com itens repetidos');
    if ((e.itens ?? []).some(vazio)) p.push('ordenacao com item vazio');
    // Sem armadilha nomeada, o exercício mede cronologia de senso comum: 3 de 3 reprovaram
    // assim na primeira rodada real.
    if (vazio(e.armadilha)) p.push('ordenacao sem armadilha declarada (qual par vizinho o aluno inverte, e por quê)');
    // Referência ao passo anterior entrega a posição pelo texto, fora de qualquer ordem.
    const ANAFORA = /\b(esse|essa|esses|essas|este|esta|estes|estas|isso|nele|nela|dele|dela|o mesmo|a mesma|anterior)\b/i;
    for (const [i, item] of (e.itens ?? []).entries()) {
      if (ANAFORA.test(item)) p.push(`ordenacao: o passo ${i + 1} referencia outro ("${item.match(ANAFORA)[0]}") e entrega a posição`);
    }
    naoDeveTer('alternativas', e.alternativas?.length, 'alternativas');
    naoDeveTer('testes', e.testes?.length, 'testes');
    naoDeveTer('pares', e.pares?.length, 'pares');
  }

  if (e.tipo !== 'associacao' && e.pares?.length) p.push(`${e.tipo} com pares preenchido`);
  if (e.tipo !== 'associacao' && e.distratores_direita?.length) p.push(`${e.tipo} com distratores_direita preenchido`);
  if (e.tipo !== 'ordenacao' && !vazio(e.armadilha)) p.push(`${e.tipo} com armadilha preenchida`);
  if (e.tipo !== 'resposta-expressao' && !vazio(e.expressao_gabarito)) p.push(`${e.tipo} com expressao_gabarito preenchido`);

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
  if (e.tipo === 'associacao') return `${e.pares?.length ?? 0} pares`;
  if (e.tipo === 'resposta-expressao') return e.verificacao_operacao ?? '';
  if (e.tipo === 'saida-esperada') return e.linguagem;
  return '';
}

/* Leitura humana de um exercício.
 *
 * A revisão por uma pessoa é o único sinal externo deste pipeline — todo o resto é o mesmo
 * modelo julgando a si mesmo. Enquanto o conteúdo só existisse como JSON, esse sinal ficava
 * bloqueado por atrito de formato.
 */
export function renderizar(e, n) {
  const L = [];
  L.push(`${'─'.repeat(78)}`);
  L.push(`#${n}  ${e.tipo}  ·  ${e.dificuldade}  ·  ${e.topico}`);
  L.push('');
  L.push(e.enunciado);
  L.push('');
  const marca = (c) => (c ? '  [X] ' : '  [ ] ');
  if (e.tipo === 'quiz' || e.tipo === 'multipla-escolha') {
    for (const a of e.alternativas) {
      L.push(marca(a.correta) + a.texto);
      L.push(`        ↳ ${a.porque}`);
    }
  } else if (e.tipo === 'saida-esperada') {
    L.push(`  código (${e.linguagem}):`);
    for (const l of e.codigo_dado.split('\n')) L.push('    ' + l);
    L.push(`  resposta esperada:`);
    for (const l of e.resposta.replace(/\n$/, '').split('\n')) L.push('    ' + l);
  } else if (e.tipo === 'codigo') {
    L.push(`  esqueleto (${e.linguagem}):`);
    for (const l of e.esqueleto.split('\n')) L.push('    ' + l);
    L.push(`  casos de teste:`);
    for (const t of e.testes) L.push(`    ${t.descricao}: ${JSON.stringify(t.entrada)} → ${JSON.stringify(t.saida_esperada)}`);
  } else if (e.tipo === 'ordenacao') {
    L.push('  ordem correta (o portal embaralha):');
    for (const [i, t] of e.itens.entries()) L.push(`    ${i + 1}. ${t}`);
    L.push(`  armadilha: ${e.armadilha}`);
  } else if (e.tipo === 'associacao') {
    L.push('  pares corretos:');
    for (const p of e.pares) L.push(`    ${p.esquerda}  ↔  ${p.direita}`);
    L.push('  distratores na direita (não emparelham com nada):');
    for (const d of e.distratores_direita ?? []) L.push(`    · ${d}`);
  } else if (e.tipo === 'resposta-expressao') {
    L.push(`  gabarito: ${e.expressao_gabarito}`);
    L.push(`  conferido por: ${e.verificacao_operacao}(${e.verificacao_origem}, ${e.verificacao_variavel})`);
  }
  L.push('');
  L.push(`  dica: ${e.dica_socratica}`);
  if (e._critica?.length) {
    L.push('');
    for (const c of e._critica) L.push(`  [${c.gravidade}/${c.dimensao}] ${c.explicacao}`);
  }
  return L.join('\n');
}
