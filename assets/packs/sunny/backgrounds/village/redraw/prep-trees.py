"""Closes the 2 px gap at the left edge of the grass in the traced trees layer.

The traced grass starts at x = 2, and the redraw would draw an outline along
that gap. This adds a grass rectangle from x = 0 under the traced paths.

Usage: python3 prep-trees.py <traced trees.svg> <out.svg>
"""

import re
import sys

src, out = sys.argv[1], sys.argv[2]
svg = open(src).read()
patch = '<path fill="#70ad72" d="M0 796h8v356H0z"/>'
svg = re.sub(r"(<svg[^>]*>)", r"\1" + patch, svg, count=1)
open(out, "w").write(svg)
