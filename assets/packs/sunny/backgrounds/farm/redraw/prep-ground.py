"""Splits the mid brown of the traced ground layer into grain and outline.

The trace draws the wood grain on the fence posts and the lower edges of the
rails in the same mid brown. This script gives the brown the outline color
around the rails, so that the rails get an even outline. It keeps the brown
inside the posts as grain, and below the fence, where it draws a pebble and the
middle of a flower.

Usage: prep-ground.py <traced ground.svg> <out.svg>
"""
import re
import sys

OUTLINE = "#4c2914"
GRAIN = "#8a603b"
# The posts, from the left edge of their outline to the right edge.
POSTS = [
    (114, 136), (306, 327), (447, 468), (565, 587), (695, 718), (842, 863),
    (997, 1019), (1137, 1158), (1300, 1321), (1492, 1513), (1687, 1709),
    (1881, 1903),
]
INSET = 3

src, out = sys.argv[1], sys.argv[2]
text = open(src).read()
rects = "".join(
    f'<rect x="{a + INSET}" y="700" width="{b - a - 2 * INSET}" height="110"/>'
    for a, b in POSTS
) + '<rect x="0" y="805" width="2048" height="347"/>'

text = text.replace(">", f'><defs><clipPath id="posts">{rects}</clipPath></defs>', 1)


def split(m):
    tag = m.group(0)
    if f'fill="{GRAIN}"' not in tag:
        return tag
    return tag.replace(GRAIN, OUTLINE) + tag.replace("<path", '<path clip-path="url(#posts)"')


open(out, "w").write(re.sub(r"<path[^>]*>", split, text))
