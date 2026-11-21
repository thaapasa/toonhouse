# Recolors five paths of the traced head-front.svg before the redraw, so that
# no color has two roles. Usage: python3 prep-head.py <traced.svg> <out.svg>
import re
import sys

src, out = sys.argv[1], sys.argv[2]
s = open(src).read()
paths = re.findall(r"<path[^>]*/>", s)
recolor = {
    34: "320c01",  # the mouth line, in the color of the hair shade
    36: "320c01",  # the curl of the ear, in the color of the hair
    15: "921d0c",  # the fold of the bandana knot, in the color of the hair shade
    38: "b2603a",  # the shadow under the lower lip
    40: "da965a",  # the shadow under the eye
}
for i, color in recolor.items():
    s = s.replace(paths[i], re.sub(r"fill:#[0-9a-f]{6}", "fill:#" + color, paths[i]), 1)
open(out, "w").write(s)
