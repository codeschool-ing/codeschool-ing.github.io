#!/usr/bin/env python3
"""Executa SQL contra um SQLite em memória e imprime o resultado num formato fixo.

Lê JSON do stdin: {"sql": "...", "entrada": "..."} — `entrada` é o roteiro de preparação
(CREATE TABLE, INSERT), `sql` é o que está sendo avaliado. Escreve o resultado no stdout.

O FORMATO DA SAÍDA É O CONTRATO, e por isso está fixado aqui e documentado no prompt de
autoria. Sem um formato declarado, o gerador inventa um a cada exercício e a comparação byte
a byte reprova gabarito certo — que é o mesmo defeito do `\\n` final que já custou seis casos.

    · uma linha por registro, colunas separadas por " | "
    · a primeira linha é o cabeçalho com os nomes das colunas
    · NULL vira a palavra NULL, sem aspas
    · float sai com repr do Python (1.5, não 1.50); inteiro sai sem ponto
    · nenhuma linha em branco no fim além do \\n final de cada linha
    · consulta sem registro algum imprime só o cabeçalho

Sem rede, sem arquivo, sem extensão: banco em memória, criado e destruído a cada execução.
"""
import json
import sqlite3
import sys


def separar(script):
    """Divide um script em instruções completas.

    Quebra no ponto e vírgula, não no fim de linha: um script inteiro escrito numa linha só
    passava intacto e o sqlite3 recusava com "only execute one statement at a time".
    `complete_statement` é quem decide, para não quebrar dentro de literal com ponto e vírgula.
    """
    partes, atual = [], ""
    for pedaco in script.split(";"):
        atual += pedaco + ";"
        if sqlite3.complete_statement(atual):
            texto = atual.strip().rstrip(";").strip()
            if texto:
                partes.append(texto)
            atual = ""
    resto = atual.strip().rstrip(";").strip()
    if resto:
        partes.append(resto)
    return partes


def formatar(v):
    if v is None:
        return "NULL"
    if isinstance(v, bytes):
        return v.decode("utf-8", "replace")
    return str(v)


def main():
    try:
        pedido = json.loads(sys.stdin.read())
    except Exception as e:
        print(f"entrada inválida: {e}", file=sys.stderr)
        return 2

    sql = pedido.get("sql") or ""
    preparo = (pedido.get("entrada") or "").strip()
    # Em `saida-esperada` o aluno lê o script INTEIRO — criação, dados e consulta —, então não
    # existe `entrada` separada e a preparação vem embutida. Nesse caso, tudo menos a última
    # instrução é preparo, e a última é a que produz a saída avaliada.
    if not preparo:
        partes = separar(sql)
        if len(partes) > 1:
            preparo, sql = ";\n".join(partes[:-1]) + ";", partes[-1]

    con = sqlite3.connect(":memory:")
    # Chave estrangeira desligada por padrão no SQLite, e um curso de banco relacional
    # avalia justamente isso: sem isto, um exercício sobre integridade referencial passaria
    # aceitando um INSERT que qualquer banco de verdade recusaria.
    con.execute("PRAGMA foreign_keys = ON")
    try:
        if preparo:
            con.executescript(preparo)
        cur = con.execute(sql)
        if cur.description is None:
            # Comando sem resultado (INSERT, UPDATE, CREATE): informa quantas linhas mudaram,
            # senão não há o que comparar e todo exercício de escrita seria inverificável.
            con.commit()
            sys.stdout.write(f"{cur.rowcount} linha(s) afetada(s)\n")
            return 0
        sys.stdout.write(" | ".join(c[0] for c in cur.description) + "\n")
        for linha in cur.fetchall():
            sys.stdout.write(" | ".join(formatar(v) for v in linha) + "\n")
        return 0
    except sqlite3.Error as e:
        print(f"{type(e).__name__}: {e}", file=sys.stderr)
        return 1
    finally:
        con.close()


if __name__ == "__main__":
    sys.exit(main())
