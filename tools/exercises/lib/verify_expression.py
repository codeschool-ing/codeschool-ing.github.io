"""Checks the key of an expression exercise by recomputing it with sympy.

Reads JSON on stdin and returns JSON on stdout. It does not trust the key: it applies the
declared operation to the source expression and compares the result with what the exercise
claims. If they diverge, the key is wrong — proved, not judged.

    {"answer_expression": "x**3/3",
     "variables": ["x"],
     "check": {"source": "x**2", "operation": "integrate", "variable": "x"}}

`variables` accepts a domain assumption in the form `name:assumption` — `x:positive` makes
sqrt(x**2) simplify to x, which changes what counts as an equivalent answer.
"""
import json
import sys

try:
    import sympy as sp
except ImportError:
    print(json.dumps({"error": "sympy not installed (pip install sympy)"}))
    sys.exit(0)

OPERATIONS = {
    "diff": lambda e, v: sp.diff(e, v),
    "integrate": lambda e, v: sp.integrate(e, v),
    "simplify": lambda e, v: sp.simplify(e),
    "limit": None,  # needs a point; not supported in this version
}


def main():
    try:
        d = json.loads(sys.stdin.read())
    except Exception as e:
        print(json.dumps({"error": f"invalid input: {e}"}))
        return

    symbols = {}
    for v in d.get("variables") or []:
        name, _, assumption = str(v).partition(":")
        name = name.strip()
        if not name:
            continue
        symbols[name] = sp.Symbol(name, **({assumption.strip(): True} if assumption.strip() else {}))

    try:
        key = sp.sympify(d["answer_expression"], locals=symbols)
    except Exception as e:
        print(json.dumps({"error": f"the key does not parse: {type(e).__name__}: {e}"}))
        return

    check = d.get("check") or {}
    operation = check.get("operation", "none")

    if operation == "none":
        print(json.dumps({"ok": True, "skipped": True, "key": str(key)}))
        return

    if operation not in OPERATIONS or OPERATIONS[operation] is None:
        print(json.dumps({"error": f'operation "{operation}" is not supported'}))
        return

    variable = check.get("variable", "")
    if variable not in symbols:
        print(json.dumps({"error": f'variable "{variable}" is not declared in variables'}))
        return

    try:
        source = sp.sympify(check.get("source", ""), locals=symbols)
        computed = OPERATIONS[operation](source, symbols[variable])
    except Exception as e:
        print(json.dumps({"error": f"the check does not run: {type(e).__name__}: {e}"}))
        return

    try:
        difference = sp.simplify(computed - key)
        # integrate() omits the constant, so a key that writes "+ C" differs by a term without
        # the integration variable. It is the difference being free of that variable that
        # characterises the constant — is_constant() does not serve, because C is a free symbol.
        ok = difference == 0 or (operation == "integrate" and symbols[variable] not in difference.free_symbols)
    except Exception as e:
        print(json.dumps({"error": f"comparison failed: {type(e).__name__}: {e}"}))
        return

    print(json.dumps({"ok": bool(ok), "computed": str(computed), "key": str(key)}))


main()
