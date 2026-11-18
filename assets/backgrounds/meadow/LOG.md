# Meadow: work log

A green meadow with flowers, a row of trees behind it, far hills and a blue sky.
The sun and the clouds come from [shared](../shared/LOG.md). Work files are in
`assets/work/bg/`.

## Frame and layers

The frame is 2048×1152 (16:9). Every layer is an SVG with
`viewBox="0 0 2048 1152"`, so the layers line up when stacked.

| Layer        | Depth | What it is                                     |
| ------------ | ----- | ---------------------------------------------- |
| `sky.svg`    | 0     | flat blue `#94d4f4`, opaque                    |
| sun          | 0     | `shared/sun.svg`, moved by the `day` clip      |
| clouds       | 0     | three shared clouds, moved by the `drift` clip |
| `hills.svg`  | 0.2   | two rows of pale rolling hills, top at y ≈ 300 |
| `trees.svg`  | 0.5   | a row of leafy trees, tops at y ≈ 380          |
| `ground.svg` | 1     | grass with flowers, top edge at y ≈ 790        |

The order in the table is the draw order, from far to near. The actors stand on
the grass between y = 800 and the bottom of the frame. A good standing line is y
= 900.

## How the layers were made

Each layer except the sky is a wide strip, generated at 2048×768 or 2048×512
with a transparent background. I put each strip in a transparent 2048×1152 frame
at a scale and a y offset, made the alpha either fully transparent or fully
opaque, and traced the frame with the default settings.

- The hills and the trees stop above the bottom of the frame. To keep the ground
  from showing a gap when the camera moves, I repeated the row 12 px above the
  bottom of the strip down to the bottom of the frame. The ground layer hides
  these rows.
- To make the far layers read as far, I mixed every fill color, outlines
  included, with the sky color: 25 % for the hills and 10 % for the trees.

## Prompts and seeds

- **Hills** (`hills.prompt.json`, seed 2, 2048×768): "a range of low, wide,
  gently rolling grassy hills far away, in pale soft light green and pale sage
  green, two rows of overlapping hills, each hill much wider than it is tall".
  Placed at scale 1.2, x −205, y −110. The first prompt, without "much wider
  than it is tall", gave tall round humps that looked like bushes.
- **Trees** (`trees.prompt.json`, seed 23, 2048×512): round trees in medium and
  light green, some overlapping, "plain shapes with no faces, no eyes and no
  marks". Placed at scale 1, y 310.
  - At 2048×768 without the "no faces" sentence, seeds 1 and 2 drew dots and
    smiles on the crowns that looked like faces.
  - At 2048×768 the trees came out 600 px tall and covered the hills. At
    2048×512 they are about 430 px tall and the hills show between them.
- **Ground** (`ground.prompt.json`, seed 12, 2048×768): a flat bright green
  meadow that "touches the left, right and bottom edges of the image, with no
  border", with grass tufts, small flowers and a small bush at each end. Placed
  at scale 1.1, x −102, y 403, which crops the thin outline at the left edge of
  the strip. Seeds 1 and 2 of the first prompt drew a border around the grass or
  left a haze above it.

## What could be better

- The ground is a large plain green area. It is good for standing on, but it has
  few details below the flowers.
- The hill outlines turn gray-blue when mixed with the sky color.

## Redrawn layers

The hills, the trees and the ground were redrawn with `redraw-image`. This was
the first try of the script on a background. The configs and two scripts are in
`redraw/`. The sources are the traced layers of commit `8ec6416`. To get them
back and redraw a layer, such as the hills:

```sh
mkdir -p assets/work/bg-redraw/traced assets/work/bg-redraw/out
git show 8ec6416:assets/backgrounds/meadow/hills.svg > assets/work/bg-redraw/traced/hills.svg
python3 assets/backgrounds/meadow/redraw/pad.py \
  assets/work/bg-redraw/traced/hills.svg assets/work/bg-redraw/traced/hills-pad.svg
MISE_ENV=art mise run redraw-image -- assets/backgrounds/meadow/redraw/hills.json
python3 assets/backgrounds/meadow/redraw/finish.py \
  assets/work/bg-redraw/out/hills-pad.svg assets/backgrounds/meadow/hills.svg
```

### Padding the frame

`redraw-image` keeps the fills a little inside the silhouette, and it takes the
edge of the frame for the edge of the silhouette. A layer that runs off the
left, right or bottom edge then gets an outline along the frame. `pad.py`
repeats the outermost pixels of the layer 24 px out from the frame before the
redraw, and `finish.py` moves the redrawn paths back into the frame. The paths
reach 24 px past the frame, and the `viewBox` hides that part.

### Colors and roles

The colors are the ones of the traced layers, so the hills and the trees stay
mixed with the sky color.

- Hills: `hill-far` for the back row and `hill` for the front row. The borders
  between the hills are line paths.
- Trees: `grass` for the strip under the trees, `trunk`, `trunk-dark` for the
  darker trunks of the back trees, `leaves` and `leaves-light`. The two lighter
  trunk browns went to `trunk`. The borders between the crowns are line paths.
- Ground: `grass`, `grass-dark` for the dark green inside the grass tufts,
  `flower` for the yellow flowers, `flower-light` for the white ones,
  `flower-alt` for the pink ones and `flower-center`.

### Changes from the traced layers

- Six crowns of the trees had a small curved mark that looked like a smile. The
  trace drew them in a dark green, and the redraw would have drawn them in the
  outline color. The config gives them the color of their crown with `recolor`,
  so they are gone.
- Where the trace drew a border between two crowns of the same color as a faint
  green line, the redraw keeps the line only where it is wide enough. A few of
  these borders are shorter now.
- The ground flowers were blocky in the trace and are round blobs now. The
  darker middle of some yellow flowers went to `flower`.
- The hills and the trees use `smooth` 2. A higher value smoothed away parts of
  the thin borders between the hills.
- The redrawn layers are larger files than the traced ones, because the traced
  files were minified with SVGO and the redrawn ones are not.
