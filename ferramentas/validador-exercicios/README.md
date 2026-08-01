# Validador de exercícios

Recebe o JSON do `gerador-exercicios` e reprova o que não presta, **sem humano no
circuito**. Duas camadas:

1. **Estrutura** — de graça, sem API. Quiz tem 4 alternativas e exatamente uma correta?
   Todo `porque` preenchido? Exercício de código tem linguagem, esqueleto e ao menos 3
   casos? Campo de um tipo aparecendo no outro?
2. **Execução** — escreve uma solução de referência, roda contra cada caso e compara o
   stdout byte a byte.

## Rodar

```sh
cd ferramentas/validador-exercicios
npm install
export ANTHROPIC_API_KEY=sk-ant-...
node validar.mjs ../gerador-exercicios/exercicios-python.json
```

| flag | efeito |
| --- | --- |
| `--so-estrutura` | pula API e execução — grátis, instantâneo |
| `--timeout N` | segundos por caso de teste (padrão 10) |

Sai com código 1 se algo reprovar, então serve em CI.

## Saída

- `<arquivo>.validado.json` — só os aprovados, cada exercício de código com a
  `_solucao_referencia` que passou
- `<arquivo>.reprovado.json` — os reprovados, com `_motivo` dizendo o que falhou

Como o aprovado já carrega a solução, **revalidar não paga de novo**: corrija um gabarito
à mão, rode outra vez e o validador reaproveita a solução em vez de pedir outra à API.

## A decisão que faz isso funcionar

**A solução de referência é escrita sem ver os casos de teste** — só o enunciado e o
esqueleto. É o ponto central do desenho: se a solução visse o gabarito, ela se ajustaria a
ele e a concordância não provaria nada. Escrevendo às cegas, concordar vira evidência de
que enunciado e gabarito descrevem a mesma coisa.

Quando os dois discordam, o validador **não sabe qual lado errou** — pode ser o gabarito,
pode ser um enunciado ambíguo demais para alguém acertar sem espiar os testes. Nos dois
casos o exercício precisa de conserto, então reprova e você decide olhando o
`.reprovado.json`.

## O que ele pega e o que não pega

**Pega:** gabarito com a saída errada, gabarito sem o `\n` que o `print` acrescenta,
enunciado ambíguo, teste não determinístico, solução que não termina, quiz malformado.

**Não pega:** exercício que mede o tópico errado, enunciado que contradiz a semântica da
linguagem, distrator implausível. Isso é julgamento, não execução — precisa de um segundo
passe de crítica com o tópico em contexto, que ainda não existe.

## Segurança

**Este script executa código gerado por IA na sua máquina.** Há timeout por caso, e nada
mais. Não rode um JSON que você não gerou. Para volume, rode dentro de contêiner
descartável — que é como o portal vai ter de executar código de aluno de qualquer forma.

Linguagens suportadas: `python` (python3) e `javascript` (node). Antes de validar qualquer
coisa, o script confere que os interpretadores existem e **para com código 2** se faltar
algum — sem isso, um `python3` ausente vira "8 exercícios reprovados" e manda você caçar
defeito no conteúdo. Códigos de saída: `0` tudo aprovado, `1` algum exercício reprovou,
`2` o ambiente não permite validar.
