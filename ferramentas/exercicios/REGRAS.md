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

O que **não** deve entrar num prompt de reconstrução: os exercícios de Python, os números de
custo desta conta de API, e os nomes de arquivo. São desta instância, não do problema.

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

O que isso **não** estabelece, e é hoje a pergunta mais cara: se o crítico **rejeita** bem. Uma
rodada gerada deu 0 de 11 e outra 6 de 12; se parte dessas rejeições for injusta, o pipeline
queima dinheiro e descarta conteúdo bom, e nenhuma sonda avisaria. O teste espelho — revisar
rejeitados e perguntar se a rejeição se sustenta — é grátis e ainda não foi feito.

Amostra de 3 é pequena, e os três eram escritos à mão, não gerados.

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
- **Resultado não pode depender de quem respondeu primeiro.** As chamadas concorrentes voltam
  na ordem da entrada; conferido que `--paralelo 1` e `--paralelo 8` produzem JSON idêntico.
- **Conteúdo é versionado; derivado de rodada, não.** `exercicios-<curso>.json` custou revisão
  para existir; `.validado`, `.criticado` e afins se refazem rodando de novo.
- **Uma dependência não declarada é falha de ambiente disfarçada de defeito de conteúdo.** Por
  isso nenhum exercício importa `pandas` ou usa rede: reprovaria numa máquina limpa por
  motivo que não tem nada a ver com o exercício.

## 7. O que ainda não é regra

Sabido, ainda não resolvido:

- **Realimentar a crítica no gerador.** Hoje o exercício rejeitado é descartado; refazer com a
  crítica em mãos sai mais barato que gerar do zero.
- **Deduplicação entre tópicos vizinhos.**
- **As pistas de forma cobrem quatro traços, e o juiz aponta outros.** Categoria destoante e
  plausibilidade exótica ainda são só prosa e julgamento; mecanizá-las exige medir semântica,
  não texto.
- **O gerador ignora regra em prosa quando ela é longa.** As regras de distrator existiam e
  foram desobedecidas em 2 dos 12 exercícios do Docker. O padrão até aqui: regra que vira
  conferência mecânica ou sonda passa a ser respeitada; regra que fica só no prompt é
  respeitada às vezes. Considerar isso antes de acrescentar prosa.
