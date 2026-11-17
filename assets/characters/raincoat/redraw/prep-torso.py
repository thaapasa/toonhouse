# /// script
# requires-python = ">=3.12"
# dependencies = ["numpy>=2", "opencv-python-headless>=4.10"]
# ///
"""Paints the green halo around the buttons of the torso piece in the color of
the button rim before the redraw, and other greenish pixels below the collar in
the color of the coat. It also paints the dark pixels in the outline color. The halo is where the yellow coat blends into
the blue rim, and it is close to the color of the collar lining, so without this
the buttons get a ring of lining. The lining is only in the collar, above y 76.

Usage: uv run --script prep-torso.py <torso.png> <out.png>
"""

import sys

import cv2
import numpy as np

src, out = sys.argv[1], sys.argv[2]
img = cv2.imread(src, cv2.IMREAD_UNCHANGED)
bgr = img[:, :, :3].astype(np.int32)
# Nearest of the coat, the lining and the rim, in BGR.
refs = np.array([[0x0B, 0xDD, 0xFC], [0x8C, 0xD2, 0xB7], [0x59, 0xD5, 0xCF], [0xD8, 0xC2, 0x51]])
dist = ((bgr[:, :, None, :] - refs[None, None]) ** 2).sum(-1)
nearest = dist.argmin(-1)
greenish = (nearest == 1) | (nearest == 2)
greenish[:76] = False
# The halo is next to the rim. Other greenish pixels below the collar lie
# along the outline, where the coat blends into the background, and go to the coat.
rim = (nearest == 3).astype(np.uint8)
near_rim = cv2.dilate(rim, np.ones((3, 3), np.uint8)) > 0
img[greenish & near_rim, :3] = (0xD8, 0xC2, 0x51)
img[greenish & ~near_rim, :3] = (0x01, 0xDC, 0xFD)
# The outline is thin, and where it blends into the coat its pixels come out
# olive, close to the seams. Every pixel darker than the seams goes to the outline,
# as in tools/clean.ts of the first trace.
lum = 0.3 * bgr[:, :, 2] + 0.59 * bgr[:, :, 1] + 0.11 * bgr[:, :, 0]
img[lum < 120, :3] = (0x02, 0x12, 0x2A)
cv2.imwrite(out, img)
