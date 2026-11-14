# Farm: work log

A farmyard with a red barn, a silo, a farmhouse and a haystack, a wooden fence,
fields on far hills and a blue sky. The sun and the clouds come from
[shared](../shared/LOG.md). Work files are in `assets/work/bg/`.

## Frame and layers

The frame is 2048×1152 (16:9). Every layer is an SVG with
`viewBox="0 0 2048 1152"`.

| Layer        | Depth | What it is                                                 |
| ------------ | ----- | ---------------------------------------------------------- |
| `sky.svg`    | 0     | flat blue `#9fd8f2`, opaque                                |
| sun          | 0     | `shared/sun.svg`, moved by the `day` clip                  |
| clouds       | 0     | three shared clouds, moved by the `drift` clip             |
| `far.svg`    | 0.2   | rolling hills with a patchwork of fields, top at y ≈ 470   |
| `middle.svg` | 0.5   | barn, silo, farmhouse, trees and haystack on a grassy rise |
| `ground.svg` | 1     | a wooden fence (y ≈ 720 to 790) and grass in front of it   |

The order in the table is the draw order, from far to near. The actors stand on
the grass in front of the fence, between y = 800 and the bottom of the frame. A
good standing line is y = 900.

## How the layers were made

The same way as the [meadow](../meadow/LOG.md): each strip was generated at
2048×768 with a transparent background, put in the 2048×1152 frame at a scale
and a y offset, and traced with the default settings. The far and the middle
layers repeat a row near the bottom of the strip down to the bottom of the
frame. The far layer is mixed 35 % with the sky color.

## Prompts and seeds

- **Far** (`far.prompt.json`, seed 2): low rolling hills "covered with a
  patchwork of farm fields in pale colors: pale yellow wheat fields, pale green
  meadows and light tan ploughed fields", with small trees along the field
  edges. Placed at scale 1, y 0. Seed 1 had an outline along the left and right
  edges.
- **Middle** (`middle.prompt.json`, seed 1): a farmyard on a low grassy rise
  with a red barn with a white X on its doors, a gray silo, a small yellow
  farmhouse with a red roof, round trees and a golden haystack. Placed at scale
  1, y 140. Seed 2 had the buildings on a flat strip that read less as a rise.
- **Ground** (`ground.prompt.json`, seed 34): grass that touches the edges with
  no border, a low light brown fence with two rails along its top edge, and
  tufts, flowers and pebbles in front of the fence. Placed at scale 1.05, x −51,
  y 555. Without the tufts and flowers in the prompt, seeds 1 and 2 gave plain
  green, and seed 33 left a wide margin on both sides.

## What could be better

- The farmhouse is small next to the barn.
- The grass in front of the fence is still mostly plain green.
