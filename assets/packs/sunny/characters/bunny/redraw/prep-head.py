# /// script
# requires-python = ">=3.12"
# dependencies = ["numpy>=2", "opencv-python-headless>=4.10"]
# ///
"""Recolors the head piece before the redraw, so that no color has two roles.

The pupil, the ring around the eye and the smile are all near black in the
piece, but only the pupil should be black. This script paints the near-black
pixels outside the pupil in the outline color.

Run it from the repo root:
  MISE_ENV=art mise exec -- uv run --script assets/packs/sunny/characters/bunny/redraw/prep-head.py \\
    assets/work/bunny/pieces/head.png assets/work/bunny/redraw/head-prep.png
"""

import sys

import cv2
import numpy as np

PUPIL = np.array([0x02, 0x06, 0x13], np.float32)  # BGR of #130602
OUTLINE = np.array([0x0D, 0x1B, 0x3E], np.float32)  # BGR of #3e1b0d
# The pupil, in px of the piece. Its right edge touches the ring of the eye.
CX, CY, RX, RY = 201, 127, 21.5, 30

src, out = sys.argv[1], sys.argv[2]
img = cv2.imread(src, cv2.IMREAD_UNCHANGED)
bgr = img[:, :, :3].astype(np.float32)
h, w = img.shape[:2]
y, x = np.mgrid[0:h, 0:w]
inside = ((x + 0.5 - CX) / RX) ** 2 + ((y + 0.5 - CY) / RY) ** 2 <= 1
black = np.linalg.norm(bgr - PUPIL, axis=2) < np.linalg.norm(bgr - OUTLINE, axis=2)
img[black & ~inside, :3] = OUTLINE.astype(np.uint8)
cv2.imwrite(out, img)
