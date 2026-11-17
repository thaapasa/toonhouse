# Recolors the far edge of the cardigan in the traced torso.svg before the
# redraw. It had the dark teal of the lines on the cardigan, so it would have
# become a thick outline along the back of the dress.
# Usage: python3 prep-torso.py <traced.svg> <out.svg>
import re
import sys

src, out = sys.argv[1], sys.argv[2]
s = open(src).read()
paths = re.findall(r"<path[^>]*/>", s)
recolor = {
    15: "00b2af",  # the far edge of the cardigan, in the color of its lines
}
for i, color in recolor.items():
    s = s.replace(paths[i], re.sub(r'fill="#[0-9a-f]{6}"', 'fill="#' + color + '"', paths[i]), 1)
open(out, "w").write(s)
