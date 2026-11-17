# /// script
# requires-python = ">=3.12"
# dependencies = ["numpy>=2", "opencv-python-headless>=4.10", "potracer>=0.0.4"]
# ///
"""Redraws an image or a traced SVG as a clean SVG with one silhouette in the
outline color and one path per fill color on top of it.

Usage:
  redraw-image init <source> <config.json> [--colors N]
      Find the main colors of the source and write a starting config.
  redraw-image <config.json> [--debug]
      Redraw the source as the config says. --debug also writes
      <out>.labels.png, which shows the layer of every pixel.
  redraw-image compare <a.svg> <b.svg> <out.png> [--width PX] [--crop X0,Y0,X1,Y1]
      Render two SVGs side by side on blue. The crop is in the units of a.svg.

Run it from the repo root. The paths in the config are relative to the root.

The config:
  src         A PNG with an alpha channel, or an SVG.
  out         The SVG to write.
  layers      The colors from the bottom up. The first layer is the outline.
              Each layer has:
                name    the role of the color, in kebab case. The path gets
                        the class c-<name>, so that the app can recolor it.
                color   the fill of the layer in the output
                also    other source colors that belong to this layer
                covers  names of layers above this one that it lies under
                        completely, such as a shirt under its stripes
  scale       Work at this many times the size of the source (default 4).
  smooth      How much to smooth the edges, in px of the output (0.75).
  minLine     Outline-colored lines thinner than this between two fills are
              seams and go to the fills (1.5).
  edge        Fills stay this far inside the silhouette (1.5).
  under       A fill reaches this far under the fills above it (3).
  minArea     Patches smaller than this take the color around them (40).
  speckle     Potrace drops paths smaller than this, in px of the work
              image (20).
  alphamax    Potrace corner threshold: higher means rounder (1.1).
  opttolerance  Potrace curve tolerance: higher means fewer nodes (1.5).
  lines       Make each line inside the outline its own path, such as a mouth,
              a crease or the border between the hair and the face. The line
              is drawn on top of the fills, which close under it. Off by
              default. An object with:
                maxWidth  wider dark areas stay part of the outline (8)
                minArea   smaller lines stay part of the outline (10)
                minFill   the share of the border of a line that must be
                          fill, not outline (0.85)
All sizes are in px of the output frame unless the line says otherwise.
"""

import json
import os
import re
import subprocess
import sys
import tempfile

import cv2
import numpy as np
import potrace

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BLUE = "#50a0dc"


def render_svg(svg, png, width, background=None):
    cmd = ["node", os.path.join(ROOT, "scripts/render-svg.ts"), svg, png, "--width", str(width)]
    if background:
        cmd += ["--background", background]
    subprocess.run(cmd, check=True, capture_output=True)


def svg_size(svg):
    m = re.search(r'viewBox="\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)', open(svg).read())
    if not m:
        sys.exit(f"{svg} has no viewBox")
    return float(m.group(1)), float(m.group(2))


def load_source(src, scale):
    """Returns the BGRA work image and the size of the output frame."""
    if src.endswith(".svg"):
        w, h = svg_size(src)
        with tempfile.TemporaryDirectory() as tmp:
            png = os.path.join(tmp, "src.png")
            render_svg(src, png, round(w * scale))
            img = cv2.imread(png, cv2.IMREAD_UNCHANGED)
        return img, w, h
    img = cv2.imread(src, cv2.IMREAD_UNCHANGED)
    if img is None:
        sys.exit(f"Can't read {src}")
    if img.shape[2] == 3:
        img = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
    h, w = img.shape[:2]
    return cv2.resize(img, (w * scale, h * scale), interpolation=cv2.INTER_CUBIC), w, h


def hex_bgr(c):
    c = c.lstrip("#")
    return [int(c[4:6], 16), int(c[2:4], 16), int(c[0:2], 16)]


def bgr_hex(b):
    return "#%02x%02x%02x" % (int(b[2]), int(b[1]), int(b[0]))


def to_lab(colors):
    return cv2.cvtColor(np.uint8([colors]), cv2.COLOR_BGR2LAB)[0].astype(np.float32)


def blur(mask, sigma):
    return cv2.GaussianBlur(mask.astype(np.float32), (0, 0), sigma)


def disk(r):
    r = max(1, int(round(r)))
    return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))


def inside_distance(mask):
    """Distance of each pixel of the mask to the nearest pixel outside it."""
    padded = np.pad(mask, 1).astype(np.uint8)
    return cv2.distanceTransform(padded, cv2.DIST_L2, 5)[1:-1, 1:-1]


def argmax_blurred(label, n, sigma, where):
    """Smooths the borders between layers: blurs the mask of each layer and
    gives every pixel the layer with the highest value."""
    best = np.full(label.shape, -1.0, np.float32)
    out = np.full(label.shape, -1, np.int32)
    for i in range(n):
        b = blur(label == i, sigma)
        take = b > best
        best[take] = b[take]
        out[take] = i
    return np.where(where, out, -1)


def classify(img, layers):
    """Gives each pixel the layer of the nearest source color, in Lab."""
    lab = cv2.cvtColor(img[:, :, :3], cv2.COLOR_BGR2LAB).astype(np.float32)
    best = np.full(lab.shape[:2], np.inf, np.float32)
    label = np.zeros(lab.shape[:2], np.int32)
    for i, layer in enumerate(layers):
        for ref in to_lab([hex_bgr(c) for c in [layer["color"]] + layer.get("also", [])]):
            d = ((lab - ref) ** 2).sum(-1)
            take = d < best
            best[take] = d[take]
            label[take] = i
    return label


def redraw(cfg, debug=False):
    S = int(cfg.get("scale", 4))
    layers = cfg["layers"]
    for layer in layers:
        if not re.fullmatch(r"[a-z][a-z0-9]*(-[a-z0-9]+)*", layer.get("name", "")):
            sys.exit(f"Layer names must be in kebab case, such as shirt-logo: {layer.get('name')!r}")
    n = len(layers)
    img, W, H = load_source(cfg["src"], S)
    smooth = cfg.get("smooth", 0.75) * S

    label = classify(img, layers)
    alpha = img[:, :, 3].astype(np.float32) / 255
    sil = blur(alpha, smooth / 2) > 0.5
    label = argmax_blurred(np.where(sil, label, -1), n, smooth, sil)

    # Fills stay inside the silhouette, so the outline runs all the way round.
    edge = cfg.get("edge", 1.5) * S
    if edge > 0:
        label[sil & (inside_distance(sil) <= edge)] = 0

    # Thin outline-colored lines between fills are seams from tracing.
    min_line = cfg.get("minLine", 1.5) * S
    if min_line > 0 and n > 1:
        k = disk(min_line / 2)
        outline = (label == 0).astype(np.uint8)
        thin = (outline > 0) & ~cv2.morphologyEx(outline, cv2.MORPH_OPEN, k).astype(bool)
        thin &= ~(cv2.erode(sil.astype(np.uint8), k) == 0)
        if thin.any():
            fills = argmax_blurred(np.where(label > 0, label, -1), n, min_line, sil)
            label[thin & (fills > 0)] = fills[thin & (fills > 0)]

    # Small patches take the most common layer around them.
    min_area = cfg.get("minArea", 40) * S * S
    for _ in range(3):
        changed = False
        for i in range(n):
            count, comp, stats, _ = cv2.connectedComponentsWithStats((label == i).astype(np.uint8), connectivity=8)
            for k in range(1, count):
                if stats[k, cv2.CC_STAT_AREA] >= min_area:
                    continue
                x, y, w, h = stats[k, :4]
                y0, y1, x0, x1 = max(0, y - 1), y + h + 1, max(0, x - 1), x + w + 1
                patch = comp[y0:y1, x0:x1] == k
                ring = cv2.dilate(patch.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool) & ~patch
                around = label[y0:y1, x0:x1][ring]
                around = around[around >= 0]
                if len(around):
                    label[y0:y1, x0:x1][patch] = np.bincount(around, minlength=n).argmax()
                    changed = True
        if not changed:
            break

    # Lines inside the outline become paths of their own. The fills close
    # under each line, so that a line can move or go away without a hole.
    lines = []
    opts = cfg.get("lines")
    if opts is not None and n > 1:
        outline = (label == 0).astype(np.uint8)
        max_w = opts.get("maxWidth", 8) * S
        # A line has a fill on both sides, so closing the fills covers it. The
        # outline along the edge has the background on one side and stays.
        closed = cv2.morphologyEx((label > 0).astype(np.uint8), cv2.MORPH_CLOSE, disk(max_w / 2)).astype(bool)
        inner = (outline > 0) & closed
        width = cv2.distanceTransform(outline, cv2.DIST_L2, 5)
        min_area = opts.get("minArea", 10) * S * S
        count, comp, stats, _ = cv2.connectedComponentsWithStats(inner.astype(np.uint8), connectivity=8)
        for k in range(1, count):
            x, y, w, h, area = stats[k]
            m = comp[y : y + h, x : x + w] == k
            if area < min_area or 2 * width[y : y + h, x : x + w][m].max() > max_w:
                continue
            # A line lies in the fills, so most of its border is fill. A sliver
            # off the side of the outline borders the rest of the outline.
            y0, x0 = max(0, y - 2), max(0, x - 2)
            box = comp[y0 : y + h + 2, x0 : x + w + 2] == k
            ring = cv2.dilate(box.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool) & ~box
            if (label[y0 : y + h + 2, x0 : x + w + 2][ring] > 0).mean() < opts.get("minFill", 0.85):
                continue
            mask = np.zeros_like(inner)
            mask[y : y + h, x : x + w] = m
            lines.append(mask)
        if lines:
            all_lines = np.any(lines, axis=0)
            # Each line reaches a little into the outline around it, so that no
            # seam shows where it meets the outline along the edge.
            grow = disk(opts.get("overlap", 1) * S)
            lines = [m | (cv2.dilate(m.astype(np.uint8), grow).astype(bool) & (outline > 0)) for m in lines]
            fills = argmax_blurred(np.where(label > 0, label, -1), n, max_w, sil)
            take = all_lines & (fills > 0)
            label[take] = fills[take]

    def trace(mask):
        paths = potrace.Bitmap(~mask).trace(
            turdsize=cfg.get("speckle", 20),
            alphamax=cfg.get("alphamax", 1.1),
            opticurve=True,
            opttolerance=cfg.get("opttolerance", 1.5),
        )

        def pt(p):
            return f"{p.x / S:.1f} {p.y / S:.1f}"

        d = ""
        for curve in paths:
            d += "M" + pt(curve.start_point)
            for seg in curve.segments:
                if seg.is_corner:
                    d += f"L{pt(seg.c)}L{pt(seg.end_point)}"
                else:
                    d += f"C{pt(seg.c1)} {pt(seg.c2)} {pt(seg.end_point)}"
            d += "Z"
        return d.replace(".0 ", " ").replace(".0C", "C").replace(".0L", "L").replace(".0Z", "Z")

    def path(layer, mask):
        return f'<path class="c-{layer["name"]}" fill="{layer["color"]}" d="{trace(mask)}"/>'

    out = [path(layers[0], sil)]
    under = disk(cfg.get("under", 3) * S)
    for i in range(1, n):
        own = label == i
        if not own.any():
            continue
        above = label > i
        # The fill reaches under the fills above it, so that no seam shows.
        mask = own | (cv2.dilate(own.astype(np.uint8), under).astype(bool) & above)
        covers = [j for j, l in enumerate(layers) if l.get("name") in layers[i].get("covers", [])]
        if covers:
            count, comp = cv2.connectedComponents((own | np.isin(label, covers)).astype(np.uint8), connectivity=8)
            keep = np.unique(comp[own])
            mask |= np.isin(comp, keep[keep > 0])
        # Holes with only upper fills in them are filled too.
        count, comp, stats, _ = cv2.connectedComponentsWithStats((~mask).astype(np.uint8), connectivity=4)
        for k in range(1, count):
            x, y, w, h = stats[k, :4]
            if x == 0 or y == 0 or x + w == mask.shape[1] or y + h == mask.shape[0]:
                continue
            hole = comp[y : y + h, x : x + w] == k
            if (label[y : y + h, x : x + w][hole] > i).all():
                mask[y : y + h, x : x + w] |= hole
        out.append(path(layers[i], mask))

    for mask in lines:
        out.append(path(layers[0], mask))

    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:g} {H:g}" width="{W:g}" height="{H:g}">\n'
        + "\n".join(out)
        + "\n</svg>\n"
    )
    with open(cfg["out"], "w") as f:
        f.write(svg)
    if debug:
        colors = np.array([hex_bgr(l["color"]) for l in layers] + [[255, 255, 255]], np.uint8)
        cv2.imwrite(cfg["out"] + ".labels.png", colors[label])
    print(f'{cfg["out"]} ({len(svg)} bytes)')
    for line in out:
        m = re.search(r'fill="(#\w+)" d="([^"]*)"', line)
        if m:
            print(f"  {m.group(1)}: {m.group(2).count('M')} shapes, {len(re.findall('[CL]', m.group(2)))} segments")
    if lines:
        print(f"  the last {len(lines)} paths are lines")


def init(src, config, count):
    img, _, _ = load_source(src, 1)
    px = img[img[:, :, 3] > 250][:, :3]
    if len(px) == 0:
        sys.exit("The source has no opaque pixels")
    if len(px) > 200000:
        px = px[np.random.default_rng(0).choice(len(px), 200000, replace=False)]
    lab = cv2.cvtColor(px[None], cv2.COLOR_BGR2LAB)[0].astype(np.float32)
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 50, 0.5)
    cv2.setRNGSeed(0)
    _, labels, centers = cv2.kmeans(lab, count, None, criteria, 3, cv2.KMEANS_PP_CENTERS)
    shares = np.bincount(labels.ravel(), minlength=count) / len(labels)
    bgr = cv2.cvtColor(np.clip(centers, 0, 255).astype(np.uint8)[None], cv2.COLOR_LAB2BGR)[0]
    darkest = int(centers[:, 0].argmin())
    rest = sorted((i for i in range(count) if i != darkest), key=lambda i: -shares[i])
    layers = [{"name": "outline", "color": bgr_hex(bgr[darkest])}] + [
        {"name": f"fill{k + 1}", "color": bgr_hex(bgr[i])} for k, i in enumerate(rest)
    ]
    out = os.path.splitext(config)[0] + ".svg"
    with open(config, "w") as f:
        json.dump({"src": src, "out": out, "layers": layers}, f, indent=2)
    print(f"{config}: outline, then the fills from the largest down")
    for i in [darkest] + rest:
        print(f"  {bgr_hex(bgr[i])} {shares[i] * 100:5.1f} %")


def compare(a, b, out, width, crop):
    imgs = []
    with tempfile.TemporaryDirectory() as tmp:
        for i, f in enumerate([a, b]):
            png = os.path.join(tmp, f"{i}.png")
            render_svg(f, png, width, BLUE)
            imgs.append(cv2.imread(png))
    if crop:
        k = width / svg_size(a)[0]
        x0, y0, x1, y1 = [int(float(v) * k) for v in crop.split(",")]
        imgs = [m[y0:y1, x0:x1] for m in imgs]
    h = max(m.shape[0] for m in imgs)
    imgs = [cv2.copyMakeBorder(m, 0, h - m.shape[0], 0, 0, cv2.BORDER_CONSTANT, value=(255, 255, 255)) for m in imgs]
    cv2.imwrite(out, np.hstack([imgs[0], np.full((h, 10, 3), 255, np.uint8), imgs[1]]))
    print(out)


def option(args, name, default=None):
    if name in args:
        i = args.index(name)
        value = args[i + 1]
        del args[i : i + 2]
        return value
    return default


def main():
    args = sys.argv[1:]
    if not args or args[0] in ("-h", "--help"):
        print(__doc__)
        return
    if args[0] == "init":
        count = int(option(args, "--colors", "6"))
        if len(args) != 3:
            sys.exit("Usage: redraw-image init <source> <config.json> [--colors N]")
        init(args[1], args[2], count)
    elif args[0] == "compare":
        width = int(option(args, "--width", "800"))
        crop = option(args, "--crop")
        if len(args) != 4:
            sys.exit("Usage: redraw-image compare <a.svg> <b.svg> <out.png> [--width PX] [--crop X0,Y0,X1,Y1]")
        compare(args[1], args[2], args[3], width, crop)
    else:
        debug = "--debug" in args
        args = [a for a in args if a != "--debug"]
        if len(args) != 1:
            sys.exit("Usage: redraw-image <config.json> [--debug]")
        redraw(json.load(open(args[0])), debug)


if __name__ == "__main__":
    main()
