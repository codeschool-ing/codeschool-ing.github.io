#!/usr/bin/env python3
"""Builds a single HTML file, with no external dependencies, to send around or open straight
from disk (file://). It inlines the CSS, the six scripts and the favicon.

    python3 tools/bundle/bundle.py  -> showcase.html (at the root)
    python3 bundle.py output.html

The site is still served from index.html + assets/. This file only exists to hand over a copy
that opens with two clicks.
"""
import base64
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).parent
ROOT = HERE.parent.parent  # the site lives at the root; this tool lives in tools/bundle/
OUTPUT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'showcase.html'

html = (ROOT / 'index.html').read_text(encoding='utf-8')


def read(rel):
    return (ROOT / rel).read_text(encoding='utf-8')


# favicon as a data: URI
favicon = base64.b64encode((ROOT / 'assets/favicon.svg').read_bytes()).decode()
html = html.replace(
    'href="assets/favicon.svg"',
    'href="data:image/svg+xml;base64,' + favicon + '"',
)

# CSS
html = html.replace(
    '<link rel="stylesheet" href="assets/style.css" />',
    '<style>\n' + read('assets/style.css') + '\n</style>',
)

# scripts, in the same order index.html loads them
for tag in re.findall(r'<script src="(assets/[^"]+)"></script>', html):
    # a </script> inside a JS string would break the inlined block
    body = read(tag).replace('</script>', '<\\/script>')
    html = html.replace(
        '<script src="' + tag + '"></script>',
        '<script>\n' + body + '\n</script>',
    )

leftovers = re.findall(r'(?:src|href)="(assets/[^"]+)"', html)
if leftovers:
    print('WARNING: external references left behind: ' + ', '.join(leftovers))

OUTPUT.write_text(html, encoding='utf-8')
print(str(OUTPUT) + '  —  ' + format(len(html.encode('utf-8')) / 1024, '.0f') + ' KB')
