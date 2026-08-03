# Regras consolidadas

Registro canônico do que este pipeline aprendeu. Cada regra traz **o defeito que a originou**
e **onde ela é aplicada** — sem essas duas colunas a regra vira folclore, e a primeira pessoa
que a achar inconveniente a remove.

Os prompts em `lib/tipos.mjs` e `lib/criticar.mjs` são a *implementação*. Este arquivo é a
*fonte*: se os dois divergirem, este manda.

> **Regra de ouro:** toda iteração melhora a ferramenta, não só o conteúdo. Defeito que pode
> se repetir noutro curso vira regra **antes** de o exercício ser corrigido.

## Como usar isto para gerar o software do zero

Este arquivo foi escrito para ser o insumo de um prompt único que reconstrói o pipeline em
qualquer linguagem. Para isso, ele precisa continuar respondendo três perguntas por regra:
o que exigir, por que (o defeito real), e em que camada a exigência mora — conferência
mecânica, prompt de geração, ou passe de crítica. Uma regra sem o "por que" não sobrevive à
tradução, porque quem reimplementa não sabe o que pode negociar.

O que **não** deve entrar num prompt de reconstrução: o catálogo desta escola, os números de
custo desta conta de API, e os nomes de arquivo. São desta instância, não do problema.

**Correção de uma exclusão que estava errada pela metade.** Este parágrafo dizia também "os
exercícios de Python". Vale para o papel deles de *conteúdo* — são de um curso específico e não
interessam a mais ninguém. Mas eles têm um segundo papel, **corpo de prova de calibração**, e
esse é do problema. Sem ele, as conferências mecânicas de uma reconstrução nascem sem limiar
aferido; a camada barulhenta incomoda, alguém afrouxa os limiares para calar o barulho, e a
camada de graça passa a existir sem acusar nada. Um prompt de reconstrução **anexa** um corpo
de prova revisado por pessoa, junto com os prompts na íntegra e o histórico de rodadas — ver
[`RECONSTRUIR.md`](RECONSTRUIR.md). Regra geral: o que evita repagar um aprendizado é do
problema, mesmo quando o arquivo em que ele mora é desta instância.

---

## 1. Conferência mecânica — reprova sem gastar API

Aplicada em `conferir()`, `lib/tipos.mjs`. É de graça, então roda sempre e primeiro.

| regra | defeito de origem |
| --- | --- |
| `quiz` tem exatamente 1 correta; `multipla-escolha` tem ≥2 e nunca todas | questão de ligação de argumentos tinha 3 corretas marcadas como 1 |
| toda alternativa tem `texto` e `porque` | — |
| `associacao`: 4 a 6 pares, sem item repetido em nenhuma coluna | coluna repetida significa mais de um gabarito |
| `associacao`: 1 ou 2 `distratores_direita`, distintos das direitas corretas | N contra N faz o último par sair por eliminação |
| `ordenacao`: 4 a 7 itens, sem repetido | — |
| `ordenacao`: `armadilha` obrigatória | 3 de 3 ordenações reprovaram por medir cronologia de senso comum |
| `ordenacao`: nenhum item pode conter anáfora (`esse`, `esta`, `anterior`…) | "executa **esse** bytecode" fixa a posição pelo texto |
| `quiz`/`multipla-escolha`: quatro pistas de forma, por cálculo | correta destacadamente mais longa; absoluto só de um lado; correta ecoando o enunciado muito mais que as erradas; erradas todas com a mesma fórmula inicial. Calibrado contra 48 exercícios escritos à mão: zero falso positivo |
| `quiz`/`multipla-escolha`: termo técnico do enunciado numa só alternativa | "o back-end **WSL2** falhou" com a única opção que diz WSL2: casamento de palavra fecha a questão. Só conta identificador (sigla ou termo com dígito) — a versão que aceitava qualquer palavra acusou "executar" e "marca" em exercícios bons |
| `quiz`/`multipla-escolha`: hedge só nas corretas | as 3 corretas todas ressalvadas e as 2 erradas categóricas: "qualificada = certa" fecha o conjunto exato |
| `quiz`/`multipla-escolha`: advérbio de incerteza numa só alternativa, a correta | "a única que se protege com um advérbio de incerteza (*provavelmente* precisam ser reescritos)" — o teste de hedge acima não pegou, porque exige duas corretas e esta questão tinha uma. Vocabulário mais estreito de propósito: só o que suaviza uma **afirmação**. Conectivo de contraste (`enquanto`, `mas`) é prosa normal e derrubava exercício bom dos 48 |
| `multipla-escolha`: marcar as ressalvadas e descartar as absolutas dá o gabarito exato | a heurística de prova simulada. Os outros testes perguntam se um traço separa os grupos; este pergunta o que decide a nota — a regra de quem não estudou produz o **conjunto exato**? Só vale de 2 corretas para cima: com uma só, acertar por acaso é fácil demais |
| `quiz`/`multipla-escolha`: dica que conta quantas são falsas | "duas delas erram" vira triagem de rótulos, sem avaliar item algum |
| `quiz`/`multipla-escolha`: eixo modal — corretas dizem o que **pode**, erradas o que **obriga** ou **garante** | "as três corretas são afirmações de possibilidade e as duas erradas de obrigação ou garantia total". Não é o teste de absolutos: `faz`, `atende`, `pode ser executada` não são absolutos e mesmo assim separam os grupos perfeitamente |
| `quiz`/`multipla-escolha`: molde sintático baixou de 3 erradas para **2** | as duas únicas alternativas abrindo com "A conformidade …" eram exatamente as duas erradas. Duas fórmulas iguais num conjunto de cinco revelam tanto quanto três; zero falso positivo nos 48 com o limiar novo |
| `associacao`: as esquerdas ecoam a própria direita | a regra "nenhuma direita pode ecoar palavra da esquerda" existia só em prosa e foi desobedecida. Mecanizada comparando, por par, o vocabulário dividido com a **própria** direita contra o dividido com as outras. Tolera **um** par de folga: exigir todos derrubava a conferência por um empate de vocabulário |
| `quiz`: duas ou mais palavras da dica numa alternativa só, a correta | "conte quantos **kernel** de **sistema operacional** estão carregados" com uma única opção que fala em kernel: casamento textual, não conceitual. Uma palavra não basta — `outro`, `valor` e `saída` caíram numa alternativa só por acaso em 3 dos 48. O enunciado não serve de fonte: divide vocabulário com todas as alternativas por construção |
| `associacao`: enunciado tem de avisar que sobram itens | quem não sabe tenta encaixar todos e força associação errada; pegou 3 dos 7 exercícios escritos à mão |
| `resposta-expressao`: variável da verificação tem de estar em `variaveis` | — |
| tipo X não pode trazer campos de tipo Y | — |

## 2. Execução — prova em vez de opinião

Aplicada em `lib/validar.mjs`.

- **`saida-esperada` executa o trecho** e compara byte a byte. É o tipo mais forte: defeito de
  semântica vira reprovação determinística. Origem: `-7 ** 2` exibido como `49`, correto para
  a variável e errado para o literal.
- **`codigo` escreve uma solução de referência às cegas**, sem ver os casos de teste, e roda
  contra eles. Concordar às cegas é evidência; discordar significa que enunciado ou gabarito
  erra, e o validador não adivinha qual. Origem: `\n` final faltando reprovava a solução
  correta em 6 casos.
- **`resposta-expressao` recalcula o gabarito com sympy** a partir de `verificacao_origem`.
  `verificacao_operacao: nenhuma` **reprova** — sem recálculo, ninguém conferiu.
- **Ambiente ausente sai com código 2, nunca reprova conteúdo.** Origem: `python3` fora do
  PATH virou "8 exercícios reprovados" e mandou caçar defeito no conteúdo. `ENOENT` chega com
  stderr vazio: nunca engolir a causa.
- **Nunca gravar solução de referência escrita por quem viu os casos de teste.** O campo
  `_solucao_referencia` é reaproveitado pelo validador; preenchê-lo com a solução do autor
  converte verificação independente em autoverificação, e o pipeline reporta "ok" sem nada
  ter sido conferido.

## 3. Autoria — o que o gerador precisa respeitar

Aplicada no prompt de `lib/tipos.mjs`.

**Ordem dos tópicos.** Exercício do tópico N só pode exigir o que os tópicos 1..N ensinaram.
Origem: exercício de "instalação e primeiro script" exigindo `strip()`, condicional e
f-string — passou 4/4 na validação, que é precisamente por que o crítico existe.

**Alternativas — quatro defeitos que apareceram em quase todo quiz gerado:** correta mais
longa que as erradas, distrator de enchimento, absolutos que quem faz prova descarta por
hábito, e erradas de uma categoria com a correta de outra.

**`codigo` — quatro perguntas antes de fechar:**

1. Existe solução que **ignora o tópico** e passa em todos os casos? Origem: exercício sobre
   argumento com valor padrão em que cravar `.2f` passava 5 de 5.
2. A **ferramenta natural do tópico** produz o seu gabarito? Origem: desempate alfabético num
   tópico de `collections`, quando `Counter.most_common` desempata por inserção — punia quem
   estudou.
3. Se o tópico é desempenho, **algum caso separa as classes**? Origem: casos de 3 elementos
   aprovavam o laço aninhado igual à solução linear num tópico de Big-O.
4. A dificuldade está no tópico ou em **ler a entrada**? Origem: "valores separados por
   espaço" convida a `split(" ")`, que devolve `[""]` em linha vazia e reprova quem dominava
   exceções.

**`saida-esperada`:** a dica **nunca** manda executar o trecho. Em todo outro tipo "rode e
observe" é boa dica socrática; aqui a resposta *é* a saída, então equivale a mandar copiar o
gabarito do terminal.

**`ordenacao`:** só existe quando há armadilha nomeável — qual par vizinho o aluno inverte e
por que inverter quebra. Se o autor não consegue nomeá-la, o exercício mede senso comum e
deve ser outro tipo.

**`associacao`:** a direita descreve **comportamento observável**, nunca traduz o nome da
esquerda (`pip list --outdated` ↔ "mostra o que está desatualizado" mede inglês). E o
distrator precisa **disputar com o par mais difícil** — um descartável de imediato não muda
nada, porque o par difícil continua saindo por eliminação.

**`resposta-expressao`:** declare suposição de domínio. Sem `x:positive`, o sympy não
simplifica `sqrt(x**2)` para `x` e reprova quem responder assim.

## 4. Crítica — comportamento acima de opinião

Aplicada em `lib/criticar.mjs`.

**Sonda vale mais que julgamento.** Pedir a um modelo que "avalie a qualidade" de um texto
escrito por outro modelo convida à concordância. Sonda observa comportamento.

- **Sonda cega** responde a questão sem ver qual alternativa está marcada.
- **Sonda da dica** tenta resolver vendo o enunciado, **o que o aluno vê** e a dica — nunca o
  gabarito. Origem: a sonda recebia só enunciado e dica, então num `saida-esperada` recebia
  "o que este trecho imprime?" **sem o trecho**; cega, aprovava tudo.

**Só peça a uma sonda aquilo que ela possa recusar a responder.** É a regra mais cara desta
base. Houve uma terceira sonda, "do chute", que respondia proibida de usar conhecimento do
assunto, só com heurística de prova. Ela acertou o gabarito em **9 de 9** e reprovou um curso
inteiro — 0 de 11 aprovados.

Um modelo não suspende o que sabe: ele fabrica uma justificativa de forma para a resposta em
que já acredita. Num caso notou um absoluto na alternativa **correta**, argumentou que "vinha
qualificado" e a incluiu mesmo assim — racionalização até o alvo, não previsão. Sonda obrigada
a responder sempre responde, e vira opinião com outro nome, que é exatamente o que o desenho
do pipeline existe para evitar.

Foi removida, e as heurísticas que ela listava viraram cálculo em `pistasDeForma`. O contraste
é o argumento: a mesma rodada em que ela reprovou tudo teve uma conferência mecânica pegando
`"o mesmo"` num passo de ordenação, de graça e sem discussão.

**Divisão de competência entre sonda e juiz.** O juiz **não** julga se a dica entrega demais —
isso é da sonda. Opinião sobre dica erra sempre para o mesmo lado, porque toda dica útil
estreita o campo; sob a régua "isso muda quem passa?", nenhuma dica sobrevive. O juiz só
reporta dica **errada**: afirmação falsa, aponta o bloco errado, contradiz o enunciado.
Origem: 10 de 16 rejeições numa rodada eram o juiz achando dicas generosas, e nenhuma veio da
sonda.

**Régua da gravidade: "isso muda quem passa?"** Acertar por eliminação sem saber o assunto é
gravidade alta, não ressalva de redação. `baixa` só para o que não altera o resultado de
ninguém.

**Não julgado nunca vira aprovado.** Falha do passe de crítica reprova, depois de uma
repetição. Origem: erro de parse virava `gravidade: baixa` e o exercício passava sem ter sido
avaliado.

**O crítico precisa ver o exercício, não a serialização dele.** Origem: `JSON.stringify` no
gabarito rendeu 9 rejeições idênticas acusando "notação de string com aspas e `\n` escapado" —
o crítico julgava a formatação do prompt.

**O crítico precisa conhecer as convenções da escola**, senão reporta as decisões como
defeito: que `multipla-escolha` tem várias corretas de propósito, que a comparação despreza
espaço em branco no fim, e que o `porque` de cada alternativa é feedback pós-resposta e não
pista visível.

## 5. Calibração externa

Todo o resto deste pipeline é o mesmo modelo julgando a si mesmo. A execução ancora o que é
determinístico e as sondas medem comportamento, mas **"este exercício vale o tempo de um
aluno?" não tem resposta automática** — o crítico herda a noção de qualidade de quem escreve.

Por isso a revisão humana é registrada aqui, com data e escopo, em vez de ficar no histórico
de uma conversa.

**2026-08-03 — o dono do catálogo revisou 3 aprovados** (`codigo` de biblioteca padrão,
`associacao` de coleções, `saida-esperada` de deque) e os considerou publicáveis.

O que isso estabelece: **quando o crítico aprova, o resultado é enviável.** O risco de aprovar
lixo está baixo nesta amostra.

**2026-08-03 — o mesmo revisor leu rejeitados do curso de Docker** e concordou com as
críticas.

O que isso estabelece: o crítico **rejeita por motivo que se sustenta**. Somado ao item
anterior, a régua está calibrada nas duas direções — aprova o que é enviável e reprova o que
não é. Era o que faltava para escalar com alguma confiança.

**Limites destes dois registros.** Amostras pequenas. Os aprovados revisados eram escritos à
mão, não gerados. E concordar com uma crítica é mais fácil que discordar: quem lê o defeito
apontado tende a enxergá-lo. A calibração vale como ausência de desastre, não como prova de
precisão.

## 6. Processo

- **Toda iteração melhora a ferramenta.** Ver a regra de ouro.
- **Classifique cada achado** em artefato de ferramenta, defeito repetível ou defeito
  irrepetível, antes de corrigir qualquer coisa.
- **Confira por execução antes de aceitar.** Achado de agente não é verdade por decreto.
- **Instrumento novo se calibra contra corpo de prova conhecido antes de rodar em conteúdo
  novo.** A sonda do chute custou US$ 1,81 para revelar um defeito que os 48 exercícios já
  revisados teriam mostrado de graça. Quando as pistas de forma a substituíram, calibrar
  contra esses mesmos 48 custou zero e ajustou o limiar do eco léxico de +1 para +3.
- **O que a saída identifica tem de ser o exercício, não o progresso.** Com paralelismo os
  resultados terminam fora de ordem; um contador de conclusão impede cruzar um achado da
  crítica com a linha do arquivo, que é exatamente o trabalho da triagem.
- **Contabilize o custo antes de sair por erro.** Chamada truncada ou recusada é cobrada
  igual. Uma geração de 6 tópicos estourou `max_tokens`, produziu zero exercícios, e o
  relatório de custo saiu vazio — gasto silencioso é pior que gasto alto.
- **`max_tokens` limita pensamento e resposta juntos.** Com thinking adaptativo, um lote que
  cabia em 3 tópicos não cabe em 6. Ao estourar, divida o lote e refaça em vez de perder tudo.
- **Falha nunca sobrescreve o que deu certo.** Gerar zero exercícios chegou a renomear o
  arquivo bom e gravar um vazio por cima.
- **Resultado não pode depender de quem respondeu primeiro.** As chamadas concorrentes voltam
  na ordem da entrada; conferido que `--paralelo 1` e `--paralelo 8` produzem JSON idêntico.
- **Conteúdo é versionado; derivado de rodada, não.** `exercicios-<curso>.json` custou revisão
  para existir; `.validado`, `.criticado` e afins se refazem rodando de novo.
- **Uma dependência não declarada é falha de ambiente disfarçada de defeito de conteúdo.** Por
  isso nenhum exercício importa `pandas` ou usa rede: reprovaria numa máquina limpa por
  motivo que não tem nada a ver com o exercício.
- **A rodada tem de dizer sozinha se evoluiu.** Antes disso, responder "melhorou ou não?"
  exigia reler a saída inteira e comparar de cabeça com a rodada anterior — trabalho que se
  repetia a cada execução e que ninguém faz com honestidade quando está cansado. Agora cada
  ciclo completo grava uma linha em `historico.json` e imprime um veredito de três estados.

  O número do veredito **não é a taxa de aprovação**. Taxa muda com o curso, com o tópico e
  com a dificuldade sorteada, e sobe sozinha se o gerador ficar tímido. O que mede a
  ferramenta é a **divisão do trabalho**: quantos defeitos foram pegos por cálculo, de graça,
  contra quantos só apareceram depois de pagar a API. Cada regra que vira conta empurra
  defeito de uma coluna para a outra. Se essa proporção não anda ao longo das rodadas, as
  rodadas estão consertando conteúdo — que é o que a regra de ouro proíbe.

  Comparação só contra rodada do **mesmo curso**: docker contra python mediria o assunto.
- **Resgate não entra na taxa do veredito.** A primeira rodada com a volta de conserto ligada
  imprimiu `EVOLUIU — +34 pp`, e o gerador não tinha se movido um ponto: 4 de 9 de primeira
  passada contra 8 de 18, os dois 44%. Os 34 pp eram três exercícios comprados na reescrita.
  O veredito passou a medir a **primeira passada**; os resgatados aparecem numa linha separada,
  rotulados como aprovação comprada. Regra geral: **métrica que soma o que se pagou para
  consertar não mede a ferramenta, mede a fatura.**
- **Falta de dado não pode virar silêncio.** Na mesma rodada, o custo por aprovado subiu 25% e
  a linha nem apareceu, porque a rodada de referência fora registrada à mão sem o campo de
  custo. Comparação sem linha de base agora imprime o número e diz que não há com o que
  comparar — e o veredito carrega a ressalva. Um instrumento que se cala quando falta dado é
  pior que um instrumento ausente: ele passa por funcionando.
- **Calibração é regressão, não script descartável.** Cada conferência mecânica foi ajustada
  contra os 48 exercícios revisados à mão, num script escrito e jogado fora a cada rodada.
  Agora isso é `npm test`: os 48 não podem acusar nada, e cada regra guarda também o caso real
  que a motivou, nos dois sentidos. Afrouxar um limiar sem perceber quebra um teste em vez de
  passar despercebido — que foi como o eco léxico quase entrou com margem de +1.
- **Contabilidade de rodada se testa com função de mentira.** O funil em voltas é o ponto onde
  um erro não aparece na saída: resgatado contado como rejeitado, ou rejeitado contado duas
  vezes, produz um relatório plausível e falso ao fim de uma rodada que custou dólares. Por
  isso ele mora sozinho em `lib/funil.mjs` e roda inteiro sem tocar na API.

## 7. Tipos: um retirado, um em observação

**`ordenacao` saiu do gerador.** Seis geradas em quatro rodadas, **zero aprovadas**. Os
motivos mudaram todas as vezes — ordem ambígua, anáfora entre passos, passo que justifica a
própria posição, cronologia narrativa, e por fim dois passos independentes com armadilha
declarada factualmente errada. A regra foi endurecida três vezes sem mover o resultado, o
que era o critério de parada registrado aqui: **dimensão já codificada que reaparece é girar,
não evoluir.**

O tipo continua em `TIPOS` e continua validado — serve para conteúdo escrito à mão, onde um
autor pode provar que a armadilha existe. O que saiu é a geração automática, via
`TIPOS_GERAVEIS`. Critério para voltar: uma `ordenacao` escrita à mão passar pelo crítico
duas vezes seguidas.

**`multipla-escolha` entra em observação: 1 de 6 aprovadas** na rodada de 18, contra 6 de 8
do `quiz` no mesmo lote. A causa é estrutural, não de redação: com correção por conjunto
exato, **cinco alternativas são cinco chances de errar em vez de uma**, e basta um item
discutível para reprovar o exercício inteiro. Metade das rejeições daquela rodada foi disso —
alternativa que mistura conclusão verdadeira com mecanismo falso, gabarito verdadeiro só em
algumas distribuições, escopo do enunciado que não bate com o de uma alternativa.

Critério de decisão: se a taxa continuar abaixo da metade do `quiz` em mais duas rodadas, o
tipo passa a exigir que **cada alternativa seja verificável**, não apenas julgada — ou sai do
gerador como a `ordenacao`.

## 7b. Refazer o que caiu, sem ensinar para a prova

O exercício rejeitado deixou de ser descartado: volta ao gerador com o laudo em mãos e passa
pelo funil inteiro de novo. Ele já custou uma geração e uma crítica, e o defeito veio nomeado
— refazer é mais barato que gerar outro às cegas e torcer.

**O risco desta etapa é ensinar para a prova.** Reescrever até o juiz aprovar otimiza contra o
juiz, e juiz tem vício. Quatro coisas seguram isso, e nenhuma pode ser afrouxada sem substituir
por outra:

- **A reescrita volta pelo funil inteiro**, não só pela crítica. A conferência mecânica não
  muda de opinião nem se cansa, e a execução tampouco.
- **A sonda cega não lê a crítica.** Não há como agradá-la com redação: ou o gabarito é
  dedutível sem saber o assunto, ou não é.
- **Uma volta por padrão.** Subir `--refazer` é escolha explícita, e o custo por aprovado no
  veredito mostra se pagou.
- **Tipo e tópico ficam presos.** Trocar um `multipla-escolha` difícil por um `quiz` fácil
  resolveria a rejeição e falsificaria as duas medidas que mantêm o gerador honesto: cobertura
  do tópico e taxa por tipo. Reescrita que muda um dos dois é recusada sem entrar no funil.

Também recusadas: reescrita idêntica à original (gastar de novo para reprovar de novo) e
resposta vazia. E **o laudo diz que o defeito é fato e a sugestão de conserto é palpite** —
quem apontou o defeito não escreveu o exercício, e já aconteceu de a sugestão do crítico estar
errada enquanto o defeito estava certo.

**O que julgar depois de rodar:** se `resgatados` for alto e o custo por aprovado cair, a etapa
se paga. Se `resgatados` for alto e o custo por aprovado subir, a etapa está comprando
aprovação cara — e vale conferir à mão se os resgatados são mesmo bons, porque é exatamente a
forma que "ensinar para a prova" teria.

## 8. O que ainda não é regra

Sabido, ainda não resolvido:

- **Deduplicação entre tópicos vizinhos.**
- **As pistas de forma cobrem quatro traços, e o juiz aponta outros.** Categoria destoante e
  plausibilidade exótica ainda são só prosa e julgamento; mecanizá-las exige medir semântica,
  não texto.
- **O gerador ignora regra em prosa quando ela é longa.** As regras de distrator existiam e
  foram desobedecidas em 2 dos 12 exercícios do Docker. O padrão até aqui: regra que vira
  conferência mecânica ou sonda passa a ser respeitada; regra que fica só no prompt é
  respeitada às vezes. Considerar isso antes de acrescentar prosa.

  **A rodada de 18 do Docker confirmou isto de forma incômoda: das 9 rejeições, quase nenhuma
  trouxe causa nova.** Distrator que se denuncia pela forma, errada com mecanismo exótico,
  distrator de associação plausível para mais de uma esquerda, dica que entrega o critério —
  as quatro já estavam escritas no prompt. O gargalo deixou de ser *descobrir a regra* e
  passou a ser *fazê-la valer*. Isso muda o que conta como progresso: acrescentar prosa nova
  ao prompt tende a não mover nada, e as duas saídas que sobram são converter a regra em
  conta (feito para ressalva e para a dica) ou realimentar a crítica na regeneração.
