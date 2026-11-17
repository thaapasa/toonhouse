"""Pads a background layer for the redraw.

redraw-image keeps the fills a little inside the silhouette, and it takes the
edge of the frame for the edge of the silhouette. A layer that runs off the
left, right and bottom edges would then get an outline along the frame. This
script repeats the outermost column on each side, the bottom row and the two
bottom corner pixels PAD px out from the frame, so that the frame edge is no longer an edge of the shape.

Usage: python3 pad.py <layer.svg> <padded.svg>

finish.py crops the redrawn SVG back to the frame.
"""

import re
import sys

PAD = 24


def main(src, out):
    text = open(src).read()
    m = re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', text)
    if not m:
        sys.exit(f"{src} has no viewBox at 0 0")
    w, h = float(m.group(1)), float(m.group(2))
    body = re.sub(r"^.*?<svg[^>]*>|</svg>\s*$", "", text, flags=re.S)
    p = PAD
    out_text = f"""<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 {w + 2 * p:g} {h + 2 * p:g}" width="{w + 2 * p:g}" height="{h + 2 * p:g}">
<defs>
<clipPath id="col-left"><rect x="0" y="0" width="1" height="{h:g}"/></clipPath>
<clipPath id="col-right"><rect x="{w - 1:g}" y="0" width="1" height="{h:g}"/></clipPath>
<clipPath id="row-bottom"><rect x="0" y="{h - 1:g}" width="{w:g}" height="1"/></clipPath>
<clipPath id="corner-left"><rect x="0" y="{h - 1:g}" width="1" height="1"/></clipPath>
<clipPath id="corner-right"><rect x="{w - 1:g}" y="{h - 1:g}" width="1" height="1"/></clipPath>
<g id="layer">{body}</g>
<g id="wide">
<use xlink:href="#layer"/>
<g transform="translate({-p:g} 0) scale({p:g} 1)"><use xlink:href="#layer" clip-path="url(#col-left)"/></g>
<g transform="translate({w:g} 0) scale({p:g} 1) translate({-(w - 1):g} 0)"><use xlink:href="#layer" clip-path="url(#col-right)"/></g>
</g>
</defs>
<g transform="translate({p:g} {p:g})">
<use xlink:href="#wide"/>
<g transform="translate(0 {h:g}) scale(1 {p:g}) translate(0 {-(h - 1):g})"><use xlink:href="#layer" clip-path="url(#row-bottom)"/></g>
<g transform="translate({-p:g} {h:g}) scale({p:g}) translate(0 {-(h - 1):g})"><use xlink:href="#layer" clip-path="url(#corner-left)"/></g>
<g transform="translate({w:g} {h:g}) scale({p:g}) translate({-(w - 1):g} {-(h - 1):g})"><use xlink:href="#layer" clip-path="url(#corner-right)"/></g>
</g>
</svg>
"""
    open(out, "w").write(out_text)


if __name__ == "__main__":
    main(*sys.argv[1:])
