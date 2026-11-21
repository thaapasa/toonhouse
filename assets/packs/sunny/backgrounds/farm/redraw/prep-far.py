"""Covers the thin stripe that the trace drew down the left edge of the far layer.

The stripe is in the color of the trees, and it would show as a line where the
layer runs off the frame. The script covers the outermost pixels on the left and
right with a mirror image of the pixels just inside them.

Usage: prep-far.py <traced far.svg> <out.svg>
"""
import sys

B = 10
src, out = sys.argv[1], sys.argv[2]
text = open(src).read()
head, rest = text.split("<path", 1)
rest, tail = rest.rsplit("</svg>", 1)
mirror = (
    f'<clipPath id="edge-l"><rect x="{B}" y="0" width="{B}" height="1152"/></clipPath>'
    f'<clipPath id="edge-r"><rect x="{2048 - 2 * B}" y="0" width="{B}" height="1152"/></clipPath>'
    f'<use href="#all" clip-path="url(#edge-l)" transform="matrix(-1 0 0 1 {2 * B} 0)"/>'
    f'<use href="#all" clip-path="url(#edge-r)" transform="matrix(-1 0 0 1 {2 * (2048 - B)} 0)"/>'
)
open(out, "w").write(f'{head}<g id="all"><path{rest}</g>{mirror}</svg>{tail}')
