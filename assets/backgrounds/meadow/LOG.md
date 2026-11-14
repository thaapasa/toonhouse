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
