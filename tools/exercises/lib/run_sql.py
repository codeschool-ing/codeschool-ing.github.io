#!/usr/bin/env python3
"""Runs SQL against an in-memory SQLite and prints the result in a fixed format.

Reads JSON from stdin: {"sql": "...", "input": "..."} — `input` is the setup script
(CREATE TABLE, INSERT), `sql` is what is being evaluated. Writes the result to stdout.

THE OUTPUT FORMAT IS THE CONTRACT, which is why it is pinned here and documented in the
authoring prompt. Without a declared format the generator invents one per exercise and the
byte-for-byte comparison fails a correct key — the same defect as the trailing `\\n` that has
already cost six cases.

    · one line per record, columns separated by " | "
    · the first line is the header with the column names
    · NULL becomes the word NULL, unquoted
    · a float prints with Python's repr (1.5, not 1.50); an integer prints without a point
    · no blank line at the end beyond the trailing \\n of each line
    · a query returning no records prints only the header

No network, no file, no extension: an in-memory database, created and destroyed on every run.

The one Portuguese string below ("N linha(s) afetada(s)") is student-facing output that the
key is compared against, so it stays in the language the student reads.
"""
import json
import sqlite3
import sys


def split_statements(script):
    """Splits a script into complete statements.

    Breaks on the semicolon, not at end of line: a whole script written on a single line went
    through intact and sqlite3 refused it with "only execute one statement at a time".
    `complete_statement` decides, so as not to break inside a literal containing a semicolon.
    """
    parts, current = [], ""
    for chunk in script.split(";"):
        current += chunk + ";"
        if sqlite3.complete_statement(current):
            text = current.strip().rstrip(";").strip()
            if text:
                parts.append(text)
            current = ""
    rest = current.strip().rstrip(";").strip()
    if rest:
        parts.append(rest)
    return parts


def render(v):
    if v is None:
        return "NULL"
    if isinstance(v, bytes):
        return v.decode("utf-8", "replace")
    return str(v)


def main():
    try:
        request = json.loads(sys.stdin.read())
    except Exception as e:
        print(f"invalid input: {e}", file=sys.stderr)
        return 2

    sql = request.get("sql") or ""
    setup = (request.get("input") or "").strip()
    # In `expected-output` the student reads the WHOLE script — creation, data and query —, so
    # there is no separate `input` and the setup comes embedded. In that case everything but
    # the last statement is setup, and the last one produces the evaluated output.
    if not setup:
        parts = split_statements(sql)
        if len(parts) > 1:
            setup, sql = ";\n".join(parts[:-1]) + ";", parts[-1]

    con = sqlite3.connect(":memory:")
    # Foreign keys are off by default in SQLite, and a relational-database course assesses
    # exactly that: without this, an exercise about referential integrity would pass while
    # accepting an INSERT that any real database would refuse.
    con.execute("PRAGMA foreign_keys = ON")
    try:
        if setup:
            con.executescript(setup)
        cur = con.execute(sql)
        if cur.description is None:
            # A statement with no result set (INSERT, UPDATE, CREATE): report how many rows
            # changed, or there is nothing to compare and every writing exercise would be
            # unverifiable.
            con.commit()
            sys.stdout.write(f"{cur.rowcount} linha(s) afetada(s)\n")
            return 0
        sys.stdout.write(" | ".join(c[0] for c in cur.description) + "\n")
        for row in cur.fetchall():
            sys.stdout.write(" | ".join(render(v) for v in row) + "\n")
        return 0
    except sqlite3.Error as e:
        print(f"{type(e).__name__}: {e}", file=sys.stderr)
        return 1
    finally:
        con.close()


if __name__ == "__main__":
    sys.exit(main())
