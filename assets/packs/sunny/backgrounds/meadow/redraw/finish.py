"""Crops a redrawn background layer back to its frame.

The redraw of a layer that pad.py padded has the frame PAD px in from the top
left. This script moves the paths back by PAD and sets the viewBox to the frame.
The paths still reach PAD px past the frame on the sides and at the bottom.
The viewBox hides that part.

Usage: python3 finish.py <redrawn.svg> <layer.svg>
"""

import re
import sys

from pad import PAD


def main(src, out):
    text = open(src).read()
    m = re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', text)
    w, h = float(m.group(1)) - 2 * PAD, float(m.group(2)) - 2 * PAD
    head, rest = text.split(">", 1)
    body = rest.rsplit("</svg>", 1)[0].strip("\n")
    out_text = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:g} {h:g}" width="{w:g}" height="{h:g}">\n'
        f'<g transform="translate({-PAD} {-PAD})">\n{body}\n</g>\n</svg>\n'
    )
    open(out, "w").write(out_text)


if __name__ == "__main__":
    main(*sys.argv[1:])
