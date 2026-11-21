# /// script
# requires-python = ">=3.12"
# dependencies = ["numpy>=2", "opencv-python-headless>=4.10"]
# ///
"""Splits the grey shades of the head piece between the hat and the hair.

The hat and the beard share some blue-grey shades: the light streaks on the hat
are almost the color of the beard, and the strands of the beard have the color
of the hat shade. redraw-image picks the layer by color only, so this script
paints the grey pixels above the lower edge of the brim in the hat color and
the grey pixels below it in the hair color.

Usage, from the repo root:
  MISE_ENV=art mise exec -- uv run --script assets/packs/sunny/characters/wizard/redraw/prep-head.py \
    assets/work/wizard/pieces/head.png assets/work/wizard/redraw/head-prep.png
"""

import sys

import cv2
import numpy as np

HAT = "#8fa1a9"
HAIR = "#dad9cc"
# The greys of the hat and the beard. Other colors keep their pixels.
GREYS = ["#8fa2a9", "#7a8e96", "#728187", "#a8b4b5", "#ddddd1", "#cbcdc4"]
# The colors that stay as they are, so that a grey pixel is only one that is
# nearer to a grey than to any of these.
OTHERS = ["#2e1e17", "#3f3024", "#46494a", "#684929", "#f6bc72", "#dea25b", "#a27748", "#fdfdfd"]
# The dark shades under the brim and of the band around the hat. They stay as
# they are on the hat, and go to the hair below the brim, where they draw the
# strands of the beard.
DARK = ["#5e7179", "#4f5e65"]

# The lower edge of the brim, from the left tip to the right tip. The hat is
# above it, and the hair and the face below it.
BRIM_EDGE = [
    (0, 340),
    (75, 335),
    (90, 312),
    (93, 283),
    (110, 272),
    (130, 262),
    (150, 243),
    (200, 228),
    (222, 222),
    (232, 242),
    (248, 244),
    (252, 262),
    (270, 262),
    (307, 230),
]


def lab(colors):
    bgr = np.array([[[int(c[5:7], 16), int(c[3:5], 16), int(c[1:3], 16)] for c in colors]], np.uint8)
    return cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)[0].astype(np.float32)


def main(src, out):
    img = cv2.imread(src, cv2.IMREAD_UNCHANGED)
    h, w = img.shape[:2]
    refs = lab(GREYS + DARK + OTHERS)
    px = cv2.cvtColor(img[:, :, :3], cv2.COLOR_BGR2LAB).reshape(-1, 3).astype(np.float32)
    nearest = np.argmin(((px[:, None, :] - refs[None, :, :]) ** 2).sum(axis=2), axis=1).reshape(h, w)
    grey = nearest < len(GREYS)
    dark = (nearest >= len(GREYS)) & (nearest < len(GREYS) + len(DARK))

    hat_area = np.zeros((h, w), np.uint8)
    poly = np.array([(0, 0), (w, 0)] + BRIM_EDGE[::-1], np.int32)
    cv2.fillPoly(hat_area, [poly], 1)
    hat_area = hat_area.astype(bool)

    def bgr(c):
        return [int(c[5:7], 16), int(c[3:5], 16), int(c[1:3], 16)]

    img[grey & hat_area, :3] = bgr(HAT)
    img[(grey | dark) & ~hat_area, :3] = bgr(HAIR)
    cv2.imwrite(out, img)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
