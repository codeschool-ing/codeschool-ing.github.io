# codeschool.ing

Site estático de vitrine (Etapa 1) e as ferramentas que preparam a Etapa 2, o Portal do
Aluno. Sem build, sem dependências no site: HTML, CSS e JS puros, com o catálogo em
`assets/dados.js`.

## Regra de ouro

**Toda iteração melhora a ferramenta, não só o conteúdo.**

Quando uma rodada do pipeline reprova um exercício, o conserto do exercício é a menor parte
do trabalho. A pergunta que decide se a rodada valeu é outra:

> Esse defeito pode acontecer de novo noutro curso? Se pode, ele vira regra **antes** de o
> conteúdo ser corrigido.

Sem isso, cada um dos 86 cursos redescobre os mesmos defeitos, um por vez, pagando API a
cada redescoberta. Já aconteceu: seis lições ficaram só no JSON do Python e teriam sido
reaprendidas no curso seguinte.

O registro canônico das regras e de onde cada uma veio é
[`ferramentas/exercicios/REGRAS.md`](ferramentas/exercicios/REGRAS.md). **Toda regra nova
entra lá**, com o defeito que a originou e o ponto do código que a aplica.

## Como triar uma rodada de crítica

Antes de mexer em qualquer exercício, classifique **cada** achado:

1. **Artefato da ferramenta** — o crítico julgou o prompt, não o exercício. Conserta-se o
   código, e o conteúdo não muda. Já foram 23 achados assim em duas rodadas: `JSON.stringify`
   no corpo do exercício, taxonomia de tipos não explicada ao juiz, sonda cega ao enunciado.
2. **Defeito de conteúdo que se repete** — vira regra em `REGRAS.md` e no prompt, depois
   conserta o exercício.
3. **Defeito de conteúdo irrepetível** — só conserta.

Achado de agente não é verdade por decreto. **Confira por execução antes de aceitar**: mais
de um achado desta base caiu ao ser rodado, e mais de um se confirmou de um jeito que eu não
teria previsto.

## Ferramentas

Cada uma na própria pasta, com o executável na raiz dela:

- `ferramentas/bundle/bundle.py` — junta o site num `.html` único
- `ferramentas/valida-catalogo/valida-catalogo.js` — confere `assets/dados.js`
- `ferramentas/exercicios/exercicios.mjs` — gera, valida e critica exercícios

## Segurança

O pipeline **executa código gerado por IA na máquina local**, com timeout por caso e nada
mais. Não rode um JSON que você não gerou; para volume, use contêiner descartável.
`ANTHROPIC_API_KEY` fica em variável de ambiente e nunca no repositório.
