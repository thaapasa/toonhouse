"""Finishes the redrawn torso and open hand of the wizard.

redraw-image writes them to assets/work/wizard/redraw/ in the frames of the
pieces of the parts sheet. The rig expects the frames of the traced parts:

- the torso scaled to 0.9 (see "Splitting and tracing" in LOG.md)
- the open hand mirrored, so that the thumb is on the right side.

Run it from the repo root: python3 assets/characters/wizard/redraw/finish.py
"""

import re

WORK = "assets/work/wizard/redraw"
OUT = "assets/characters/wizard"


def read(name):
    with open(f"{WORK}/{name}.svg") as f:
        svg = f.read()
    m = re.match(r"(<svg[^>]*>)\n?(.*?)\n?</svg>\s*$", svg, re.S)
    return m.group(1), m.group(2)


def write(name, head, body):
    with open(f"{OUT}/{name}.svg", "w") as f:
        f.write(f"{head}\n{body}\n</svg>\n")


TORSO_SCALE = 0.9
svg, body = read("torso")
w, h = (float(re.search(f'{a}="([\\d.]+)"', svg).group(1)) for a in ("width", "height"))
sw, sh = f"{w * TORSO_SCALE:g}", f"{h * TORSO_SCALE:g}"
svg = re.sub(r'viewBox="[^"]*"', f'viewBox="0 0 {sw} {sh}"', svg)
svg = re.sub(r'width="[^"]*"', f'width="{sw}"', svg)
svg = re.sub(r'height="[^"]*"', f'height="{sh}"', svg)
write("torso", svg, f'<g transform="scale({TORSO_SCALE:g})">\n{body}\n</g>')

svg, body = read("hand-open")
width = re.search(r'width="([\d.]+)"', svg).group(1)
write("hand-open", svg, f'<g transform="matrix(-1 0 0 1 {width} 0)">\n{body}\n</g>')
