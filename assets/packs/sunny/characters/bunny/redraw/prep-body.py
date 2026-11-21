"""Cleans up the traced body.svg before the redraw.

The line of the haunch is three traced pieces of different widths, and they
come out of the redraw as a wavy line. This script replaces them with one
stroke in the outline color. It also starts the stroke that closes the cut
outline a little higher up, so that no notch shows where it meets the traced
outline. See "Body without the hind foot" in LOG.md for the cut.

Run it from the repo root:
  python3 assets/packs/sunny/characters/bunny/redraw/prep-body.py \\
    assets/work/bunny/traced/body.svg assets/work/bunny/traced/body-prep.svg
"""

import re
import sys

HAUNCH = "M200 123C218 127 234 146 241 175C245 195 246 215 243 234Q240 250 232 263"

src, out = sys.argv[1], sys.argv[2]
s = open(src).read()
n = len(s)
# The traced pieces of the line of the haunch.
s = re.sub(r'<path fill="#6d3511" d="[^"]*"/>', "", s)
s = re.sub(r'<path fill="#804116" d="[^"]*"/>', "", s)
s = re.sub(
    r'<path fill="none" stroke="#6d3511"[^>]*/>',
    # A patch of fur covers a wedge of the old line that sticks out of the new one.
    '<path fill="#e6a761" d="M234 200H243V224H234Z"/>'
    f'<path fill="none" stroke="#472618" stroke-width="6" stroke-linecap="round" d="{HAUNCH}"/>',
    s,
)
s = s.replace('d="M291 238C270 262', 'd="M298 230L291 238C270 262')
assert len(s) != n and HAUNCH in s and "M298 230" in s
open(out, "w").write(s)
