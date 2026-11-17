# Recolors the pearl of the earring in the traced head.svg before the redraw,
# so that no color has two roles. The pearl had the white of the eye and the
# shade of the hair. Usage: python3 prep-head.py <traced.svg> <out.svg>
import re
import sys

src, out = sys.argv[1], sys.argv[2]
s = open(src).read()
paths = re.findall(r"<path[^>]*/>", s)
recolor = {
    22: "eae6ee",  # the pearl, in the white of the eye
    39: "eae6ee",  # the shade on the pearl, in the shade of the hair
}
for i, color in recolor.items():
    s = s.replace(paths[i], re.sub(r'fill="#[0-9a-f]{6}"', 'fill="#' + color + '"', paths[i]), 1)
open(out, "w").write(s)
