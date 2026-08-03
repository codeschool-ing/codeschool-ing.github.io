# Pipeline de exercícios

Gera, valida e critica exercícios auto-corrigíveis a partir dos tópicos do catálogo.
Substitui as três ferramentas separadas que existiam antes.

**As regras que este pipeline aplica, e o defeito que originou cada uma, estão em
[`REGRAS.md`](REGRAS.md).** Os prompts no código são a implementação; aquele arquivo é a
fonte. Regra nova entra lá primeiro — ver a regra de ouro no [`CLAUDE.md`](../../CLAUDE.md)
da raiz.

```
gerar  →  validar  →  criticar  ─┐
escreve   executa     julga      │
   ▲                             │
   └──────  refazer  ◀───────────┘
            o que caiu, com o laudo em mãos
```

O que reprova não é descartado: volta ao gerador com o defeito nomeado e passa pelo funil
inteiro de novo. Uma volta por padrão (`--refazer N`, `0` desliga).

No fim de cada ciclo completo a execução responde sozinha se a rodada evoluiu — ver
[o veredito](#a-rodada-evoluiu-ou-não).

## Rodar

```sh
cd ferramentas/exercicios
npm install
export ANTHROPIC_API_KEY=sk-ant-...

node exercicios.mjs python --max 3           # o ciclo inteiro
```

**O padrão é rodar tudo.** O alvo é um id de curso ou um arquivo `.json` — o script
distingue pelo sufixo e começa na etapa que faz sentido.

```sh
node exercicios.mjs python --max 3            # gera, valida e critica
node exercicios.mjs python --ate gerar        # só gera
node exercicios.mjs saida.json                # retoma: valida e critica
node exercicios.mjs saida.json --de criticar  # só critica
```

Retomar de um arquivo é o que torna barato corrigir um gabarito à mão e reconferir sem
regerar — e sem pagar de novo, porque a solução de referência fica salva no aprovado.

| opção | padrão |
| --- | --- |
| `--de` / `--ate` | `gerar` (ou `validar`, se o alvo é `.json`) até `criticar` |
| `--max N` | todos — **use `--max 3` na primeira vez**, custa centavos |
| `--lote N` | 6 tópicos por chamada |
| `--alternativas N` | 5 |
| `--timeout N` | 10 s por caso de teste |

Linguagens que o validador executa: **python**, **javascript** e **sql** (SQLite em memória).
| `--paralelo N` | 4 chamadas simultâneas |
| `--refazer N` | 1 volta de conserto do que reprovar (`0` desliga) |
| `--cegas` | escreve as alternativas sem saber quais são as corretas (**experimental**) |
| `--so-estrutura` | validar sem API nem execução (grátis) |
| `--so-sondas` | criticar sem o julgamento (mais barato) |
| `--seco` | gerar sem chamar a API |
| `--cursos` | lista os ids do catálogo |
| `--ver [N]` | lê os exercícios de um `.json` em forma humana |
| `--prompts` | grava `prompts.md` com todos os prompts na íntegra |
| `--alcance` | quanto das rejeições já pagas as conferências pegariam de graça |

O custo sai por etapa e somado, numa conta só.

### Antes de gastar

```sh
npm test        # conferências mecânicas, guardas da reescrita, contabilidade do funil
```

Roda em um segundo e não chama a API. Os 48 exercícios revisados à mão são o corpo de prova
permanente das conferências mecânicas: nenhuma pode acusar um deles, e cada uma guarda também
o caso real que a motivou. Afrouxar uma regra sem perceber quebra um teste em vez de passar
despercebido.

### A rodada evoluiu ou não?

Todo ciclo completo grava uma linha em `historico.json` e termina com um veredito de três
estados — `EVOLUIU`, `PAROU` ou `PIOROU`:

```
progresso — docker, contra a rodada de 2026-08-03 03:40
  aprovados ....... 8/18 (44%)   antes 8/18 (44%)   0 pp
  pegos de graça .. 1 de 10 (10%)   antes 0 de 10 (0%)   +10 pp
  custo/aprovado .. US$ 0.327   antes US$ 0.335   -2%
  causas pagas .... distratores 6 · dica 5 · gabarito 1

  EVOLUIU — a ferramenta pega 10 pp a mais dos defeitos sozinha, sem pagar API.
```

O número que decide **não é a taxa de aprovação**: ela muda com o curso e com o tópico, e sobe
sozinha se o gerador ficar tímido. O que mede a ferramenta é a divisão do trabalho — quantos
defeitos foram pegos por cálculo, de graça, contra quantos só apareceram depois de pagar a
API. Cada regra que vira conta empurra defeito de uma coluna para a outra.

A comparação é sempre com a rodada anterior **do mesmo curso**: docker contra python mediria
o assunto, não a ferramenta.

### Ler o que saiu

```sh
node exercicios.mjs exercicios-python.json --ver      # todos
node exercicios.mjs exercicios-python.json --ver 26   # só o de número 26
```

Mostra enunciado, corpo com o gabarito marcado, dica e — se o arquivo for um `.criticado` ou
`.rejeitado` — os achados da crítica.

**Isto existe porque a revisão por uma pessoa é o único sinal externo do pipeline.** Todo o
resto é o mesmo modelo julgando a si mesmo: as sondas ancoram parte, a execução prova outra
parte, mas "este exercício vale o tempo de um aluno?" não tem resposta automática. Enquanto o
conteúdo só existia como JSON, esse sinal ficava bloqueado por atrito de formato — e sinal que
custa esforço não é coletado.

### O que é versionado

`exercicios-<curso>.json` vai para o repositório: é conteúdo, custou dinheiro e revisão para
existir, e é a entrada de todo o resto. Os derivados de cada rodada — `.validado`,
`.reprovado`, `.criticado`, `.rejeitado` e as cópias com timestamp — ficam de fora, porque
se refazem rodando o pipeline sobre o mesmo arquivo. O `.gitignore` separa os dois pelo
segundo ponto no nome (`exercicios-*.*.json`).

## Paralelismo

As três etapas rodam com **4 chamadas simultâneas** por padrão (`--paralelo N`). O pipeline
passa quase todo o relógio esperando rede: um curso de 48 tópicos são ~200 exercícios, cada
um com até quatro chamadas em série. Em sequência isso são horas de espera.

O número entre colchetes é o **índice do exercício no arquivo**, não o progresso: com
paralelismo os resultados chegam fora de ordem, e um contador de conclusão não permitia achar
a linha correspondente no JSON. Por isso as linhas saem embaralhadas — é identidade, não
contagem. Vale para cruzar um achado da crítica com o exercício que o produziu.

**Os resultados voltam na ordem da entrada**, mesmo terminando fora de ordem — o arquivo
gerado não pode depender de quem respondeu primeiro, senão duas rodadas iguais produzem
arquivos diferentes. Conferido: `--paralelo 1` e `--paralelo 8` produzem JSON byte a byte
idêntico.

Suba o número se não bater rate limit; o SDK já repete 429 sozinho com recuo. Baixe para 1
quando quiser depurar um erro sem saída interleaved.

## Os sete tipos

| tipo | o aluno faz | corrigido por | serve para |
| --- | --- | --- | --- |
| `codigo` | escreve a solução | execução contra casos de teste | linguagem e ferramenta |
| `saida-esperada` | digita o que o trecho imprime | execução do próprio trecho | semântica, precedência, tipos |
| `quiz` | escolhe uma | comparação | conceito com uma leitura |
| `multipla-escolha` | escolhe várias | comparação de conjunto | conceito com vários aspectos |
| `ordenacao` | põe em ordem | comparação de sequência | processo, pipeline, ciclo de vida |
| `associacao` | emparelha duas colunas | comparação do mapeamento | comando e efeito, erro e causa, termo e definição |
| `resposta-expressao` | escreve uma expressão | **equivalência simbólica (sympy)** | derivada, integral, simplificação |

**`saida-esperada` é o tipo mais forte do conjunto.** O validador executa o trecho mostrado
e compara com o gabarito, então defeito de semântica vira reprovação determinística em vez
de depender de julgamento. Foi assim que o `-7 ** 2 = 49` — certo para a variável, errado
para o literal — passou a ser pego por execução.

**`ordenacao` existe pelas 24 disciplinas de infra e segurança**, onde o que se ensina é
ordem de operação e quase nada executa. Sem ele, esses cursos ficariam só com quiz.

**`associacao` é o mais versátil fora da programação.** O defeito que o define é ambiguidade:
se um item da direita puder ser defendido para duas entradas da esquerda, há mais de um
gabarito. A conferência estrutural rejeita coluna com item repetido; o crítico testa cada
direita contra todas as esquerdas.

**`resposta-expressao` é o único tipo cujo gabarito se prova.** Nos outros, a correção do
gabarito é evidência: a solução escrita às cegas concorda, o crítico não achou defeito. Aqui
o sympy **recalcula a resposta por conta própria** a partir da expressão de origem e compara.
Se divergir, o gabarito está errado — demonstrado, não julgado.

```
integral certa       ok       sympy recalcula e confere: x**3/3
integral ERRADA      REPROVA  gabarito "x**3/2", mas a verificação calcula "x**3/3"
```

Um exercício com `verificacao_operacao: nenhuma` **reprova**: sem recálculo, ninguém conferiu
o gabarito, e aprovar seria dar selo a algo não checado.

Comparação é por equivalência, não por texto: `2*x`, `x*2` e `x+x` são a mesma resposta. Em
integral, `+ C` é aceito — a diferença que não contém a variável de integração é a constante.

Cuidado com domínio: sem `x:positive` em `variaveis`, o sympy não simplifica `sqrt(x**2)`
para `x`, e o aluno que responder assim é reprovado. Declare a suposição quando o enunciado
a implicar.

### Reaproveitar noutra disciplina

Cinco dos sete tipos — `quiz`, `multipla-escolha`, `ordenacao`, `associacao`,
`resposta-expressao` — não pressupõem programação (a constante `TIPOS_NEUTROS` os marca).
Só `codigo` e `saida-esperada` dependem de interpretador.

Para **matemática** (cálculo, álgebra, vestibular), o conjunto já serve hoje:
`resposta-expressao` cobre o exercício central, `ordenacao` cobre método passo a passo,
`associacao` cobre função↔derivada, e os de alternativa cobrem o formato de prova.

O que ainda amarra o pipeline a este catálogo é `lib/catalogo.mjs`, que lê `assets/dados.js`
e espera os campos `topicos`, `ementa`, `nivel`. Para outra escola, é esse módulo que muda —
o resto viaja. Vale saber disso antes de acrescentar acoplamento novo em outros arquivos.

## As três etapas

**Gerar.** Recebe os tópicos do curso na ordem em que são ensinados e trata essa ordem como
restrição: exercício do tópico N só pode exigir o que os tópicos 1..N ensinaram. As regras de
alternativa cobrem os quatro defeitos que apareceram em quase todo quiz gerado — correta mais
longa que as erradas, distrator de enchimento, absolutos descartáveis por hábito de prova, e
erradas de uma categoria com a correta de outra.

**Validar.** Estrutura de graça, depois execução. Em `codigo`, escreve uma solução de
referência **sem ver os casos de teste** e roda contra eles: às cegas, concordar vira
evidência de que enunciado e gabarito descrevem a mesma coisa; discordar significa que um dos
dois erra, e o validador não adivinha qual. Em `saida-esperada`, executa o trecho direto.

**Criticar.** Duas sondas comportamentais e um julgamento. A sonda cega responde a questão sem
ver o gabarito; a sonda da dica tenta resolver vendo só o enunciado e a dica. Sonda vale mais
que opinião: pedir a um modelo que "avalie a qualidade" de um texto escrito por outro modelo
convida à concordância.

A régua da gravidade é uma pergunta só: **isso muda quem passa?** Acertar por eliminação sem
saber o assunto é gravidade alta, não ressalva de redação.

## Custo medido

Números reais, `claude-opus-5`, antes da unificação:

| etapa | por exercício |
| --- | --- |
| gerar | US$ 0,028 |
| validar | US$ 0,003 |
| criticar | US$ 0,067 – 0,077 |

Criticar custa ~2,5x gerar: são até três chamadas por exercício, cada uma raciocinando sobre
o exercício inteiro. **96% do gasto é token de saída**, então mexer em contexto ou caching
rende pouco — o que muda a conta é quantos exercícios por tópico.

## Segurança

**Executa código gerado por IA na sua máquina**, com timeout por caso e nada mais. Não rode
um JSON que você não gerou. Para volume, rode em contêiner descartável — que é como o portal
vai executar código de aluno de qualquer forma.

**`resposta-expressao` precisa de `sympy`** (`pip install sympy`). O script confere antes de
validar e sai com código 2 se faltar. É dependência opcional: só entra quando há exercício
desse tipo. O `sympify` roda sobre texto gerado pelo modelo — no portal, aplicado a texto de
**aluno**, exige parsing restrito e sandbox, porque é execução de código.

Linguagens: `python` e `javascript`. O script confere que os interpretadores existem antes de
validar e **sai com código 2** se faltar algum — sem isso, um `python3` ausente vira "todos os
exercícios reprovados" e manda caçar defeito no conteúdo. Códigos de saída: `0` tudo passou,
`1` algo reprovou, `2` o ambiente não permite validar.

## O que ainda falta

- **Realimentar a crítica no gerador**: hoje o exercício rejeitado é descartado. Com a régua
  nova a taxa de rejeição deve subir, e refazer com a crítica em mãos sai mais barato que
  gerar do zero.
- **Deduplicação** entre tópicos vizinhos.
- **Ingestão no portal**: sai um JSON solto; o banco é da Etapa 2.
