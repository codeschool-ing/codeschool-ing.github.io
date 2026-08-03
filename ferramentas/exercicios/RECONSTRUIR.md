# Prompt de reconstrução — pipeline de exercícios em Go

Rascunho do prompt único que reconstrói esta ferramenta do zero, em Go, sem herdar código.
Escrito a partir de [`REGRAS.md`](REGRAS.md), que continua sendo a fonte: se os dois
divergirem, aquele manda e este se atualiza.

**Não entrou aqui, de propósito:** o catálogo de cursos desta escola, os números de custo
desta conta de API e os nomes de arquivo da implementação em JavaScript. São desta instância,
não do problema.

**Como usar:** anexe os três arquivos da lista abaixo e copie tudo abaixo da linha para uma
sessão nova. O texto sozinho reconstrói a arquitetura e o processo; os anexos são o que evita
que a reconstrução repague o que este projeto já pagou.

### Os três anexos, e o que acontece sem cada um

| anexo | arquivo | papel | sem ele |
| --- | --- | --- | --- |
| corpo de prova | `exercicios-python.json` (48 exercícios, 81 KB) | calibração das conferências mecânicas | elas nascem barulhentas, quem implementa afrouxa os limiares para calar o barulho, e a camada de graça passa a existir sem acusar nada — o pior desfecho possível |
| prompts na íntegra | `prompts.md` (8 prompts, ~4.300 palavras) | texto acumulado de autoria e crítica | a seção "O que o prompt de autoria precisa exigir" tem ~490 palavras e é um resumo. O que some no resumo são os casos trabalhados, e regra abstrata é obedecida às vezes enquanto caso concreto é obedecido |
| histórico de rodadas | `historico.json` | linha de base do veredito | as primeiras rodadas imprimem "primeira rodada deste curso" e não respondem se a ferramenta evoluiu, que é a pergunta que o veredito existe para responder |

`prompts.md` é gerado por `node exercicios.mjs --prompts` e versionado. Dois testes o mantêm
honesto: um confere que o arquivo bate com os prompts do código, e outro varre o código atrás
de prompt exportado que não esteja no anexo — a falha que importa não é o arquivo velho, é o
prompt novo que o pipeline passa a usar sem ninguém lembrar de registrar.

Sobre o primeiro: os exercícios têm **dois papéis**, e só um deles é desta instância. Como
*conteúdo*, são de um curso específico e não interessam a mais ninguém. Como *corpo de prova*,
são a única defesa contra falso positivo em conferência mecânica, e isso é do problema. Anexe
qualquer conjunto de exercícios que uma pessoa tenha revisado e considerado bons — os desta
base servem, os seus servem melhor. O que não serve é nenhum.

---

## O que construir

Um programa de linha de comando, em Go, que **gera, verifica e critica exercícios de
programação auto-corrigíveis** a partir de uma ementa de curso, usando um modelo de linguagem
de fronteira com saída estruturada.

Não é um gerador de conteúdo com verificação opcional. É **um funil de reprovação** que por
acaso também escreve. Escrever é a parte barata e já resolvida; o valor inteiro está em
descobrir, antes de um aluno perder tempo, que o exercício não mede o que promete.

O programa roda contra dezenas de cursos e centenas de tópicos, e cada chamada custa dinheiro.
Duas consequências mandam em todo o desenho: **o que pode ser conferido por cálculo nunca pode
custar uma chamada**, e **toda rodada precisa dizer sozinha se a ferramenta melhorou**.

## O problema real, para você não otimizar a coisa errada

Um modelo escreve exercícios plausíveis com muita facilidade. Quase todos têm um defeito que
só aparece quando alguém tenta responder:

- a alternativa correta é a mais longa, ou a única com ressalva, ou a única sem "sempre" —
  e um aluno que nunca estudou o assunto acerta por hábito de prova;
- o enunciado promete medir um conceito e existe uma solução que ignora o conceito e passa em
  todos os casos de teste;
- a dica não aponta o que examinar: entrega o critério de decisão já aplicado ao caso;
- o gabarito está errado de um jeito que só a execução revela;
- a ferramenta natural do tópico produz resultado diferente do gabarito, então o exercício
  **pune quem estudou**.

Nada disso aparece lendo o exercício com boa vontade, que é exatamente o que um modelo faz
quando você pede para ele "avaliar a qualidade". Por isso o programa não pergunta opinião:
mede comportamento e calcula o que dá para calcular.

## Princípios inegociáveis

Estes cinco vieram de defeitos que custaram dinheiro. Se algum atrapalhar a implementação,
resolva de outro jeito — não os remova.

1. **Grátis antes de pago.** Conferência que é aritmética roda primeiro, sempre, e reprova
   sem chamar a API. Regra que vira cálculo passa a ser obedecida; regra que fica só no
   prompt é obedecida às vezes.
2. **Prova antes de julgamento.** Se dá para executar e comparar, execute e compare. Opinião
   é o último recurso, não o primeiro.
3. **Oráculo cego.** Quem verifica não vê o gabarito. A solução de referência é escrita sem
   ver os casos de teste; a sonda responde sem ver o que está marcado como certo. Concordância
   às cegas é evidência; concordância de quem viu a resposta não é nada.
4. **Sonda em vez de nota.** Nunca peça "dê uma nota de 1 a 5". Peça um comportamento
   observável — *responda esta questão*, *resolva com esta dica* — e compare com o gabarito.
5. **Só peça a uma sonda o que ela possa recusar.** Uma sonda obrigada a responder sempre
   responde, e vira opinião com outro nome. Ver o caso da sonda do chute, mais abaixo: é a
   regra mais cara desta base.

## Entrada

Uma ementa de curso: identificador, nome, descrição, público, e uma **lista ordenada de
tópicos**. A ordem é restrição semântica, não decoração — exercício do tópico N só pode exigir
o que os tópicos 1..N já ensinaram.

Formato: o que for conveniente (JSON é suficiente). O programa lista os cursos disponíveis e
aceita um deles pelo identificador, ou um arquivo de exercícios já gerado, para retomar sem
regerar. Retomar é o que torna barato corrigir um gabarito à mão e reconferir.

## Os sete tipos de exercício

Todos compartilham: tópico declarado, dificuldade, enunciado e **dica socrática**.

| tipo | o aluno faz | como corrige |
| --- | --- | --- |
| `codigo` | completa um esqueleto | executa contra casos de teste, compara stdout |
| `saida-esperada` | digita o que o trecho imprime | executa o trecho, compara byte a byte |
| `quiz` | escolhe uma alternativa | exatamente 1 correta |
| `multipla-escolha` | escolhe várias | **conjunto exato**: errar um item reprova tudo |
| `ordenacao` | ordena passos embaralhados | sequência exata |
| `associacao` | liga colunas | conjunto exato de pares, com distratores à direita |
| `resposta-expressao` | escreve uma expressão matemática | equivalência simbólica via CAS |

Cada alternativa carrega um `porque`, que é **feedback pós-resposta** e nunca pista visível.

Dois avisos com história:

- **`ordenacao` não deve entrar na geração automática.** Nesta base foram seis geradas em
  quatro rodadas, zero aprovadas, com motivo diferente a cada vez. O tipo é válido para
  conteúdo escrito à mão, onde um autor prova que a armadilha existe. Implemente-o, valide-o,
  e deixe-o fora da lista de tipos geráveis até que uma escrita à mão passe pelo crítico duas
  vezes seguidas.
- **`multipla-escolha` é estruturalmente frágil.** Com correção por conjunto exato, cinco
  alternativas são cinco chances de errar em vez de uma, e um único item discutível reprova o
  exercício inteiro. Meça a taxa de aprovação por tipo desde a primeira rodada. Se ela ficar
  abaixo da metade da taxa do `quiz` por três rodadas, exija que **cada alternativa seja
  verificável** em vez de julgada, ou tire o tipo da geração.

## Camada 1 — conferência mecânica, de graça

Roda primeiro, sempre, sem rede. Cada item abaixo nasceu de um defeito real; o "porquê" é o
que permite a você negociar limiares sem destruir a regra.

**Estruturais**

- `quiz` tem exatamente 1 correta. `multipla-escolha` tem 2 ou mais e nunca todas.
- Toda alternativa tem texto e `porque`; campos de um tipo não aparecem em outro.
- `associacao`: 4 a 6 pares, sem item repetido em coluna nenhuma (repetição = mais de um
  gabarito), mais 1 ou 2 distratores à direita, distintos das direitas corretas. Sem
  distrator, N contra N faz o último par sair por eliminação.
- `associacao`: o **enunciado** precisa avisar que sobram itens. Quem não sabe disso tenta
  encaixar todos e força uma associação errada. A dica não serve para esse aviso — nem todo
  aluno a abre.
- `ordenacao`: 4 a 7 itens, sem repetido, com uma **armadilha declarada** pelo autor (qual par
  vizinho o aluno inverte, e por que inverter quebra). Nenhum item pode conter anáfora — "esse",
  "esta", "anterior" — porque "executa **esse** bytecode" fixa a posição pelo texto, não pelo
  entendimento.
- `resposta-expressao`: a variável usada na verificação tem de estar entre as declaradas.

**Pistas de forma** — todas em `quiz` e `multipla-escolha`, todas respondendo à mesma pergunta:
*um aluno esperto que não estudou consegue acertar só pela forma?*

| conferência | por que existe |
| --- | --- |
| toda correta destacadamente mais longa que toda errada (>25%), ou o contrário | o autor detalha a certa e despacha as erradas |
| absoluto ("sempre", "nunca", "apenas", "impossível") presente só de um lado | quem faz prova descarta absoluto por hábito, sem ler o mérito |
| toda correta ecoando muito mais vocabulário do enunciado que qualquer errada | casamento de palavra fecha a questão |
| um **identificador técnico** do enunciado presente em exatamente uma alternativa, a correta | contagem de palavras não pega este: o eco soma 1 e passa em qualquer limiar |
| todas as corretas com ressalva e nenhuma errada com ressalva | "qualificada = certa" é heurística tão boa quanto "absoluta = errada" |
| um **advérbio de incerteza** em exatamente uma alternativa, a correta | o caso de uma correta só, que a conferência anterior não cobre |
| em `multipla-escolha`: marcar as ressalvadas e descartar as absolutas produz **o gabarito exato** | é a heurística de prova simulada, e mede o que decide a nota |
| a dica informando **quantas** alternativas são falsas | vira triagem de rótulos: o aluno procura as duas da categoria citada e marca o resto |
| duas ou mais palavras da dica presentes em exatamente uma alternativa, a correta | a dica virou seta; casamento textual, não conceitual |

**Limiares já calibrados.** Todos foram ajustados contra um corpo de prova revisado à mão até
não acusarem nenhum exercício bom. Cada um tem um valor óbvio que **está errado** — se você
escolher o óbvio, vai colher o falso positivo que já foi pago aqui.

| conferência | limiar | o óbvio, e por que erra |
| --- | --- | --- |
| comprimento | menor correta > maior errada × 1,25 | sem margem, qualquer variação natural de redação acusa |
| eco léxico do enunciado | menor correta ≥ 3 palavras **e** ≥ maior errada **+ 3** | o óbvio é +1, e +1 acusou dois exercícios bons — vantagem de uma palavra é ruído |
| identificador técnico | só sigla (duas maiúsculas ou mais) ou termo com dígito | aceitar qualquer palavra acusa verbos comuns: "executar", "marca", "repetir" |
| palavras da dica | feixe de **2 ou mais** apontando para a mesma alternativa | uma palavra é coincidência: "outro", "valor" e "saída" caíram numa alternativa só, por acaso, em 3 de 48 |
| absoluto / ressalva por grupo | separação **estrita**: todas de um lado, nenhuma do outro, com ≥2 de cada lado | maioria não basta; acusa prosa normal |
| heurística de prova simulada | só com **2 corretas ou mais** | com uma correta só, o conjunto simulado bate por acaso com facilidade |
| advérbio de incerteza | exatamente 1 alternativa protegida, ≥4 alternativas no total | vocabulário largo demais derruba exercício bom — ver o cuidado 3 abaixo |
| molde sintático | ≥3 erradas com as mesmas **duas primeiras palavras**, e nenhuma correta assim | — |
| dica que conta quantas erram | número e palavra de veracidade a menos de ~60 caracteres um do outro | procurar os dois no texto inteiro acusa frase sem relação |

Calibre nos **dois sentidos**: nenhum falso positivo no corpo de prova, e um teste por regra
provando que ela ainda dispara no caso real que a motivou. Calibrar num sentido só produz uma
regra que não acusa nada, e ninguém percebe.

Quatro cuidados de calibração, cada um pago com um falso positivo real:

1. **Exija separação estrita** nas conferências de grupo (todas de um lado, nenhuma do outro).
   Maioria não basta; acusa prosa normal.
2. **Identificador técnico é sigla ou termo com dígito.** A versão que aceitava qualquer
   palavra acusou verbos comuns em exercícios bons.
3. **Separe "ressalva" de "conectivo de contraste".** Para a conferência do advérbio de
   incerteza use um vocabulário estreito — só o que suaviza uma *afirmação* ("provavelmente",
   "em geral", "tende a"). "Enquanto" e "mas" são prosa explicativa normal e derrubam
   exercício bom.
4. **Uma palavra em comum entre dica e alternativa é coincidência**; exija um feixe de duas ou
   mais apontando para a mesma alternativa. E não use o enunciado como fonte desse teste: ele
   divide vocabulário com todas as alternativas por construção.

## Camada 2 — execução, prova em vez de opinião

- **`saida-esperada`** executa o trecho e compara byte a byte com o gabarito. É o tipo mais
  forte do funil: erro de semântica vira reprovação determinística, sem discussão.
- **`codigo`** pede ao modelo uma **solução de referência escrita sem ver os casos de teste**,
  e roda essa solução contra eles. Concordar às cegas é evidência de que enunciado e casos
  descrevem a mesma coisa. Discordar significa que um dos dois erra, e o verificador não
  adivinha qual — reprova e mostra os dois lados.
- **`resposta-expressao`** recalcula o gabarito num CAS a partir de uma origem declarada.
  Exercício que declara "sem verificação" **reprova**: sem recálculo ninguém conferiu, e
  aprovar seria dar selo de qualidade a algo não checado.
- **Nunca grave como solução de referência algo escrito por quem viu os casos.** Isso converte
  verificação independente em autoverificação, e o programa passa a reportar "ok" sem nada ter
  sido conferido.
- **Ambiente ausente sai com código de erro próprio e nunca reprova conteúdo.** Interpretador
  fora do PATH já virou "oito exercícios reprovados" e mandou caçar defeito no conteúdo. Erro
  de execução chega com stderr vazio: nunca engula a causa.

Execução de código gerado por modelo é o ponto perigoso do programa. Timeout por caso, sem
rede, e um aviso claro na documentação de que volume se roda em contêiner descartável.

## Camada 3 — crítica: sondas e um juiz

**Sondas** (comportamento, valem mais):

- **Sonda cega** responde a questão sem ver qual alternativa está marcada. Divergiu do
  gabarito, alguém está errado.
- **Sonda da dica** tenta resolver vendo o enunciado, **tudo o que o aluno vê** e a dica —
  jamais o gabarito. O "tudo o que o aluno vê" é literal e foi aprendido caro: quando a sonda
  recebia só enunciado e dica, num `saida-esperada` ela recebia "o que este trecho imprime?"
  **sem o trecho**, e aprovava tudo por não ter como discordar.

**A sonda que não pode existir.** Houve uma terceira, "do chute": respondia proibida de usar
conhecimento do assunto, só com heurística de prova, para detectar exercícios respondíveis
pela forma. Ela acertou o gabarito em **9 de 9** e reprovou um curso inteiro.

Um modelo não suspende o que sabe. Ele fabrica uma justificativa de forma para a resposta em
que já acredita. Num caso ela notou um absoluto na alternativa **correta**, argumentou que
"vinha qualificado", e a incluiu mesmo assim — racionalização até o alvo, não previsão.
**Não implemente essa sonda.** Todas as heurísticas que ela tentava aplicar são as conferências
mecânicas da camada 1, onde são aritmética e não têm opinião.

**Juiz** (um passe de julgamento, com saída estruturada, para o que sonda não alcança:
enunciado ambíguo, gabarito discutível, distrator implausível, escopo que não bate com o
tópico). Três exigências:

- **O juiz precisa ver o exercício, não a serialização dele.** Mostrar JSON escapado rendeu uma
  rodada inteira de rejeições idênticas acusando "notação de string com aspas" — o juiz estava
  julgando a formatação do prompt.
- **O juiz precisa conhecer as convenções da escola**, senão reporta as decisões como defeito:
  que `multipla-escolha` tem várias corretas de propósito, que a comparação despreza espaço em
  branco no fim, que o `porque` é feedback pós-resposta.
- **O juiz não julga se a dica entrega demais.** Isso é da sonda. Opinião sobre dica erra
  sempre para o mesmo lado, porque toda dica útil estreita o campo; sob a régua "isso muda quem
  passa?", nenhuma dica sobrevive. Numa rodada, 10 de 16 rejeições eram o juiz achando dicas
  generosas, e nenhuma veio da sonda. O juiz só reporta dica **errada**: afirmação falsa, aponta
  o lugar errado, contradiz o enunciado.

**Régua de gravidade: "isso muda quem passa?"** Acertar por eliminação sem saber o assunto é
gravidade alta. Gravidade baixa só para o que não altera o resultado de ninguém.

**Não julgado nunca vira aprovado.** Se o passe de crítica falhar, repita uma vez; se falhar de
novo, reprove. Um erro de leitura da resposta virando "gravidade baixa" faz o exercício passar
sem ter sido avaliado.

## Camada 4 — refazer o que caiu

O rejeitado não é descartado: volta ao autor **com o laudo em mãos** e passa pelo funil
inteiro de novo. Ele já pagou uma geração e uma crítica, e o defeito veio nomeado.

O risco é **ensinar para a prova**: reescrever até o juiz aprovar otimiza contra o juiz, e juiz
tem vício. Quatro travas, nenhuma removível sem substituta:

1. A reescrita volta pelo funil **inteiro**, não só pela crítica. Conferência mecânica não muda
   de opinião nem se cansa.
2. A sonda cega **não lê a crítica**. Não há redação que a agrade.
3. **Uma volta por padrão**, configurável, com o custo por exercício aprovado visível no fim.
4. **Tipo e tópico ficam presos.** Trocar um tipo difícil por um fácil resolveria a rejeição e
   falsificaria as duas medidas que mantêm o gerador honesto: cobertura do tópico e taxa por
   tipo. Reescrita que muda um dos dois é recusada antes de entrar no funil.

Recuse também reescrita idêntica à original e resposta vazia. E diga ao autor, no prompt, que
**o defeito é fato e a sugestão de conserto é palpite** — quem apontou o defeito não escreveu o
exercício, e já houve caso de sugestão errada com defeito certo.

## O veredito de progresso

Ao fim de todo ciclo completo, o programa grava uma linha num histórico e imprime um veredito
de três estados: **EVOLUIU**, **PAROU**, **PIOROU**.

O número que decide **não é a taxa de aprovação**. Ela muda com o curso, com o tópico e com a
dificuldade sorteada, e sobe sozinha se o gerador ficar tímido. O que mede a ferramenta é a
**divisão do trabalho**:

> quantos defeitos foram pegos por cálculo, de graça, contra quantos só apareceram depois de
> pagar a API.

Cada regra que vira conta empurra defeito de uma coluna para a outra. Se essa proporção não
anda ao longo das rodadas, as rodadas estão consertando conteúdo, não a ferramenta.

Registre por rodada: curso, tópicos, gerados, reprovados por camada, aprovados, reescritos,
resgatados, causas de rejeição por dimensão, e custo total. Compare **só com a rodada anterior
do mesmo curso** — cursos diferentes têm dificuldade diferente, e comparar dois mediria o
assunto. Mostre também **custo por exercício aprovado**, que é o único jeito de saber se a
etapa de reescrita se paga; se ele subir mais de um quarto, diga isso colado no veredito, e não
numa linha que dá para não ler.

## O que o prompt de autoria precisa exigir

**Esta seção é um resumo, e o prompt verdadeiro está anexado.** São ~490 palavras aqui contra
~2.800 lá, e a diferença não é enchimento: são os casos trabalhados. "A dica não pode oferecer
critério que contradiga o gabarito" é obedecido às vezes; o mesmo com o caso junto — *a dica
mandava verificar se a afirmação promete algo entre ferramentas, sugerindo que promessa entre
ferramentas é verdadeira, e uma das erradas era precisamente uma promessa entre ferramentas* —
é obedecido. **Use o anexo como texto e esta seção como índice do que não pode faltar nele.**

Além das regras já citadas:

- **Ordem dos tópicos é restrição.** Antes de fechar um exercício, liste o que ele exige e
  confira cada item contra a posição do tópico. Origem: exercício de "instalação e primeiro
  script" que exigia manipulação de string, condicional e formatação — passou em todos os casos
  de teste, que é precisamente por que a crítica existe.
- **O enunciado especifica a saída exigida**, porque a comparação é exata: se há texto além do
  valor, qual separador decimal, se há espaço no fim. O aluno não vê os casos de teste e não
  pode descobrir o contrato por eles.
- **`codigo`, quatro perguntas antes de fechar:**
  1. Existe solução que **ignora o tópico** e passa em todos os casos? (Cravar um formato fixo
     já passou 5 de 5 num exercício sobre argumento com valor padrão.)
  2. A **ferramenta natural do tópico** produz o seu gabarito? (Um desempate alfabético num
     tópico cuja ferramenta desempata por ordem de inserção pune quem estudou.)
  3. Se o tópico é desempenho, **algum caso separa as classes**? (Casos de três elementos
     aprovam o laço aninhado igual à solução linear.)
  4. A dificuldade está no tópico ou em **ler a entrada**? (Separador explícito convida a uma
     divisão ingênua que quebra na linha vazia e reprova quem dominava o assunto.)
- **`saida-esperada`: a dica nunca manda executar o trecho.** Em todo outro tipo "rode e
  observe" é boa dica socrática; aqui a resposta *é* a saída.
- **A dica aponta onde olhar, não como decidir.** "Considere o que uma especificação padroniza"
  aponta; "veja se a promessa é sobre o artefato ou sobre a ferramenta" decide — as duas
  categorias nomeadas são as duas em disputa, e sobra ao aluno casar vocabulário.
- **Depois de escrever a dica, aplique-a a cada alternativa** e confira se o resultado bate com
  o gabarito. Dica que oferece critério contradizendo o gabarito é o defeito mais caro do
  conjunto: reprova exatamente quem confia na orientação da escola.
- **`associacao`: a direita descreve comportamento observável**, nunca traduz o nome da
  esquerda — traduzir mede inglês, não o tópico. E o distrator precisa **disputar com o par
  mais difícil**: um descartável de imediato não muda nada, porque o par difícil continua saindo
  por eliminação. Teste cada distrator contra **todas** as esquerdas.
- **Iguale o tom entre corretas e erradas.** Ao escrever uma correta você quer ser exato, e
  exatidão soa como ressalva; ao escrever uma errada você quer que ela seja falsa, e falsidade
  soa categórica. Se as corretas saíram matizadas e as erradas taxativas, o aluno acerta pelo
  tom.

E uma constatação que deve moderar a sua vontade de escrever mais prosa: **regra longa em
prompt é obedecida às vezes; regra que vira conferência mecânica passa a ser obedecida.** Numa
rodada tardia desta base, quase nenhuma rejeição trouxe causa nova — todas violavam regras já
escritas. Ao encontrar um defeito repetível, prefira convertê-lo em cálculo a acrescentar um
parágrafo.

## Regras operacionais

- **Contabilize o custo antes de sair por erro.** Chamada truncada ou recusada é cobrada igual.
  Uma geração que estourou o limite de saída produziu zero exercícios e um relatório de custo
  vazio — gasto silencioso é pior que gasto alto.
- **O limite de saída cobre pensamento e resposta juntos.** Com pensamento adaptativo, um lote
  que cabia em três tópicos não cabe em seis. Ao estourar, **divida o lote pela metade e refaça**
  em vez de perder tudo.
- **Falha nunca sobrescreve o que deu certo.** Gerar zero exercícios já renomeou o arquivo bom
  e gravou um vazio por cima. Preserve a versão anterior antes de escrever, e saia com erro em
  vez de gravar vazio.
- **Resultado não pode depender de quem respondeu primeiro.** Chamadas concorrentes devolvem na
  ordem da entrada. Verifique que rodar com uma chamada simultânea e com oito produz saída
  idêntica.
- **A saída identifica o exercício, não o progresso.** Com paralelismo os resultados terminam
  fora de ordem, e um contador de conclusão impede cruzar um achado com a linha do arquivo —
  que é exatamente o trabalho de quem tria a rodada.
- **Conteúdo é versionado; derivado de rodada, não.** O arquivo de exercícios custou revisão
  para existir; os intermediários se refazem rodando de novo.
- **Um leitor humano.** Ofereça um modo que imprima os exercícios em forma legível. Revisão por
  pessoa é o único sinal externo deste pipeline, e ninguém revisa JSON.
- **Chave de API em variável de ambiente**, jamais no repositório.

## Testes, antes de qualquer coisa que custe dinheiro

Um alvo de teste que roda em segundos e **não toca a rede**:

- **O corpo de prova anexado** — exercícios revisados por uma pessoa, dos quais **nenhuma
  conferência mecânica pode reclamar**. É a defesa contra falso positivo, e ela é essencial:
  quase toda conferência da camada 1 nasceu boa demais e precisou de limiar. Sem corpo de prova
  você descobre isso pagando, e o jeito como se descobre é ruim — a camada barulhenta incomoda,
  alguém afrouxa os limiares, e ela passa a existir sem acusar nada.
- **Cada conferência guarda também o caso real que a motivou** e um teste de que ela ainda
  dispara nele. Calibrar num sentido só produz uma regra que não acusa nada.
- **A contabilidade do funil em voltas roda inteira contra funções de mentira.** É o ponto onde
  um erro não aparece na saída: resgatado contado como rejeitado, ou rejeitado contado duas
  vezes, produz um relatório plausível e falso ao fim de uma rodada que custou dinheiro. Isole
  essa lógica das chamadas de rede exatamente para isso.

## Forma do programa em Go

- Binário único com subcomandos, biblioteca padrão sempre que der. `flag` basta; não traga
  framework de CLI.
- Um pacote por responsabilidade: catálogo, tipos e conferências, geração, execução, crítica,
  reescrita, contabilidade do funil, histórico, cliente do modelo. A contabilidade do funil não
  importa nada de rede.
- Concorrência com um mapa concorrente que **preserva a ordem da entrada** — resultados
  indexados, não canal de chegada.
- `os/exec` com `context.WithTimeout` por caso de teste. Nunca herde stdin do processo pai.
- Saída estruturada do modelo com esquema declarado; campos obrigatórios são obrigatórios de
  verdade, ou o modelo omite o que for inconveniente e a conferência mecânica reprova tudo
  depois — defeito que aparece só depois de pagar.
- Tipos: um `Exercicio` com os campos de todos os sete tipos e validação por tipo. Esquema por
  tipo multiplicaria as chamadas sem ganho.
- Erros com contexto, sem `panic` fora de erro de programação.

## O que fica aberto, e não é esquecimento

- **Deduplicação entre tópicos vizinhos** ainda não existe.
- **Categoria destoante e plausibilidade exótica** — erradas que inventam um mecanismo estranho
  enquanto as corretas são sóbrias — continuam sendo prosa e julgamento. Mecanizá-las exige
  medir semântica, não texto.
- **Calibração externa é o único sinal não autorreferente deste pipeline.** Todo o resto é o
  mesmo modelo julgando a si mesmo; a execução ancora o que é determinístico e as sondas medem
  comportamento, mas "este exercício vale o tempo de um aluno?" não tem resposta automática.
  Registre cada revisão humana com data, escopo e limites — e trate a concordância como
  ausência de desastre, não como prova de precisão, porque concordar com uma crítica é mais
  fácil que discordar.
