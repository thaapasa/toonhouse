# Recolors paths of the traced parts before the redraw, so that no color has two
# roles. Usage: python3 prep.py <part> <traced.svg> <out.svg>
import re
import sys

RECOLOR = {
    "head": {
        22: "c37f44",  # the line down the neck, in the color of the line under the eye
    },
    "torso": {
        17: "3e0902",  # four folds of the sash, in the color of the trousers
        20: "3e0902",
        28: "3e0902",
        31: "3e0902",
        37: "121817",  # the shadow under the collar, in the color of the trouser crease
    },
    "foot": {
        17: "12110f",  # the line above the sole, in the color of the inside of the boot
    },
}

part, src, out = sys.argv[1], sys.argv[2], sys.argv[3]
s = open(src).read()
paths = re.findall(r"<path[^>]*/>", s)
for i, color in RECOLOR[part].items():
    s = s.replace(paths[i], re.sub(r'fill="#[0-9a-f]{6}"', f'fill="#{color}"', paths[i]), 1)
open(out, "w").write(s)
