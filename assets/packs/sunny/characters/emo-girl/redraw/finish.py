"""Finishes the redrawn parts of the emo girl.

redraw-image writes the head, the torso and the hands to assets/work/emo/redraw/.
This script makes the parts in assets/packs/sunny/characters/emo-girl/ from them:

- the head in three layers, each with a clip path (see "Hair layers" in LOG.md)
- the torso with the plaid of the skirt
- the hands mirrored, so that the thumbs are on the right side.

Run it from the repo root: python3 assets/packs/sunny/characters/emo-girl/redraw/finish.py
"""

import re

WORK = "assets/work/emo/redraw"
OUT = "assets/packs/sunny/characters/emo-girl"


def read(name):
    with open(f"{WORK}/{name}.svg") as f:
        svg = f.read()
    m = re.match(r"(<svg[^>]*>)\n?(.*?)\n?</svg>\s*$", svg, re.S)
    return m.group(1), m.group(2)


def write(name, head, body):
    with open(f"{OUT}/{name}.svg", "w") as f:
        f.write(f"{head}\n{body}\n</svg>\n")


# The head layers. The two layers under the line reach 8 px above it.
HEAD_CLIPS = {
    "head": ("emo-head-clip", "M-5 -5H320V342L320 342 240 338 200 333 178 328 157 324 140 316 103 305 -5 305Z"),
    "head-front-hair": ("emo-front-hair-clip", "M-5 535V297L103 297 140 308 157 316 157 362 160 400 180 535Z"),
    "head-back-hair": ("emo-back-hair-clip", "M150 316L157 316 178 320 200 325 240 330 320 334V535H180L160 400 157 362 150 362Z"),
}

svg, body = read("head")
for name, (cid, d) in HEAD_CLIPS.items():
    write(name, svg, f'<defs><clipPath id="{cid}"><path d="{d}"/></clipPath></defs>\n<g clip-path="url(#{cid})">\n{body}\n</g>')


# The plaid: two bands that slant down to the right and thin stripes that fan
# out with the pleats, clipped to the skirt. The redrawn plaid of the image came
# out as blotches, so the plaid is drawn here instead.
PLAID_COLOR = "#e05aec"
STRIPE = 4
bands = ["M-5 299L236 313V318L-5 304Z", "M-5 343L236 350V366L-5 359Z"]
# (x at y 280, x at y 415)
stripes = [(60, 46), (95, 87), (137, 136), (170, 177), (200, 212)]
h = STRIPE / 2
plaid = "".join(bands) + "".join(f"M{t - h:g} 280H{t + h:g}L{b + h:g} 415H{b - h:g}Z" for t, b in stripes)

svg, body = read("torso")
m = re.search(r'<path class="c-skirt" fill="[^"]*" d="([^"]*)"/>', body)
group = (
    f'<defs><clipPath id="emo-skirt-clip"><path d="{m.group(1)}"/></clipPath></defs>\n'
    f'<g class="c-skirt-pattern" fill="{PLAID_COLOR}" clip-path="url(#emo-skirt-clip)"><path d="{plaid}"/></g>'
)
write("torso", svg, body[: m.end()] + "\n" + group + body[m.end() :])


for name in ["hand", "hand-open"]:
    svg, body = read(name)
    width = re.search(r'width="([\d.]+)"', svg).group(1)
    write(name, svg, f'<g transform="matrix(-1 0 0 1 {width} 0)">\n{body}\n</g>')
