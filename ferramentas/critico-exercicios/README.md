# Crítico de exercícios

Terceira camada do pipeline. O validador prova que enunciado, gabarito e solução descrevem
a mesma coisa; **não** prova que o exercício mede o tópico certo, que o enunciado é
inequívoco ou que a dica não entrega a resposta. É isso que este passe cobre.

```
gerador  →  validador  →  crítico
escreve     executa       julga
```

## Rodar

```sh
cd ferramentas/critico-exercicios
npm install
export ANTHROPIC_API_KEY=sk-ant-...
node criticar.mjs ../gerador-exercicios/exercicios-python.validado.json
```

| flag | efeito |
| --- | --- |
| `--so-sondas` | só as sondas comportamentais, sem o julgamento — mais barato |
| `--curso ID` | força o curso, se o JSON não trouxer |

Saída: `.criticado.json` (aprovados) e `.rejeitado.json` (reprovados, com `_critica`
explicando o quê e sugerindo conserto). Sai com 1 se algo reprovar.

## Duas sondas e um julgamento

O desenho central: **sonda vale mais que opinião.** Pedir a um modelo que "avalie a
qualidade" de um texto escrito por outro modelo tende a produzir concordância. Então duas
das três checagens não perguntam nada — observam comportamento.

**Sonda cega (quiz).** Responde a questão sem ver qual alternativa está marcada como
correta. Se a escolha diverge do gabarito, ou o gabarito erra, ou a questão admite mais de
uma leitura. Nos dois casos há conserto a fazer. É a mesma lógica da solução de referência
do validador, aplicada a texto.

**Sonda da dica.** Tenta resolver vendo apenas o enunciado e a `dica_socratica`. Conseguir
é o defeito — a dica devia orientar, não resolver. Isso torna testável uma premissa que até
agora era só uma regra escrita no prompt.

**Julgamento.** Com o tópico e a ementa em contexto, procura defeito de alvo, ambiguidade,
gabarito ruim e distrator implausível. Aqui é opinião, e o prompt trabalha contra a
tendência de concordar: manda procurar defeito em vez de elogiar, diz qual erro é o pior
(aprovar algo defeituoso), e traz como calibração os três defeitos reais que já apareceram
neste catálogo — o exercício de grafo num curso de arquitetura, o `-7 ** 2 = 49`, o
gabarito sem o `\n`.

Gravidade **alta** reprova; **baixa** vira ressalva e o exercício passa.

## Limite conhecido

Gerador e crítico rodam no mesmo modelo. Enquadramentos diferentes ajudam — quem responde
às cegas não sabe o que o gerador pretendia —, mas ponto cego compartilhado continua
possível. As sondas reduzem isso porque medem comportamento; o julgamento não.

Se um dia a taxa de reprovação do crítico ficar suspeita de baixa, o teste é plantar
defeito conhecido num lote e conferir se ele pega.

## Custo medido

**Criticar custa mais que gerar** — cerca de 2,5x:

| passo | por exercício |
| --- | --- |
| gerar | US$ 0,028 |
| validar | US$ 0,003 |
| **criticar** | **US$ 0,067 – 0,077** |

São até três chamadas por exercício (quiz: sonda cega, sonda da dica, julgamento; código:
duas — a sonda cega não se aplica, o validador já fez a prova equivalente), e cada uma paga
raciocínio sobre o exercício inteiro.

Isso muda a conta do catálogo: com ~6.300 exercícios, o ciclo completo fica na casa de
**US$ 650**, não dos US$ 200 que gerar sozinho sugeria. O `--so-sondas` corta o julgamento
e fica bem mais barato, mantendo as duas checagens comportamentais.

## Calibração observada

Primeira rodada, dois cursos:

| curso | aprovados | dimensão que mais reprovou |
| --- | --- | --- |
| arquitetura-papel (12 quiz) | 6/12 | dica, depois distratores |
| python (13, 8 de código) | 11/13 | alvo e dica |

Reprovar metade de um lote é sinal de que o passe não está apenas concordando — a
preocupação que motivou o desenho das sondas.

Duas correções saíram dessa rodada: a sonda da dica passou a usar critério diferente para
quiz (numa questão de quatro opções, qualquer dica útil estreita o campo — cobrar o
contrário reprovava dica legítima), e o gerador passou a tratar a ordem dos tópicos como
restrição.
