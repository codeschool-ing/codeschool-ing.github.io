# codeschool.ing — vitrine de cursos e trilhas

Site de `codeschool.ing` — **Etapa 1: a vitrine**. Apresenta cursos, trilhas de formação, metodologia e captação de matrículas. Não há login, pagamento nem área do aluno: isso é a Etapa 2 (plataforma/LMS), que será **desenvolvimento sob medida** — plataforma pronta está descartada.

**Este código nasceu como vitrine da Televideo Informática e foi transferido para a codeschool.ing.** O catálogo — 86 cursos e 16 trilhas de programação, dados, infraestrutura, segurança e IA — sempre foi o desta escola: o público é quem quer trabalhar com tecnologia. A Televideo atende outro público (informática de uso, sem virar programador) e ganhará a própria versão a partir desta mesma base, trocando `dados.js` e a identidade.

O que a transferência exigiu além do nome: **as afirmações de história saíram**. "Desde 1999", "quem ensina há 25 anos", "5.000+ alunos formados" e "de Medianeira para o mundo" são verdade sobre a Televideo e seriam mentira sobre uma escola que está nascendo. No lugar do contador de alunos entrou a **soma real da carga horária do catálogo**, calculada em `script.js` a partir de `dados.js` — um número que já é verdadeiro no dia em que o site sobe e que cresce sozinho quando entra curso novo.

Identidade escuro/terminal, azul da marca, tema claro opcional e **fullpage** — cada seção ocupa a altura da tela e a rolagem (mouse, teclado ou toque) salta suavemente entre elas, com indicadores laterais. Painéis longos (catálogo, trilha no celular, depoimentos, matrícula) rolam internamente antes de trocar de tela. Em HTML, CSS e JavaScript puros — sem dependências e sem build.

A trilha é apresentada como **grafo de dependências**: cada coluna é um nível e as arestas mostram o que destrava o quê. As trilhas vêm em duas famílias — **por carreira** e **por tecnologia** — cada uma na sua fileira de abas, visíveis ao mesmo tempo. Cada fileira fica em **uma linha só**, com rolagem horizontal, setas nas pontas e um esmaecimento na borda indicando de que lado há mais abas. A aba ativa é trazida para a vista sozinha, então o seletor aguenta a próxima trilha sem virar duas linhas nem deixar uma aba órfã.

## Estrutura

```
index.html            → seções do site
assets/dados.js       → CURSOS, TRILHAS e DEPOIMENTOS (é aqui que se mantém o conteúdo)
assets/i18n.js        → dicionários en/es/fr/it: interface, trilhas e depoimentos
assets/i18n-cursos-en.js → catálogo em inglês (nome, resumo, ementa, tópicos)
assets/i18n-cursos-es.js → catálogo em espanhol
assets/i18n-cursos-fr.js → catálogo em francês
assets/i18n-cursos-it.js → catálogo em italiano
assets/i18n-runtime.js→ detecção de idioma, troca e reaplicação
assets/style.css      → estilos
assets/script.js      → trilhas, catálogo, modal de curso, modal de inscrição
assets/favicon.svg    → chevron e cursor do prompt, nas cores do tema
.devcontainer/        → ambiente de desenvolvimento; precisa de Node e Python
                        (o bundle é Python; o validador executa exercícios em ambos)
ferramentas/          → utilitários, fora do site; uma pasta por ferramenta
  bundle/             → gera o HTML único; escreve na raiz
  valida-catalogo/    → confere depende: ids inexistentes e ciclos
  gerador-exercicios/ → gera exercícios auto-corrigíveis a partir dos tópicos
  validador-exercicios/ → reprova exercício cuja solução não passa nos próprios casos
  critico-exercicios/ → julga alvo, ambiguidade, gabarito e distratores
```

## Componentes que trocam de forma conforme a largura

Três fileiras roláveis viram **menu suspenso** onde não cabem — abaixo de 700px, onde "← item item →" mostraria meio item por vez e a seta ocuparia mais espaço que o rótulo:

| onde | tela larga | tela estreita |
| --- | --- | --- |
| trilhas | duas fileiras de abas, uma por família | um menu só, com a lista agrupada por família |
| filtros do catálogo | chips numa linha com setas | menu com a categoria atual e a contagem |
| menu do topo | links à mostra | menu sanduíche (abaixo de 1180px) |

O colapso do topo é a **1180px**, não 960px: com o seletor de idioma e a área do aluno, abaixo disso os links quebravam em duas linhas e a barra passava por cima da primeira fileira de trilhas. A barra tem altura fixa de 64px justamente para as seções poderem contar com ela. Abaixo de 620px a **área do aluno** sai — é marcador de funcionalidade futura, então é a primeira a ceder espaço, antes do menu sanduíche.

## Cinco idiomas, com o português como origem

O site fala **português, inglês, espanhol, francês e italiano**. O seletor fica ao lado do botão de tema, e o idioma inicial vem de `navigator.languages` — o **idioma configurado no navegador**, não geolocalização. É o sinal certo: um brasileiro acessando de fora continua querendo português, e não exige permissão do usuário. A escolha explícita fica em `localStorage` e vence a detecção.

**A chave de tradução é o próprio texto em português.** Isso tem três consequências práticas:

1. O português não precisa de dicionário — ele é a origem.
2. O HTML não precisa de atributos `data-i18n`: um passeio pelos **nós de texto** guarda o original de cada trecho no carregamento. Nós de texto, não elementos, porque frases partidas por `<strong>` e `<span>` no meio ficariam de fora.
3. **Toda chave ausente cai de volta no português sozinha.** O dicionário pode crescer aos poucos sem que a tela quebre no meio do caminho — que é exatamente o estado atual.

Os dados do catálogo não passam por uma função de tradução: na troca de idioma, os objetos de `CURSOS`, `TRILHAS` e `DEPOIMENTOS` são **reescritos no lugar** a partir de uma cópia do português guardada no carregamento. Assim todo o resto do código continua lendo `c.nome` sem saber que existe tradução, e cada campo cai no português por conta própria quando falta a versão traduzida.

**Está tudo traduzido, nos quatro idiomas de destino**: a interface (153 chaves), as 16 trilhas por inteiro (nome, objetivo, saída, rótulo da bifurcação, nota e nomes das opções), os depoimentos e o catálogo completo — `nome`, `resumo`, `ementa`, `topicos` e `requisitos` dos 86 cursos. São **2.203 strings por idioma**, quase 9 mil no total. O catálogo mora em arquivo próprio por idioma (`i18n-cursos-<cod>.js`) porque sozinho pesa mais que todo o resto do site somado.

Acrescentar um idioma é: uma linha em `IDIOMAS` (em `i18n-runtime.js`), um bloco `ui`/`trilhas`/`depoimentos` em `i18n.js` e um arquivo de catálogo. A conferência que roda contra o português acusa qualquer campo faltando e qualquer lista de tópicos com tamanho diferente do original — foi assim que os cinco idiomas fecharam sem furo.

Vocabulário por idioma para "trilha": *track* em inglês, *itinerario* em espanhol, *parcours* em francês, *percorso* em italiano. É o termo que a formação profissional de cada país usa, não a tradução literal.

**O que não se traduz, de propósito**: a marca ("codeschool.ing"), os nomes das redes sociais, o e-mail e os comandos do terminal do topo. São nomes próprios e dados de contato — traduzi-los quebraria a identidade ou o dado.

**No terminal, o comando é sempre em inglês e a resposta segue o idioma do usuário.** `codeschool --status`, `tracks --career`, `course <id> --info` e `start` são o nome de uma ferramenta, e ferramenta não se traduz; as linhas de saída são texto, e texto se traduz — inclusive o separador de milhar, que sai de `toLocaleString` com o idioma da vez. Ver "Terminal do hero" abaixo.

**Frase montada por pedaços não sobrevive à tradução.** "faz parte de 2 trilhas de carreira" era prefixo + substantivo + sufixo, o que funciona em português, onde o qualificador vem depois — e saía "part of 2 tracks career tracks" em inglês, onde ele vem antes. Frases assim viram **uma chave só**, com `{n}` no lugar do número. Ordem de palavras é coisa que só a frase inteira resolve.

Nomes de curso são traduzidos como o mercado local os anuncia, não ao pé da letra: "Testes Automatizados e CI/CD" vira *Automated Testing and CI/CD*, porque é assim que o aluno de fora procura. Nome próprio de tecnologia fica intacto nos cinco idiomas. O espanhol é neutro latino-americano — o público que chega pelo Mercosul.

## Como manter o catálogo

Tudo vive em `assets/dados.js`:

- **`CURSOS`**: cada curso tem `id`, `nome`, `categoria`, `nivel`, `horas`, `resumo`, `ementa` (lista), `topicos` (lista), **`depende`** (lista de ids de pré-requisito) e `requisitos` (nota livre, quase sempre vazia). As categorias são livres — os chips de filtro se montam sozinhos.
> As trilhas cobrem os tópicos dos roadmaps públicos de [Front-end](https://roadmap.sh/frontend) (34 nós), [Back-end](https://roadmap.sh/backend) (23), [DevOps](https://roadmap.sh/devops) (22), [Data Engineer](https://roadmap.sh/data-engineer) (36), [Network Engineer](https://roadmap.sh/network-engineer) (29), [Prompt Engineering](https://roadmap.sh/prompt-engineering) (30), [AI Engineer](https://roadmap.sh/ai-engineer) (18), [Software Architect](https://roadmap.sh/software-architect) (17), [Cyber Security](https://roadmap.sh/cyber-security) (6 nós, ~300 itens), [DevSecOps](https://roadmap.sh/devsecops) (17), [BI Analyst](https://roadmap.sh/bi-analyst) (45), [Go](https://roadmap.sh/golang) (~160 itens), [Docker](https://roadmap.sh/docker) (37), [Kubernetes](https://roadmap.sh/kubernetes) (~52), [Java](https://roadmap.sh/java) (~95) e [QA Engineer](https://roadmap.sh/qa) (~120) da comunidade roadmap.sh — a *sequência de aprendizado* serviu de referência; ementas e textos são autorais.

- **`TRILHAS`**: cada trilha tem `nome`, `objetivo`, `saida` (cargo/resultado) e `cursos`, um array de ids **na ordem em que devem ser feitos**. Um mesmo curso pode estar em quantas trilhas quiser: o site calcula sozinho quantas trilhas contêm cada curso e mostra o selo "em N trilhas".
- **`DEPOIMENTOS`**: texto, autor e contexto.

Adicionar um curso a uma trilha é só incluir o `id` na sequência — a carga horária total, o número de etapas, os selos e o seletor do formulário se atualizam automaticamente.

### A trilha é um grafo, não uma fila

`depende` é a lista de ids dos pré-requisitos de um curso. É dado estruturado, não texto: o site usa para **desenhar o grafo da trilha**, para ligar os cursos no modal e para calcular níveis.

```js
{ id: 'git',        depende: ['web-fundamentos'] },
{ id: 'html-css',   depende: ['web-fundamentos'] },   // mesmo pré-requisito
{ id: 'react-ts',   depende: ['javascript', 'git'] }, // dois pré-requisitos
{ id: 'apis',       depende: ['node', 'bancos-sql'] },
```

**O nível de um curso é 1 + o maior nível entre os seus pré-requisitos.** Quem cai no mesmo nível pode ser feito em qualquer ordem — `git` e `html-css` ficam lado a lado porque ambos só dependem de `web-fundamentos`. Era exatamente esse paralelismo que a apresentação linear escondia.

Na tela, cada nível é uma coluna e as arestas são desenhadas em **SVG sobre as posições reais** dos cartões, medidas depois que o layout existe (e refeitas no `resize` e quando as fontes carregam). Abaixo de 861px o grafo vira lista: as arestas somem, os níveis empilham e a dependência é lida no rodapé do cartão, em "depois de X". O limite é onde cabem três ou quatro níveis de uma vez — abaixo disso a faixa mostraria um cartão e meio por vez, e a lista informa mais que o grafo.

### A ordem dentro de cada nível é otimizada, não escrita

A ordem dos nós dentro de um nível **não é a de declaração, e não é fixada trilha a trilha**. O algoritmo mede o desenho que vai sair e procura a ordem que produz menos cruzamento de linhas — trilha nova entra e é otimizada do mesmo jeito, sem ninguém arrumar nada na mão.

O custo tem **três critérios, comparados em ordem de prioridade** (lexicograficamente, não somados — assim nenhum critério menor compra um cruzamento a mais):

1. **Cruzamentos.** Aresta de um nível para o seguinte vira curva direta: duas se cruzam quando a ordem vertical das pontas se inverte. Aresta que pula níveis **não** entra como reta — ela é desviada por fora do grafo pelo roteador (ver abaixo), e portanto só cruza alguma coisa na saída e na chegada, ao subir ou descer até a faixa livre. O custo conta exatamente isso, e escolhe o mesmo lado que o roteador escolheria.
2. **Viés para cima.** Empatados subir e descer, o desvio sobe. É convenção, mas uniforme: com todos os atalhos saindo do mesmo lado, o corpo principal da trilha fica contíguo, em vez de partido por linhas passando dos dois lados.
3. **Ordem do currículo.** Entre desenhos igualmente limpos, vence o que mantém os cursos na sequência em que a trilha os declara. Sem esse critério cada partida do otimizador devolvia uma permutação arbitrária entre as boas, e um nível como "Qualidade · Performance · Entrega · Multiplataforma" aparecia embaralhado sem nenhum ganho.

A busca são três peças do método de Sugiyama:

- **baricentro** — cada nó puxa para a altura média (ou mediana) dos vizinhos da coluna ao lado. Chega perto rápido, mas encalha: há casos que só melhoram mexendo em **duas** colunas, e nenhuma troca isolada melhora sozinha;
- **transposição** — troca pares vizinhos de uma mesma coluna enquanto isso não piorar. Aceitar as trocas **empatadas** é o que destrava aqueles casos: a primeira troca anda de lado, a segunda colhe o ganho;
- **partidas múltiplas** — as duas anteriores são guloso puro e o resultado depende de onde se começa. Recomeça-se da ordem do currículo, da invertida e de quatro embaralhadas, ficando com a melhor. O embaralhamento usa gerador com semente fixa: a saída é sempre a mesma, o grafo não muda de forma a cada visita. Nas partidas embaralhadas a transposição roda **antes** do baricentro — se o baricentro rodasse primeiro ele reordenaria tudo pelos vizinhos e apagaria o sorteio, e a partida deixaria de ser uma partida diferente.

Custa ~1,5 ms por trilha, uma vez por abertura. **Resultado nas 16 trilhas: 5 cruzamentos → 0.** É por consequência disso, e não de regra escrita, que Git e Controle de Versão fica acima de Linux e Linha de Comando em DevOps e SRE e em Engenharia de Dados: Git é folha nessas duas trilhas e sua linha de saída atravessa o grafo inteiro; no topo ela sai reto por cima, no meio ela cruzaria as linhas de Linux.

**Nenhuma aresta passa por trás de um cartão.** A decisão de contornar é **geométrica, não topológica**: mede-se o retângulo entre as duas pontas e, se houver qualquer cartão ali dentro, a linha vai por fora. A regra antiga era "pulou mais de uma coluna, contorna" — e ela deixava passar o caso que só aparece em tela **larga e baixa**, quando `repartirNiveis()` divide um nível em sub-colunas e o vizinho de coluna entra no corredor de uma aresta entre níveis **adjacentes**.

O contorno é local: passa logo acima do cartão mais alto que atrapalha, ou logo abaixo do mais baixo, pelo lado mais barato. Se esse desvio curto esbarrar noutro cartão, a linha recua para a faixa livre acima ou abaixo do grafo inteiro — que é sempre limpa, e é para isso que `.grafo-niveis` tem `padding: 20px 0`. O lado é reavaliado nesse recuo, porque o mais barato para o desvio curto quase nunca é o mesmo do longo.

**A folga do contorno é 16px, não 11.** Com 11 algumas linhas passavam a menos de 2px de um cartão que não era ponta delas — medindo ponto a ponto ao longo de cada curva, o pior caso do catálogo inteiro era 1,8px. Subir a folga sozinha não bastava: o corredor entre dois cartões empilhados era de 10px, e não comportava 16 de cada lado. Por isso o `.subcol` abriu para 16px junto. O pior caso passou de 1,8px para 8px, e a mediana ficou em torno de 33px.

As duas subidas da curva têm larguras independentes, calculadas pela **folga real de cada ponta**. Com sub-colunas o vão entre cartões cai de 48px para 14px, e uma subida fixa de 26px atravessava o vizinho — era exatamente por dentro dela que a linha entrava no cartão.

Isso é verificável: o detector do arquivo de teste amostra 120 pontos de cada traçado renderizado e checa se algum cai dentro de um cartão que não seja ponta daquela aresta. **16 trilhas × 5 formatos de tela = zero.**

Cada aresta é um `<g>` com dois traçados — um transparente e grosso, só para captar o cursor, e o visível. Passar o mouse **na linha** a destaca; passar **no cartão** acende todas as arestas que entram e saem dele.

**A descrição da trilha fica ao lado dos números, presa a 58ch, e não na largura da página.** A alternativa foi testada — título e números em cima, descrição ocupando a linha inteira embaixo — e devolvia 26px de altura ao grafo, porque as 16 trilhas passavam a caber em duas linhas em vez de quatro a seis. Mas a linha de ~1250px ficou larga demais para o olho acompanhar, e o título perdia a companhia dos números. Foi revertida: **altura do grafo não compra legibilidade do texto**.

Do que veio junto naquela tentativa, ficou só o objetivo da trilha de Go, que era o único com 375 caracteres e foi encurtado nos cinco idiomas — a frase que saiu era a de sempre sobre o roadmap.sh, e o texto ficou mais parecido com o das outras trilhas.

**A faixa do grafo abraça o grafo**, em vez de ocupar toda a altura que sobra. A medição da repartição continua sendo feita com a altura cheia — é ela que decide quantos cursos cabem numa coluna —, mas depois a faixa encolhe para o tamanho do conteúdo. Sem isso os cartões ficavam centrados numa faixa bem mais alta, e o bloco nome+objetivo tinha 33px de folga para as abas acima contra 103px para o primeiro cartão abaixo.

Três regras de layout mantêm o grafo dentro da tela, sem barra de rolagem à mostra:

1. **O grafo ocupa a altura que sobra** na seção, em vez de uma altura fixa.
2. **Um nível com muitos cursos quebra em sub-colunas** em vez de esticar para baixo — o grafo cresce na horizontal, que é onde há navegação. É o último recurso, não o primeiro: ver abaixo.
3. **Setas nas pontas** avançam e retrocedem uma tela de níveis, e um esmaecimento indica de que lado ainda há grafo. As mesmas setas existem no seletor de trilhas.

**Altura é o recurso escasso desta seção, e a seção foi desenhada em torno disso.** A regra 1 tem consequência direta: cada pixel gasto acima do grafo é um curso a menos por coluna, e uma coluna quebrada em duas quebra a leitura de "coluna = nível". A conta num notebook de 768px (janela útil de 681px) era esta:

| bloco | antes | depois |
| --- | --- | --- |
| cabeçalho da seção (tag + `h2` + parágrafo) | 161px | — |
| tag na mesma linha do alternador | — | 41px |
| abas | 52px | 48px |
| topo da trilha (nome, objetivo, números) | 120px | 98px |
| **faixa do grafo** | **207px** | **402px** |

O `h2` "Um caminho, não uma lista de cursos" e o parágrafo que explicava a metáfora do grafo **foram removidos desta seção** — são as únicas telas do site sem `.sec-head` completo. A tag `// TRILHAS DE FORMAÇÃO` divide a linha com o alternador de famílias, então a seção mantém identidade a custo zero de altura. O texto explicativo se perdeu de propósito: a própria faixa `N níveis · 4 deles com ordem livre` já diz que a trilha não é uma fila, e o grafo mostra.

Com 402px em vez de 207px, cabem **três cursos numa coluna** onde antes cabia um. Das 16 trilhas, em 1920×950 nenhuma quebra em sub-colunas; em 1366×768 sobra uma só — o nível 05 de Front-end, que tem quatro cursos e genuinamente não cabe. O `repartirNiveis()` passou a descontar o padding real da faixa em vez de uma constante, porque o número mágico silenciaria qualquer ganho futuro.

A quebra em sub-colunas é **medida em JavaScript**, em `repartirNiveis()`: cada `.nivel` recebe uma `.subcol` por coluna, e a função mede o `offsetHeight` real de cada cartão para encher uma sub-coluna até o limite antes de abrir a seguinte. Não é preciosismo — nem `flex-wrap` em `flex-direction: column` nem CSS multi-coluna expandem a largura do container, então os cartões que sobravam iam parar **por cima do nível vizinho**. Era o que embaralhava o grafo do Front-end, cujo nível 05 tem quatro cursos. A função roda antes de `desenharArestas()`, e recolhe tudo de volta numa sub-coluna só quando o CSS está no modo lista.

Quando um curso **não tem nenhum pré-requisito dentro daquela trilha**, ele herda como dependência o item anterior da lista `cursos`. Sem isso, cursos como `nuvem` e `testes-cicd` — cujos pré-requisitos reais estão em outras trilhas — cairiam todos no primeiro nível da trilha de Dados. A ordem declarada continua valendo onde não há informação melhor.

Todo caminho termina no **nó de chegada** — um selo circular com bandeira, propositalmente diferente de um cartão de curso, com a `saida` da trilha. Ele existe para que nenhum curso fique visualmente solto: cursos terminais como `ia-dev` em Back-end não são pré-requisito de nada, e sem o nó de chegada pareceriam esquecidos no meio do grafo.

Quando a ordem é do currículo e não do conteúdo, a trilha declara em **`ligacoes`**:

```js
ligacoes: { 'bancos-sql': [3], 'apis': [3] }   // 3 = índice da etapa de escolha
ligacoes: { 'bancos-sql': ['excel-analitico'] } // ou um id de curso
```

SQL não exige linguagem de servidor — mas na trilha de Back-end ele vem depois dela. `depende` guarda o pré-requisito **de conteúdo**, que é global; `ligacoes` guarda a ordem **daquela trilha**.

A etapa com bifurcação entra no grafo como **um nó só** — ela é uma decisão, não um curso. Quem depende de um curso que está dentro do bloco (`bancos-sql` depende de `node`) recebe a aresta do bloco inteiro, então o grafo continua correto em qualquer caminho escolhido.

No modal, `depende` vira botões de **pré-requisito** (vermelhos, apontando para trás) e o inverso vira **"abre caminho para"** (azuis, apontando para frente) — dá para navegar o catálogo pelas dependências.

O campo `requisitos` sobrou para o que os ids não dizem: `'Basta um dos dois — SQL não exige programação.'`, `'Este curso ensina a linguagem do zero.'`, `'Nenhum. É o primeiro curso da escola.'` Em 59 dos 86 cursos ele está vazio, e o modal simplesmente não o mostra.

**Atenção à ordem.** Um curso não pode depender de outro que venha *depois* dele na lista `cursos` de uma trilha: isso fecha um ciclo, o cálculo de níveis não termina e a trilha inteira deixa de renderizar. Foi o que aconteceu com o antigo `containers` (hoje dividido em `docker` e `kubernetes`), que dependia de `testes-cicd` embora viesse antes dele em três trilhas.

Ao criar um curso, **preencha `depende` com ids reais**. O validador percorre o catálogo procurando id inexistente, ciclo e dependência fora de ordem:

```
node ferramentas/valida-catalogo.js
  → OK — sem dependências quebradas nem ciclos
  → OK — nenhuma dependência fora de ordem nas trilhas
```

Os níveis são calculados por **ordenação topológica iterativa (Kahn)**, não por recursão — a versão recursiva tinha teto de profundidade e estourava nas trilhas longas. Se ainda assim sobrar um ciclo, os nós presos entram depois do maior pré-requisito já resolvido e um aviso vai ao console: a trilha fica torta, mas aparece.

### Etapas com bifurcação

Algumas decisões são do aluno, não da escola. O roadmap de Back-end não escolhe a linguagem do servidor — e a trilha também não deve. Para isso, um item de `cursos` pode ser um **objeto de escolha** em vez de um id:

```js
cursos: [
  'web-fundamentos',
  'html-css',
  'git',
  {
    escolha: 'a linguagem do servidor',
    nota: 'Domine uma bem antes de saltar para outra.',   // opcional
    opcoes: [
      { nome: 'JavaScript / Node.js', cursos: ['javascript', 'node'] },
      { nome: 'Python',               cursos: ['python', 'python-back'] },
      { nome: 'Java',                 cursos: ['java-back'] },
      { nome: 'Go',                   cursos: ['go-back'] },
    ],
  },
  'bancos-sql',
  // ...daqui para frente o caminho é o mesmo
]
```

Cada opção pode ter **um ou vários cursos** — o caminho Python precisa da linguagem antes do framework; o de Java resolve os dois num curso só. A primeira opção é a sugerida por padrão.

No site, a etapa aparece como um bloco tracejado com as opções em abas, cada uma mostrando sua carga. Ao trocar, o fluxo é remontado na hora, a numeração das etapas se refaz e o cabeçalho passa a mostrar **a carga daquele caminho** mais a faixa possível — hoje, `760h neste caminho (690h a 760h)`.

O que isso muda no resto do código:

| Leitura | Função | Para quê |
| --- | --- | --- |
| todos os cursos possíveis | `todosOsCursos(t)` | selo "em N trilhas", estatísticas, busca |
| o caminho visível agora | `caminhoDaTrilha(t)` | fluxo, número de etapas, carga |
| menor e maior caminho | `faixaDeHoras(t)` | a faixa no cabeçalho |

**Ao criar uma trilha nova, use bifurcação quando o roadmap não escolher por você.** Candidatos já mapeados: linguagem de script em DevSecOps (Ruby, Python, Rust, Go, JS), Python ou R em Business Intelligence, e provedor de nuvem (AWS, Azure, GCP) em DevOps.

### As duas famílias de trilha

O roadmap.sh separa os roadmaps **por cargo** (role-based) e **por habilidade** (skill-based). São perguntas diferentes, e o site responde as duas com o campo `familia`:

```js
{ id: 'backend',    familia: 'carreira',   nome: 'Desenvolvimento Back-end', … }
{ id: 'python-tec', familia: 'tecnologia', nome: 'Python', … }
```

| | responde | saída |
| --- | --- | --- |
| `carreira` | que profissão eu quero ter | um cargo — `Back-end Developer júnior` |
| `tecnologia` | que ferramenta eu quero dominar | o domínio — `Domínio de Python` |

Na tela, um alternador acima do seletor troca a fileira de abas. Não é enfeite: 14 abas numa fileira só não cabem, e a separação é o próprio recado — quem não sabe ainda que carreira quer consegue entrar por uma tecnologia.

**A forma de uma trilha de tecnologia é sempre a mesma: tronco curto e leque no fim.** O tronco ensina a tecnologia a fundo; a bifurcação final abre as aplicações, montada com cursos que já existem. Uma fila de três cursos em linha reta seria pior que a lista antiga e contradiria a promessa da seção. O leque é o que a trilha de carreira não consegue dizer: uma tecnologia abre mais de uma porta.

Diferente da bifurcação de Back-end, **aqui os caminhos não voltam a se juntar** — a `nota` da etapa avisa isso. É o único lugar do site onde a escolha é terminal, e funciona porque o nó de chegada se liga à etapa inteira.

**Que tecnologia merece uma trilha.** roadmap.sh tem ~45 roadmaps por habilidade; virar trilha é a exceção, não a regra. Precisa passar nos três critérios:

1. **Já tem 2+ cursos no catálogo** que caem nela — ou vale a pena produzi-los.
2. **Abre mais de uma saída profissional** — senão a trilha de carreira já resolve e a de tecnologia é redundante.
3. **Tem público na internet.** O critério nasceu geográfico, quando o alvo era uma cidade; a escola é 100% online e o critério deixou de ser de mapa.

Python e SQL passam nos três e custaram **zero curso novo**. Go passa também, e custou 220h — ver abaixo.

### Dividir por capacidade, não por nível: o caso Go

Go entrou depois de uma avaliação que primeiro o reprovou, por dois erros que vale registrar para não repetir: o critério de demanda ainda era local, e a leitura de que "o leque do Go desemboca em back-end e nada mais" estava errada — os roadmaps relacionados do próprio roadmap.sh são Backend, **DevOps, Docker e Kubernetes**. Go é a linguagem em que essas três ferramentas foram escritas. O leque dele é serviços de um lado e ferramental de infraestrutura do outro.

O que motivou a revisão foi um dado objetivo: `go-back` comprimia o roadmap inteiro — sintaxe, ponteiros, interfaces, erros, módulos, goroutines, HTTP, banco, testes, cross-compilation — em **70h, menos do que `python` gasta só com a linguagem (80h)**. Era o mesmo erro que a proposta de dividir buscava corrigir.

A divisão natural parece ser fundamental / intermediário / avançado. **Não é**, por três razões:

- **Nível não descreve capacidade.** Quem termina "Go Intermediário" não sabe dizer o que sabe fazer. Todo o resto do catálogo é nomeado por capacidade.
- **É informação duplicada.** `nivel` já é campo e aparece no rodapé de cada cartão (`80h · intermediário`).
- **Três não cabe.** São ~160 tópicos no roadmap, uns 280h — três cursos dariam ~95h cada, maior que o maior curso do catálogo.

A divisão que ficou é por capacidade, e a progressão iniciante → avançado aparece sozinha:

| curso | horas | o que o aluno passa a saber fazer |
| --- | --- | --- |
| `go` | 80h | escrever Go idiomático — tipos, interfaces, generics, erros, módulos |
| `go-concorrencia` | 70h | milhares de tarefas ao mesmo tempo, com testes que provam isso |
| `go-back` | 70h | servir HTTP e gRPC com banco atrás — *reformado, sem a parte de linguagem* |
| `go-producao` | 70h | operar Go: CLIs, pprof, compilação cruzada e os cantos avançados |

A concorrência ganhou curso próprio de propósito: são ~16 tópicos, é a parte mais difícil da linguagem e é o que distingue Go de qualquer outra coisa. Enfiá-la no fim de um curso de sintaxe era exatamente o defeito do `go-back` antigo.

**Isso corrigiu de graça a assimetria da bifurcação de Back-end**: a opção Go virou `['go','go-concorrencia','go-back']`, no mesmo formato de `['python','python-back']`. A opção passou a ser a mais longa da etapa, e isso escancarou que `java-back` cometia o mesmo erro — 90h para linguagem, Spring, segurança, testes e publicação. Foi a dívida que o caso Java, logo abaixo, pagou.

**Go é a primeira trilha de tecnologia que custa conteúdo novo: 220h.** Python e SQL custaram zero. É a maior adição isolada do catálogo — para comparar, a trilha inteira de DevSecOps custou 120h. Vale saber que esse é o preço de uma trilha de linguagem feita a sério, e que o mesmo preço se aplicará a Java, Rust ou C# quando chegar a vez deles. Convém tratar isso como política ("uma trilha profunda por linguagem principal"), não caso a caso.

### O leque redundante: o caso Java

Java **não** vira trilha, e o interessante é que ele passa nos critérios que reprovaram os outros. Tamanho: ~95 quadrados no roadmap, mais que os ~52 do Kubernetes. Público: **52.672 pessoas** acompanhando o roadmap, contra 8.698 do Go — seis vezes mais. Pela régua de "linguagem com várias saídas", ele parecia entrar.

O que o reprova é um teste que só apareceu quando havia três trilhas de tecnologia para comparar: **para onde o leque desemboca.**

| trilha | ramos | trilhas de carreira alcançadas |
| --- | --- | --- |
| Python | servidor / dados / IA | Back-end, Eng. de Dados, BI, Arquitetura, Prompt, IA |
| Go | serviços / infraestrutura | Back-end **e** DevOps, Redes, Segurança, DevSecOps, Suporte |
| SQL | análise / engenharia | BI, Eng. de Dados, Arquitetura |

Os quatro leques possíveis para Java foram medidos, e todos falham:

- **Serviços corporativos** (`bancos-sql`+`java-back`+`apis`) → Back-end. Idêntico ao ramo do Go e do Python.
- **Qualidade e testes** (`testes-cicd`) → um curso só, já dentro de Back-end.
- **Dados na JVM** (`bigdata`) → depende de `pipelines-etl`, no fundo da trilha de Dados. Inalcançável.
- **Arquitetura corporativa** (`arquitetura-papel` → `padroes-projeto` → `modelagem-arquitetura` → `software-corporativo`) → 230h, equilibrado, e desemboca noutra trilha. Quase funciona — mas seria **o único ramo do catálogo sem um curso da própria tecnologia dentro**. O ramo de infra do Go tem `go-producao`; o de IA do Python tem `ia-modelos`. Este teria quatro cursos que não mencionam Java: não é segunda porta da tecnologia, é virada de carreira colada no fim.

O roadmap concorda, e diz duas vezes: no topo, *"intentionally skips some backend topics → Visit Backend Roadmap"*; no rodapé, *"Visit Backend path and see what you missed"*. Uma saída só. **Uma trilha Java seria a trilha de Back-end sem o front-end** — o aluno não ganharia nada entrando por ela.

**Os três cursos vieram assim mesmo**, porque a dívida era real e independente da trilha:

| curso | h | nível |
| --- | --- | --- |
| `java` | 80h | iniciante — JVM, sintaxe, as duas caixas de OOP inteiras, coleções, generics, exceções, módulos |
| `java-funcional` | 70h | intermediário — lambdas, Stream API, `Optional`, threads virtuais, modelo de memória, biblioteca padrão |
| `java-back` | 70h | intermediário — *reformado*: Maven/Gradle, Spring Boot, persistência, segurança, log, testes |

220h, **exatamente o Go** — que é a simetria correta, porque são duas linguagens de servidor de peso equivalente. A opção virou `['java','java-funcional','java-back']`. Custo: 150h de conteúdo novo, já que `java-back` existia.

**O que destravaria a trilha:** **Android/Kotlin**, onde a JVM é *a* linguagem e não uma das opções. Aí Java ganharia segunda porta de verdade e a trilha sairia quase de graça.

> Numa primeira versão desta nota eu havia escrito que *uma trilha de QA* também destravaria. **Estava errado**, e o erro apareceu quando a trilha de QA foi realmente desenhada: a bifurcação natural do QA é **por alvo, não por linguagem** — o próprio roadmap desenha Backend Automation, Frontend Automation e Mobile Automation. As ferramentas dentro delas são JavaScript (Cypress, Playwright, Jest, Webdriver.io) ou poliglotas (Selenium, Appium); só REST Assured e Karate são JVM. Um ramo "qualidade" numa trilha Java teria cursos de ferramenta, não cursos de Java — o mesmo defeito do ramo de arquitetura.

### Ferramenta não vira trilha: o caso Docker

Docker **não** vira trilha, e o motivo é diferente do que reprovou o Go na primeira avaliação: ele falha no critério 2. Go tem dois lados — construir serviços ou construir ferramental de infraestrutura. Docker não tem lado nenhum: as continuações que o próprio roadmap oferece são **Kubernetes e DevOps**, que são a mesma direção. Ninguém é "desenvolvedor Docker"; é ferramenta usada dentro de outra carreira, e a trilha seria uma fila sem bifurcação — a forma que a família de tecnologia existe justamente para evitar.

O tamanho confirma: o roadmap de Docker tem **~37 quadrados**, contra ~160 do de Go. É conteúdo de um curso.

**Mas a pergunta revelou um defeito real.** O antigo `containers` — "Containers e Orquestração", 50h, 12 tópicos — cobria *dois* roadmaps, Docker e Kubernetes, com 8 tópicos para o primeiro e 4 para o segundo. Era o defeito do `go-back` em escala menor. Ele foi dividido:

| curso | horas | nível | onde entra |
| --- | --- | --- | --- |
| `docker` | 50h | intermediário | Back-end, DevOps, Eng. de Dados, DevSecOps e o ramo de infra do Go |
| `kubernetes` | 80h | avançado | só DevOps e DevSecOps |

**A divisão não foi só por tamanho — foi por quem precisa do quê.** Back-end e Engenharia de Dados precisam empacotar a aplicação; não precisam operar um cluster. Antes, elas pagavam orquestração embutida num curso que não dava para recusar. Agora Kubernetes fica onde ele é a matéria: DevOps e DevSecOps.

Custo: 80h de conteúdo novo. As trilhas de DevOps e DevSecOps ganharam 80h cada; Back-end e Dados ficaram com a mesma carga de antes, cobrindo Docker com mais que o dobro de profundidade (28 tópicos contra 8).

**O curso de Kubernetes foi conferido depois contra o roadmap dele**, e o resultado corrigiu uma subestimativa: o roadmap tem **~52 quadrados**, mais que os 37 do Docker. Faltavam cluster local (minikube, kind, k3d), CSI, espalhamento por topologia, prioridade e despejo, VPA e escala de nós, padrões de release dentro do cluster, agendador customizado, APIs de extensão e toda a operação de cluster (plano de controle, nós de trabalho, multi-cluster). O curso foi de 26 para **48 tópicos** e de 60h para **80h**.

Três nós do roadmap encostam em cursos que já existem, e a divisão de trabalho é deliberada: **o curso de Kubernetes ensina o mecanismo dentro do cluster; os outros ensinam a prática em volta dele.**

| nó do roadmap | aqui | aprofundado em |
| --- | --- | --- |
| CI/CD Integration, GitOps | panorama de ArgoCD e Flux | `gitops` (60h) |
| Logs, Metrics, Traces, Observability Engines | `kubectl logs`, eventos, `kubectl top`, metrics-server | `observabilidade` (70h) |
| Canary, Blue-Green, Rolling Updates | como objeto do cluster: maxSurge, maxUnavailable, peso no Ingress | `testes-cicd` (60h), no nível da esteira |

A ordem sustenta a divisão: em DevOps, os três vêm **depois** de Kubernetes (índices 10, 11 e 12 contra 7). Em DevSecOps só existe `testes-cicd`, também depois — `gitops` e `observabilidade` não estão nessa trilha, e é por isso que o panorama dentro do curso de Kubernetes precisa se sustentar sozinho.

### Os dois níveis de conteúdo de um curso

| Campo | Para quem | Onde aparece |
| --- | --- | --- |
| `ementa` | quem está decidindo se se matricula | modal do curso, sempre visível — 5 a 7 linhas |
| `topicos` | quem quer conferir tópico a tópico | modal, dentro do bloco recolhido **"conteúdo detalhado"** |

A ementa **condensa**; os tópicos **listam**. É `topicos` que carrega os itens finos do roadmap — os quadradinhos bege que ficam pendurados sob cada tópico amarelo (`ARP`, `VRRP`, `802.1X`, `throughput`, `Top-P`, `SCD`...) — sem transformar o modal numa parede de termos técnicos. O campo é opcional: curso sem `topicos` não mostra o bloco. A busca do catálogo procura nos dois.

**Todos os 86 cursos estão com `topicos` preenchido — 1.503 tópicos no catálogo.** Ao criar um curso novo, preencha os dois campos: sem `topicos` ele fica visivelmente mais pobre que os vizinhos.

### Idioma dos nomes

- **Curso**: conceito em português (`Infraestrutura como Código`), nome próprio de tecnologia intacto (`JavaScript`, `Node.js`, `GitOps`, `Python`).
- **Trilha**: nome em português (`Desenvolvimento Front-end`), e o cargo em inglês — como o mercado anuncia a vaga — no campo `saida` (`Front-end Developer júnior`).

### A unidade intermediária: a decisão que fica para a Etapa 2

**Entre "um curso" e "a trilha inteira" não existe nada, e as trilhas de carreira são longas:**

| trilha | cursos | horas |
| --- | --- | --- |
| Engenharia de Dados | 17 | 1.040h |
| DevSecOps | 16 | 970h |
| Segurança Cibernética | 15 | 970h |
| Business Intelligence | 14 | 900h |

Oito das treze passam de 720h. É muito tempo sem nenhum marco de chegada — e é exatamente o buraco que a Alura preenche com o nível a mais que ela tem.

**A Alura empilha; aqui as famílias ficam lado a lado.** Lá vale `Carreira ⊃ Trilha ⊃ Curso`: a Trilha é um recorte por assunto *dentro* de uma Carreira, e é a ela que o certificado se prende. Aqui, `carreira` e `tecnologia` são duas espécies do mesmo nível, e abaixo delas só existe o curso.

A diferença não é cosmética. A hierarquia obriga cada curso a ter um pai só, e este catálogo não cabe nisso: **43 dos 86 cursos estão em duas ou mais trilhas** — `web-fundamentos` está em 11, `git`, `python` e `linux-terminal` em 8. São 192 vagas para 86 cursos distintos, fator de reuso de 2,23x. Numa árvore isso vira duplicação; é o grafo que sustenta a promessa de que ninguém estuda a mesma coisa duas vezes.

Ou seja: a separação por família resolve **por onde entrar**; a Trilha da Alura resolve **como saber que avançou**. São problemas ortogonais, e só o primeiro está resolvido aqui.

**Por que não agora.** A mudança é aditiva — um campo novo em `TRILHAS` não invalida o `cursos` que já existe, nada migra e nenhum link morre. O custo só salta no **primeiro certificado emitido para aluno real**, porque a partir dali trocar a unidade de certificação vira reemissão ou exceção. Esse prazo é o do LMS, não o da vitrine.

**A armadilha é a mesma do caso Go.** O eixo óbvio para cortar uma trilha em blocos é fundamental / intermediário / avançado — e ele já foi rejeitado um andar abaixo, quando o Go foi dividido: nível não descreve capacidade, `nivel` já é campo, e quem termina o bloco "intermediário" não sabe dizer o que sabe fazer. Blocar por nível repetiria o erro com outro nome.

**O que falta decidir, em ordem:**

1. **O eixo.** Se não é nível, é o quê? O candidato coerente com o resto do catálogo é *capacidade* — cada bloco entrega algo que o aluno passa a saber fazer, como os quatro cursos de Go. O candidato mais ambicioso é *saída parcial empregável*: o bloco termina onde já dá para trabalhar de alguma coisa.
2. **O nome.** "Trilha" já está gasto no nível de cima e "etapa" já nomeia as colunas do grafo. Sobram *módulo* e *bloco*.
3. **A âncora do certificado.** A topologia daqui cria uma pergunta que a da Alura não tem: as trilhas de tecnologia terminam em **leque com escolha terminal**, onde os caminhos não voltam a se juntar. Certificar "Domínio de Python" certifica qual ramo — todos, ou o escolhido?
4. **O custo de tradução.** Nome de bloco é string traduzível. Treze trilhas com três ou quatro blocos cada são ~45 nomes novos × 4 idiomas.

**O benefício que já existiria hoje** — 1.040h numa tela só é intimidante numa vitrine cujo trabalho é converter matrícula — é problema de *apresentação*, e não exige inventar a unidade de certificação para ser resolvido.

## Mapa de expansão

Os roadmaps que aparecem **em azul** dentro dos roadmaps do roadmap.sh são outros roadmaps inteiros. Nem todos viram trilha — a classificação que guia o crescimento do catálogo:

| Tipo | Roadmaps | Vira |
| --- | --- | --- |
| Ferramenta / competência | Docker, Kubernetes, TypeScript, MCP | **curso** compartilhado (ex.: `docker` serve hoje a cinco trilhas) |
| Disciplina transversal | System Design, Design & Architecture, API Security | **curso avançado** compartilhado |
| Carreira de entrada | DevOps, Network Engineer, AI Engineer, QA Engineer | **trilha** própria |
| Carreira sênior | Software Architect, Engineering Manager | **trilha de continuação**, com outra trilha como pré-requisito |
| Especialização | Prompt Engineering, AI Red Teaming, Vibe Coding | **trilha curta** ou curso, conforme o volume |
| Roadmap com dois públicos | Cyber Security | **duas trilhas**, uma servindo de base à outra |
| Interseção de duas carreiras | DevSecOps | **trilha** própria, se trouxer curso que nenhuma das duas tem |
| Mesma matéria, outro público | BI Analyst | **trilha** própria, com caminho que não passa por programação |
| Linguagem com várias saídas | Python, SQL, Go, JavaScript | **trilha da família `tecnologia`** — tronco curto e leque de aplicações |
| Linguagem com uma saída só | Java | **cursos** dentro da trilha de carreira que a usa — o leque seria redundante |
| Ferramenta com uma saída só | Docker, Kubernetes, Terraform, Spring Boot | **curso** compartilhado — o leque não existe, e uma trilha viraria enchimento |

### O mesmo assunto para outro público: o caso BI Analyst

BI e Engenharia de Dados tratam do mesmo dado, mas para pessoas diferentes: o engenheiro constrói o encanamento, o analista responde à pergunta do diretor. A trilha de BI **não passa por programação** nas primeiras 260h — começa em Informática Essencial, negócio, Excel e estatística, e só encontra Python na nona etapa.

É a trilha mais vendável para o público real de uma escola de cidade do interior: contador, gerente de loja, encarregado de produção. Ninguém deles vai fazer Engenharia de Dados.

**Ela também corrigiu uma lacuna que passou por baixo do radar em nove trilhas:** não havia **nenhum curso de estatística** no catálogo. A trilha de Engenharia de Dados ia de Python direto a modelagem dimensional sem nunca ensinar média, desvio padrão, p-valor ou regressão. `estatistica` (80h) entrou nas duas.

### A segunda porta sem programação: o caso QA Engineer

Pelo tamanho, QA é uma trilha comum: ~120 quadrados no roadmap, 22.366 seguidores, 720h. **O que a torna estratégica é a mesma coisa que tornou o BI:** as primeiras **330h não exigem programar.** O roadmap põe fundamentos, abordagens caixa preta/cinza/branca, modelos de ciclo de vida, metodologias, teste manual e técnicas funcionais **antes** de qualquer automação — só no oitavo curso aparece JavaScript.

BI e QA atendem públicos diferentes que chegam pela mesma porta: BI serve quem gosta de analisar número, QA serve quem gosta de quebrar coisa. São hoje as duas únicas entradas do catálogo para quem está mudando de carreira e ainda não programa.

Custou **310h de conteúdo novo em cinco cursos** — a adição mais cara até agora, acima das 220h do Go. Vale porque é a única adição recente que **abre uma porta nova** em vez de aprofundar uma existente; Go, Java, Docker e Kubernetes todos aprofundaram caminhos que já existiam.

Reaproveita 410h: `web-fundamentos`, `git`, `bancos-sql`, `html-css`, `javascript`, `seguranca-fundamentos` e `testes-cicd`. E fez `web-fundamentos` chegar a **nove trilhas** — é o curso mais compartilhado do catálogo.

**Um detalhe de grafo que ela expôs:** `seguranca-fundamentos` e `testes-cicd` são o fechamento do currículo de QA, mas seus pré-requisitos de conteúdo estão no começo da trilha (`web-fundamentos` e `apis`, este último nem presente). O grafo os jogava para o nível 03, ao lado do JavaScript. Foi o caso clássico de **`ligacoes`** — ordem de currículo em vez de dependência de conteúdo — e com ela os dois voltaram para o nível 06, antes da chegada.

### Interseção não é combo: o caso DevSecOps

DevSecOps fica entre DevOps e Segurança, e **87% da trilha já existia**. Pela régua do Full Stack, isso levanta a suspeita certa — mas ele passa, e a diferença é objetiva: traz **três cursos que nenhuma das duas trilhas tinha** (Codificação Segura, Modelagem de Ameaças e Risco, Segurança na Esteira e Cadeia de Suprimentos) e uma ordem própria. Full Stack trazia zero.

**O teste, portanto, não é "quanto se repete", é "traz conteúdo e ordem que não existem?".** DevSecOps traz 120h exclusivas e entrega 890h.

`codigo-seguro` também entrou na trilha de Segurança Cibernética, que não tinha nada de segurança de aplicação — a lacuna só ficou visível quando este roadmap foi mapeado.

### Um roadmap pode virar mais de uma trilha: o caso Cyber Security

O roadmap de Cyber Security tem só **6 nós amarelos**, mas cerca de **300 itens** pendurados neles — é de longe o maior. Uma trilha única passaria de 1.300h e misturaria dois públicos que não se encontram: quem quer trabalhar em help desk e quem quer ser pentester.

Foi partido no lugar onde o próprio roadmap já separa:

| Blocos do roadmap | Virou |
| --- | --- |
| Fundamental IT Skills · Operating Systems · base de rede | **Fundamentos de TI e Suporte** (7 cursos, 400h) |
| Security Skills and Knowledge · Cloud Skills · Programming Skills | **Segurança Cibernética** (15 cursos, 970h) |

A primeira é a porta de entrada da escola — não exige nada e termina em Técnico de Suporte. A segunda usa a primeira como base. **Regra:** quando um roadmap contém dois públicos com saídas diferentes, ele vira duas trilhas, não uma trilha gigante.

`informatica-essencial`, o primeiro curso da trilha de TI, é o **"Informática Essencial"** que estava pendente desde o começo do projeto: hardware, Office, nuvem pessoal e rede doméstica. Ele saiu do bloco *Fundamental IT Skills* deste roadmap.

### Trilha de continuação: o caso Software Architect

Arquitetura de Software é a primeira trilha do catálogo que **não é porta de entrada**. Não existe arquiteto júnior: o roadmap pede Back-end, Full Stack ou System Design antes, e a trilha declara isso no `objetivo` e no campo `requisitos` do primeiro curso. A jornada real é **760h de Back-end + 740h de Arquitetura**.

Isso muda o que a escola vende: em vez de só formar iniciante, ela acompanha carreira — o aluno de 2027 volta em 2030. Vale abrir outras trilhas assim (Engineering Manager, Staff Engineer) mantendo a regra: **trilha sênior sempre declara a trilha anterior**.

**Full Stack fica de fora, por decisão.** É exatamente a soma de Front-end e Back-end: não traz nenhum curso novo, nenhuma ordem nova e nenhuma saída que as duas trilhas já não entreguem. Quem quer tudo faz as duas — e o catálogo não ganha uma trilha que só repete as outras.

A régua, refinada depois do caso Prompt/IA: **combinar trilhas completas não justifica trilha nova; recortar o começo de uma trilha para um público que nunca faria o resto, sim.** Engenharia de Prompt é hoje um subconjunto de Engenharia de IA e continua existindo por isso — ela diz a quem não programa "pare aqui, já é o suficiente para você", coisa que Full Stack não diria a ninguém.

**Cursos compartilhados hoje** (aparecem com o selo "em N trilhas"):

| Curso | Nº de trilhas |
| --- | --- |
| `web-fundamentos` | 9 |
| `git` · `python` · `linux-terminal` | 7 |
| `redes` · `nuvem` | 6 |
| `testes-cicd` | 5 |
| `javascript` · `bancos-sql` · `docker` · `observabilidade` | 4 |
| `html-css` · `ia-dev` · `iac` · `modelagem-dw` · `ia-seguranca` · `seguranca-fundamentos` | 3 |
| `servidores-cache` · `kubernetes` · `estatistica` · `pipelines-etl` · `dados-governanca` · `analytics-bi` · `redes-seguranca` · `prompt-engineering` · `prompt-confiabilidade` · `informatica-essencial` · `sistemas-operacionais` · `criptografia` · `ataques-ameacas` · `codigo-seguro` · `soc-resposta` · `nuvem-seguranca` | 2 |

**A economia do modelo**: somadas, as treze trilhas de carreira entregam até 9.610 horas de formação — mas o conteúdo a produzir é de 5.310 horas, porque os cursos compartilhados são feitos uma vez só. **45% de economia**, e ela cresce a cada trilha nova.

O número é calculado **só sobre a família `carreira`** — tanto a carga entregue quanto a coluna "só dela" abaixo. As trilhas de tecnologia são 100% reaproveitamento por construção: incluí-las empurraria a economia para cima sem a escola ter produzido uma hora sequer, e o indicador deixaria de medir o que interessa. Foi por isso que a tabela abaixo não se mexeu quando Python e SQL entraram; a linha de Back-end mudou por outro motivo — a opção Go ganhou dois cursos, que são exclusivos dela e derrubaram o reaproveitamento de 37% para 25%.

Como isso aparece na prática, trilha por trilha (horas exclusivas = conteúdo que só ela usa):

| Trilha | Carga | Só dela | Reaproveitado |
| --- | --- | --- | --- |
| Desenvolvimento Front-end | 590h | 320h | 46% |
| Desenvolvimento Back-end | 760-840h | 760h | 10% |
| DevOps e SRE | 780h | 60h | 92% |
| Engenharia de Dados | 1.040h | 170h | 84% |
| Redes e Infraestrutura | 730h | 210h | 71% |
| Engenharia de Prompt | 200h | 0h | 100% |
| Engenharia de IA | 730h | 370h | 49% |
| Arquitetura de Software | 740h | 340h | 54% |
| Fundamentos de TI e Suporte | 400h | 100h | 75% |
| Segurança Cibernética | 970h | 150h | 85% |
| DevSecOps | 970h | 120h | 88% |
| Business Intelligence | 900h | 350h | 61% |
| Qualidade e Testes de Software | 720h | 310h | 57% |

**DevOps e SRE custa 60 horas de conteúdo novo** e entrega 780 — é o caso extremo do modelo. E **Engenharia de Prompt custa zero**: é inteiramente recorte de Engenharia de IA.

Note o efeito cruzado: quando DevSecOps entrou, as horas exclusivas de Segurança Cibernética caíram de 450h para 150h; quando BI entrou, Engenharia de Dados caiu de 360h para 170h. Não é que elas tenham perdido conteúdo — passaram a dividi-lo. **Toda trilha nova torna as antigas mais baratas.**

Os casos Go e Java andam na direção contrária e mostram o outro lado da conta: `go`, `go-concorrencia`, `java` e `java-funcional` só aparecem em Back-end dentro da família carreira, então as horas exclusivas dela subiram de 480h para **760h** e o reaproveitamento caiu de 37% para 10%. Back-end virou a trilha mais cara do catálogo — e é justo, porque é ela que banca quatro linguagens de servidor. Curso de linguagem é caro justamente porque **não** se divide.

Foi por isso que Docker nasceu como curso próprio em vez de virar um bloco dentro de outro: hoje `docker` serve a cinco trilhas.

## O modal de um curso

Em telas de **1024px para cima** o modal se abre em **duas colunas**: à esquerda o que convence — o que é o curso, o vídeo de apresentação e o botão de matrícula —, à direita o que detalha — ementa, conteúdo detalhado, pré-requisitos e trilhas. Abaixo disso volta a ser uma coluna, e a ordem do HTML já é a ordem certa de leitura. O limite é onde cada coluna ainda fica com ~440px: mais estreito que isso, duas colunas leem pior que uma. Acima de 1500px a caixa para de crescer — numa tela 4K o modal ocupava metade da largura em branco de um lado e linhas longas demais do outro.

Um curso de 48 tópicos abertos fazia o modal inteiro rolar, e a coluna da esquerda — o vídeo e o botão de matrícula — subia junto para fora da vista. Em telas grandes **o corpo do modal não rola**: quem rola é a lista de tópicos, por dentro.

O teto da lista é **medido em JavaScript**, não fixado no CSS. Um teto fixo não resolve: com 420px a lista parava, mas a coluna inteira (ementa + tópicos + pré-requisitos + trilhas) continuava passando da altura e o modal voltava a rolar. `ajustarTopicos()` mede quanto a coluna excede e tira esse tanto da lista — o único bloco que pode encolher sem perder informação, porque ela rola. Piso de 140px; abaixo disso a coluna rola, como rede de segurança.

Era para ser CSS puro (`flex:1 1 auto` na lista dentro de um `<details>` em `display:flex`), e não funciona: o Chrome envolve o conteúdo do `<details>` num slot, então o `ul` **não** vira item flex. O estilo computado aceita a regra e o layout a ignora — a lista ficava com 1387px dentro de um bloco de 246px e vazava por cima do resto. Medir foi o que mostrou isso; olhando o CSS não dava para saber.

No celular nada disso se aplica: lá a rolagem única da tela é mais natural que uma caixa que rola dentro de outra.

**Com o modal aberto, o fundo não rola.** Prender só a roda e o toque no JavaScript não bastava — os tratadores tinham um `return` seco antes do `preventDefault()`, e ainda sobravam a barra de rolagem do navegador e a inércia do trackpad. São duas metades: uma classe no `<html>` corta o overflow do documento e da tela (cuida da barra e da inércia) e os tratadores deixam passar apenas o que tem rolagem própria **dentro** do modal (cuida do encadeamento). A posição da página fica exatamente onde estava, porque nada é reposicionado.

**O vídeo é uma fachada, não um iframe.** O quadro mostra a capa do YouTube e um botão; só depois do clique o player entra. Assim o modal abre leve e quem não assiste não recebe cookie nenhum do YouTube. Curso sem `video` preenchido mostra o quadro reservado com "vídeo em breve" — o espaço já fica guardado, então publicar os vídeos um a um não reorganiza a tela de ninguém.

## Terminal do hero

Quatro comandos, e **nenhuma resposta escrita à mão**: os números, os nomes das trilhas e a ficha do curso saem de `CURSOS` e `TRILHAS`, em `montarTerminal()`. Entra trilha nova e ele conta certo sozinho; nenhuma linha pode contradizer o resto da página, porque lê a mesma fonte.

```
$ codeschool --status
✓ 86 cursos · 16 trilhas · 5.380 horas de conteúdo

$ codeschool tracks --career
→ Desenvolvimento Front-end · 590h
→ Desenvolvimento Back-end · 760–840h
→ DevOps e SRE · 780h
  … e mais 10 trilhas de carreira

$ codeschool course kubernetes --info
→ Kubernetes: Orquestração em Produção · 80h · avançado
↳ precisa antes: Docker e Containers

$ codeschool start▊
```

A trilha de Back-end mostra `760–840h` porque tem bifurcação: a faixa vem de `faixaDeHoras()`, o mesmo cálculo que a tela de trilhas usa. O curso da terceira resposta é fixo (`CURSO_VITRINE`) e escolhido por ser avançado **e** ter pré-requisito — assim a ficha mostra as duas coisas. Se o id sumir do catálogo, cai no primeiro curso que tenha `depende` preenchido.

**O atraso da animação é calculado, não escrito por posição.** Antes eram seis regras `nth-child` com o atraso de cada linha; o terminal tem treze agora, e tudo além da sexta aparecia de uma vez. `montarTerminal()` grava a posição em `--i` e o CSS faz `calc(.2s + var(--i) * .16s)` — o escalonamento passa a valer para quantas linhas houver.

O terminal **só aparece acima de 1180px**, junto com o menu à mostra. Abaixo disso a coluna de texto ocupa a largura toda.

## Modal de inscrição

**O formulário não é uma tela: é um modal.** Antes, clicar em "Quero este plano" atravessava a página inteira até uma seção que perguntava de novo qual plano a pessoa queria. Agora o plano vira o cabeçalho do modal e o formulário fica com **dois campos**. A tela que sobrou virou o FAQ.

Abre de **três lugares**, e o que muda entre eles é só quanta coisa ainda falta perguntar:

| de onde | plano | o que o formulário mostra |
| --- | --- | --- |
| botão de um dos cartões | conhecido | plano no cabeçalho, sem seletor: nome e contato |
| "Comece agora", no topo | nenhum | seletor de plano, começando em "ainda não sei" |
| botão do modal de curso | nenhum | igual ao de cima, mas guarda o curso como origem |

**A lista de planos sai dos próprios cartões da tela de Planos**, lida do DOM (`#planos .plano-nome`), não de um array paralelo no `script.js`. Acrescentar um quarto plano, renomear ou tirar um ajusta o seletor sozinho, e não existe a chance de os dois discordarem. Como `montarSelectPlanos()` roda depois de `aplicarTextos()`, os nomes já chegam no idioma da vez.

**O "Comece agora" do topo é `<button>`, não âncora.** Ele abre um diálogo, não navega — e é a porta de entrada de quem ainda não escolheu plano. Sem ele, o formulário só existiria dentro do modal de um plano, e quem quer orientação antes de escolher ficaria sem caminho. Os três botões dos cartões seguiram o mesmo raciocínio e viraram `<button>` também.

**O botão do modal de curso registra a origem.** Fecha o modal do curso, abre o de inscrição sem plano e guarda o id em `cursoDeOrigem`, que vai no envio como `origem: 'curso:kubernetes'`. Saber que o pedido nasceu olhando Kubernetes vale para quem atende, mesmo que o curso não seja o que se compra.

**O foco vai para o × e não para o campo de nome.** Em celular, focar um input na abertura escancara o teclado virtual por cima do modal antes de a pessoa ler o que ele diz.

**Agora são dois modais, e a trava de rolagem precisou parar de conhecer um só.** `modalAberto()` devolve o que estiver aberto, e a roda, o toque e o Esc consultam essa função em vez de olhar direto para o modal de curso. Sem isso, abrir o de inscrição deixaria a página rolando por baixo — exatamente o defeito que já tinha sido corrigido uma vez.

**Duas regras do modal de curso vazavam para o novo**: em telas de 1024px para cima, a caixa de 1080px e o corpo em duas colunas. Ficaram restritas com `:not(.modal-estreito)` e `:not(.assinar-corpo)` — o modal de inscrição tem 460px e uma coluna só.

**Com pouca altura, o subtítulo some** (`@media(max-height:560px)`). Altura curta é quase sempre o teclado virtual aberto: aí a pessoa está digitando e precisa enxergar o campo e o botão, não a explicação. Medido com a viewport encolhida a 420px e a 380px — sem isso, o "Comece agora" caía abaixo da dobra dentro do próprio modal.

**O campo de contato aceita whatsapp ou e-mail.** Enquanto o que foi digitado ainda puder ser um telefone, a máscara entra sozinha — `(45) 90000-0000` no celular de nove dígitos, `(45) 0000-0000` no fixo. Assim que aparece letra ou `@`, a máscara se desfaz e o campo volta a ser texto livre; sem isso, quem digitasse `123abc@…` ficaria com `(12) 3abc@…`. O cursor é recolocado depois do mesmo dígito em que estava, então dá para corrigir no meio do número sem ser jogado para o fim.

Dentro do modal o formulário é **empilhado sempre**: numa caixa de 460px não há largura para duas colunas.

O envio está pronto para um provedor (Formspree, Web3Forms, Brevo...): cole a URL de POST em `MATRICULA_URL`, no bloco "MATRÍCULA" de `assets/script.js`. Enquanto estiver vazia, o formulário funciona em modo demonstração.

## Deixado de fora de propósito

- **Ferramentas de colaboração** (Slack, Trello, Atlassian) aparecem no roadmap de Software Architect, mas não sustentam curso nem etapa — entram como uso corrente dentro de `gestao-processos`.
- **Big Data na trilha de Arquitetura**: o roadmap cita Hadoop, Spark e MapReduce. O arquiteto precisa do panorama, que `modelagem-dw` dá; as 70h de `bigdata` ficaram só na trilha de Dados para não inflar a trilha em conteúdo que ele não vai operar.
- **Certificações** (PMI, ITIL, Prince2, Scrum, CompTIA, OSCP, CISSP…) são apresentadas como panorama em `gestao-processos`, `suporte-tecnico` e `pentest`; a escola não prepara para prova de certificadora.
- **Uma trilha de red team separada da de blue team**: o roadmap de Cyber Security não separa, e dividir agora criaria duas trilhas de 400h com metade do conteúdo repetido. `pentest` (ofensivo) e `soc-resposta` (defensivo) convivem na mesma trilha, cada um com 70-80h. Se a procura justificar, a divisão é feita depois sem refazer curso nenhum.
- **Uma trilha de tecnologia para cada roadmap por habilidade**: são ~45 no roadmap.sh. Só entram os que passam nos três critérios acima; o resto continua sendo curso dentro de uma trilha de carreira, que é onde já estava.
- **Cursos avulsos, fora de qualquer trilha**: o catálogo é bom para procurar um curso que você já sabe que quer, mas um curso sem trilha perde o selo "em N trilhas", perde o bloco "faz parte de" no modal e vira beco sem saída na navegação. Hoje são **zero avulsos**, e vale manter assim — foi a alternativa descartada quando as trilhas de tecnologia foram desenhadas.
- **`ia-seguranca` entrou na trilha de Segurança Cibernética** ainda que não esteja no roadmap de Cyber Security: segurança de aplicações com LLM é o assunto que um analista de 2026 vai encontrar, e o curso já existia. É o único desvio deliberado em relação ao roadmap nessa trilha.

## O que ainda precisa ser preenchido

- Depoimentos reais (com autorização dos alunos) — lembrando que são **cinco** lugares: `dados.js` para o português e `i18n.js` para en, es, fr e it
- Vídeos de apresentação: o id do YouTube no campo `video` de cada curso, em `dados.js`
- **Os três planos são exemplos**: os valores estão em `00` de propósito, e os benefícios listados são plausíveis, não decididos. Ver a seção "Planos" abaixo.
- E-mail real (hoje `contact@codeschool.ing`)
- **Quatro respostas do FAQ são exemplos** e trazem a marcação entre colchetes: cancelamento, formas de pagamento, venda avulsa e condições para empresa. As perguntas são as certas — são as que todo mundo faz sobre assinatura —, mas as respostas dependem de política que ainda não existe, e prazo ou regra de reembolso escritos numa vitrine viram compromisso que alguém vai cobrar.
- Os depoimentos de exemplo assinam "turma de [ano]", vocabulário de matrícula em turma. Quando entrarem os relatos reais, a assinatura de cada um precisa combinar com o modelo de assinatura.
- Perfis reais nas redes sociais: os cinco links do rodapé apontam para handles `codeschool.ing`/`codeschool-ing` que ainda precisam existir
- Revisão das ementas e cargas horárias conforme os cursos que a escola realmente oferece

## Planos

A seção `#planos` substituiu a antiga "Como funciona" — os quatro passos ("escolha sua trilha", "estude quando puder"…) descreviam um método que a página inteira já demonstra, e o espaço vale mais mostrando o que custa quanto.

**Os três cartões são marcadores de posição.** Nome, chamada e itens estão escritos como se fossem reais, porque cartão com "lorem ipsum" não deixa avaliar o layout; mas o preço é `R$ 00` em todos os três, e é assim que deve ficar até a decisão de cobrança. Número inventado em vitrine não é rascunho: é promessa, e alguém vai cobrar por ela.

O que cada um representa hoje — **Essencial** (uma trilha), **Completo** (catálogo inteiro, é o destacado) e **Equipes** (empresa, preço por pessoa) — é uma hipótese de escada, não uma decisão. Trocar os três por outra estrutura é editar `index.html` e as chaves correspondentes nos quatro dicionários de `i18n.js`.

**Os botões dos planos abrem o modal de inscrição** com o plano já no cabeçalho — ver "Modal de inscrição" abaixo.

## FAQ

Ocupou a tela que era da matrícula. São oito perguntas: as quatro que já existiam ao lado do formulário e quatro que a assinatura trouxe — cancelamento, formas de pagamento, venda avulsa e contratação por empresa.

**Uma pergunta aberta por vez.** A escuta do `toggle` fica no contêiner e em fase de captura — `toggle` não borbulha —, então vale também para as perguntas que entrarem depois, sem uma escuta por `<details>`.

Em **861px para cima** as perguntas ficam em duas colunas. Oito sanfonas numa coluna só viravam uma fita estreita no meio de uma tela larga. É `grid`, não `columns`: a coluna múltipla do CSS parte um `<details>` aberto ao meio.

As quatro respostas novas trazem a marcação `[resposta de exemplo — ...]` no fim, no mesmo estilo dos preços e dos depoimentos. Elas são plausíveis, não decididas — o critério é o mesmo do `R$ 00`.

## Contato

Sobrou **um canal**: o e-mail. O WhatsApp e o horário de atendimento saíram — número de telefone e "seg–sex · 8h às 18h" são promessa de atendimento síncrono, e a escola não tem balcão. O e-mail e a newsletter dividem a linha ao meio (`.contato-linha`), e no celular empilham.

O formulário de matrícula continua aceitando telefone com máscara: quem prefere ser chamado no WhatsApp diz isso ali, e aí o número é o do aluno, não o da escola.

## Publicar no GitHub Pages

O destino é `codeschool-ing/codeschool-ing.github.io`, que é o Pages da organização: o conteúdo vai na **raiz** do repositório, não em `escola/`. Para o domínio próprio, um arquivo `CNAME` na raiz com uma linha, `codeschool.ing`, e o DNS apontando para o GitHub — `A` para os quatro endereços do Pages, ou `ALIAS`/`ANAME` para `codeschool-ing.github.io`.

Não há build: é copiar `index.html` e `assets/` e commitar. O `escola-vitrine.html` do `ferramentas/bundle.py` serve para mandar por e-mail ou abrir do disco, não para publicar — no Pages os arquivos separados são melhores, porque o navegador cacheia cada um.
