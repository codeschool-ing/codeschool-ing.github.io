"""Confere o gabarito de um exercício de expressão, recalculando-o com sympy.

Recebe um JSON no stdin e devolve um JSON no stdout. Não confia no gabarito: aplica a
operação declarada à expressão de origem e compara o resultado com o que o exercício
afirma. Se divergir, o gabarito está errado — provado, não julgado.

    {"gabarito": "x**3/3",
     "variaveis": ["x"],
     "verificacao": {"origem": "x**2", "operacao": "integrate", "variavel": "x"}}

`variaveis` aceita suposição de domínio no formato `nome:suposicao` — `x:positive` faz
sqrt(x**2) simplificar para x, o que muda o que conta como resposta equivalente.
"""
import json
import sys

try:
    import sympy as sp
except ImportError:
    print(json.dumps({"erro": "sympy não instalado (pip install sympy)"}))
    sys.exit(0)

OPERACOES = {
    "diff": lambda e, v: sp.diff(e, v),
    "integrate": lambda e, v: sp.integrate(e, v),
    "simplify": lambda e, v: sp.simplify(e),
    "limit": None,  # precisa de ponto; não suportado nesta versão
}


def main():
    try:
        d = json.loads(sys.stdin.read())
    except Exception as e:
        print(json.dumps({"erro": f"entrada inválida: {e}"}))
        return

    simbolos = {}
    for v in d.get("variaveis") or []:
        nome, _, suposicao = str(v).partition(":")
        nome = nome.strip()
        if not nome:
            continue
        simbolos[nome] = sp.Symbol(nome, **({suposicao.strip(): True} if suposicao.strip() else {}))

    try:
        gabarito = sp.sympify(d["gabarito"], locals=simbolos)
    except Exception as e:
        print(json.dumps({"erro": f"gabarito não parseia: {type(e).__name__}: {e}"}))
        return

    ver = d.get("verificacao") or {}
    operacao = ver.get("operacao", "nenhuma")

    if operacao == "nenhuma":
        print(json.dumps({"ok": True, "pulou": True, "gabarito": str(gabarito)}))
        return

    if operacao not in OPERACOES or OPERACOES[operacao] is None:
        print(json.dumps({"erro": f'operação "{operacao}" não suportada'}))
        return

    variavel = ver.get("variavel", "")
    if variavel not in simbolos:
        print(json.dumps({"erro": f'variável "{variavel}" não está declarada em variaveis'}))
        return

    try:
        origem = sp.sympify(ver.get("origem", ""), locals=simbolos)
        calculado = OPERACOES[operacao](origem, simbolos[variavel])
    except Exception as e:
        print(json.dumps({"erro": f"a verificação não roda: {type(e).__name__}: {e}"}))
        return

    try:
        diferenca = sp.simplify(calculado - gabarito)
        # integrate() omite a constante, então um gabarito que escreve "+ C" difere por um
        # termo sem a variável de integração. É a diferença ser livre dessa variável que
        # caracteriza a constante — is_constant() não serve, porque C é símbolo livre.
        ok = diferenca == 0 or (operacao == "integrate" and simbolos[variavel] not in diferenca.free_symbols)
    except Exception as e:
        print(json.dumps({"erro": f"comparação falhou: {type(e).__name__}: {e}"}))
        return

    print(json.dumps({"ok": bool(ok), "calculado": str(calculado), "gabarito": str(gabarito)}))


main()
