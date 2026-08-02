# Gerador de exercícios

Protótipo para medir **quanto custa encher o catálogo de exercícios auto-corrigíveis**
antes de investir no portal. Lê os `topicos` de um curso em `assets/dados.js` e produz
exercícios com correção por máquina — sem professor no circuito.

Não faz parte do site. A vitrine continua sem dependências e sem build; isto é
ferramenta de catálogo, como o `valida-catalogo.js`.

## Rodar

```sh
cd ferramentas/gerador-exercicios
npm install
export ANTHROPIC_API_KEY=sk-ant-...
node gerar.mjs python
```

| flag | efeito |
| --- | --- |
| `--lote N` | tópicos por chamada (padrão 6). Reduza se aparecer aviso de `max_tokens` |
| `--max N` | para depois de N tópicos — **use na primeira vez, para medir custo barato** |
| `--seco` | monta o prompt e mostra o tamanho, sem chamar a API nem gastar |

Comece pequeno:

```sh
node gerar.mjs python --max 3
```

Isso gera ~9 a 15 exercícios e imprime o custo real, incluindo a extrapolação para os
1.503 tópicos do catálogo.

## O que sai

`exercicios-<id>.json`, com um array de exercícios. Cada um traz:

| campo | conteúdo |
| --- | --- |
| `topico` | o tópico exato que o exercício valida |
| `tipo` | `codigo` ou `quiz` — o modelo escolhe conforme o tópico |
| `dificuldade` | `facil`, `medio`, `dificil` |
| `enunciado` | o que o aluno lê |
| `linguagem`, `esqueleto` | só em `codigo`: linguagem e arquivo inicial |
| `testes` | só em `codigo`: 3 a 6 casos determinísticos com entrada e saída exata |
| `alternativas` | só em `quiz`: 4 opções, uma correta, cada uma com o porquê |
| `dica_socratica` | o que o tutor de IA mostra sem entregar a resposta |

## Decisões embutidas

**Correção 100% por máquina.** Um exercício que precise de julgamento humano não serve —
a premissa do produto é escalar sem ninguém corrigindo. Por isso os testes são
determinísticos: sem relógio, sem aleatoriedade, sem rede, sem ordem de dicionário.

**Dois tipos, escolha do modelo.** `codigo` onde há o que executar, `quiz` onde o tópico é
conceitual. Isso cobre o catálogo inteiro — os ~45% de cursos executáveis (backend, dados,
programação, frontend, qualidade) e os conceituais (gestão, arquitetura, fundamentos), que
de outro modo ficariam sem forma de validação.

**A dica nunca entrega a resposta.** Lida sozinha, não deve permitir acertar o exercício.
É a mesma regra do tutor de IA do portal, e é o campo que o alimenta.

**Todos os tópicos do curso vão no prompt**, não só os do lote, para o modelo saber o que
pertence ao tópico vizinho e não invadir.

## Custo medido

Primeira rodada completa do ciclo, em `python`, 3 tópicos, `claude-opus-5`:

| | |
| --- | --- |
| exercícios gerados | 13 (8 código, 5 quiz) |
| gerar | US$ 0,3628 — **US$ 0,0279 por exercício** |
| validar | US$ 0,0448 — 12% do custo de gerar |
| aprovados pelo validador | 13 de 13 |
| **extrapolado para os 1.503 tópicos** | **~US$ 204**, gerando e validando |

**96% do custo é token de saída**, não de entrada — otimizar contexto ou caching aqui
rende quase nada. Quem quiser gastar menos mexe no volume de exercícios por tópico, não
no prompt.

## Custo

Roda em `claude-opus-5`, com as regras e o contexto do curso marcados para
[prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) —
o prefixo é idêntico entre lotes do mesmo curso, então do segundo lote em diante ele é
lido a ~10% do preço de entrada.

O ganho do cache é modesto aqui (o prefixo tem 800–1.500 tokens) e cresce com o tamanho da
ementa. O relatório final mostra os tokens lidos do cache para você conferir se está
funcionando.

## O que este protótipo ainda não faz

- **Não valida os testes.** Nada garante que o `esqueleto` mais uma solução correta passe
  nos casos gerados. O passo seguinte natural é um runner que execute cada teste contra uma
  solução de referência e reprove o exercício que não fechar.
- **Não deduplica.** Dois tópicos vizinhos podem render exercícios parecidos.
- **Não versiona nem tem banco.** Sai um JSON solto; a ingestão no portal é da Etapa 2.
