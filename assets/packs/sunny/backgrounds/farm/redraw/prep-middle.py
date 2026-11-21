# /// script
# dependencies = ["svgelements"]
# ///
"""Sorts the paths of the traced middle layer into color roles before the redraw.

The trace draws several roles in one color: the dark brown of the tree trunks
also draws the antialiased edges around every shape, the red of the barn also
draws the roof of the farmhouse, the green of the grass also draws the tree
crowns, and the yellows of the farmhouse and the haystack mix. This script gives
each role its own color, by where the path is.

Usage: prep-middle.py <traced middle.svg> <out.svg>
"""
import re
import sys

from svgelements import SVG, Path

OUTLINE = "#3e3313"
TRUNK = "#5e3a10"
# Placeholders that the redraw config maps to their roles.
BARN = "#d80202"
ROOF = "#2020ff"
LEAVES = "#00ffc0"
WALL = "#f0bb1a"
HAY = "#efa915"
HAY_LIGHT = "#ff80ff"
FRAME = "#9c7d3b"

# The trunks, below the crowns and above the grass line.
TRUNKS = [(1265, 655, 1325, 734), (1440, 688, 1480, 734)]

src, out = sys.argv[1], sys.argv[2]
text = open(src).read()
boxes = [e.bbox() for e in SVG.parse(src).elements() if isinstance(e, Path)]
tags = list(re.finditer(r"<path[^>]*>", text))
assert len(tags) == len(boxes), (len(tags), len(boxes))


def role(fill, box):
    x0, y0, x1, y1 = box
    house = x0 >= 740 and x1 <= 1000
    hay = x0 >= 1590
    if fill == "#5e3a10":
        return "trunk"
    if fill in ("#d00002", "#db0000", "#db0c0d", "#e40808", "#d85610"):
        return ROOF if house else BARN
    if fill == "#4dab26" and x0 >= 1190 and x1 <= 1550 and y1 < 700:
        return LEAVES
    if fill == "#9c7d3b" and hay:
        return HAY
    if fill in ("#dc9826", "#efa915", "#f0bb1a"):
        if house and y1 < 540:
            return FRAME  # the chimney
        if house:
            return WALL
        if hay:
            return HAY_LIGHT if fill == "#f0bb1a" else HAY
    return None


clips = "".join(
    f'<rect x="{a}" y="{b}" width="{c - a}" height="{d - b}"/>' for a, b, c, d in TRUNKS
)
parts = [text[: tags[0].start()].replace(
    ">", f'><defs><clipPath id="trunks">{clips}</clipPath></defs>', 1
)]
for i, (m, box) in enumerate(zip(tags, boxes)):
    tag = m.group(0)
    fill = re.search(r'fill="([^"]*)"', tag).group(1).lower()
    r = role(fill, box)
    if r == "trunk":
        parts.append(tag.replace(fill, OUTLINE))
        parts.append(tag.replace("<path", '<path clip-path="url(#trunks)"'))
    elif r:
        parts.append(tag.replace(fill, r))
    else:
        parts.append(tag)
    end = tags[i + 1].start() if i + 1 < len(tags) else len(text)
    parts.append(text[m.end() : end])

# The trace drew a thin outline down the left and right edges of the frame,
# which would show as a line where the layer runs off the frame. Cover it with
# a mirror image of the pixels just inside it.
body = "".join(parts)
head, rest = body.split("<path", 1)
rest, tail = rest.rsplit("</svg>", 1)
B = 6
mirror = (
    f'<clipPath id="edge-l"><rect x="{B}" y="0" width="{B}" height="1152"/></clipPath>'
    f'<clipPath id="edge-r"><rect x="{2048 - 2 * B}" y="0" width="{B}" height="1152"/></clipPath>'
    f'<use href="#all" clip-path="url(#edge-l)" transform="matrix(-1 0 0 1 {2 * B} 0)"/>'
    f'<use href="#all" clip-path="url(#edge-r)" transform="matrix(-1 0 0 1 {2 * (2048 - B)} 0)"/>'
    # A small hole of sky in the curl of the outline at the left edge.
    f'<rect x="1" y="758" width="10" height="4" fill="{OUTLINE}"/>'
)
open(out, "w").write(f'{head}<g id="all"><path{rest}</g>{mirror}</svg>{tail}')
