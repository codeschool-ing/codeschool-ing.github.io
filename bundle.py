#!/usr/bin/env python3
"""Gera um HTML único, sem dependências externas, para enviar ou abrir direto
do disco (file://). Embute o CSS, os seis scripts e o favicon.

    python3 bundle.py            -> escola-vitrine.html
    python3 bundle.py saida.html

O site continua sendo servido a partir de index.html + assets/. Este arquivo
é só para entregar uma cópia que se abre com dois cliques.
"""
import base64
import pathlib
import re
import sys

AQUI = pathlib.Path(__file__).parent
SAIDA = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else AQUI / 'escola-vitrine.html'

html = (AQUI / 'index.html').read_text(encoding='utf-8')


def ler(rel):
    return (AQUI / rel).read_text(encoding='utf-8')


# favicon como data: URI
favicon = base64.b64encode((AQUI / 'assets/favicon.svg').read_bytes()).decode()
html = html.replace(
    'href="assets/favicon.svg"',
    'href="data:image/svg+xml;base64,' + favicon + '"',
)

# CSS
html = html.replace(
    '<link rel="stylesheet" href="assets/style.css" />',
    '<style>\n' + ler('assets/style.css') + '\n</style>',
)

# scripts, na mesma ordem em que o index.html os carrega
for tag in re.findall(r'<script src="(assets/[^"]+)"></script>', html):
    # </script> dentro de string JS quebraria o bloco embutido
    corpo = ler(tag).replace('</script>', '<\\/script>')
    html = html.replace(
        '<script src="' + tag + '"></script>',
        '<script>\n' + corpo + '\n</script>',
    )

restantes = re.findall(r'(?:src|href)="(assets/[^"]+)"', html)
if restantes:
    print('AVISO: referências externas que sobraram: ' + ', '.join(restantes))

SAIDA.write_text(html, encoding='utf-8')
print(str(SAIDA) + '  —  ' + format(len(html.encode('utf-8')) / 1024, '.0f') + ' KB')
