# Village: work log

The edge of a village: a dirt road in front, a row of pastel houses on a low
green hill, tall trees behind the houses and a blue sky. The sun and the clouds
come from [shared](../shared/LOG.md). Work files are in `assets/work/bg/`.

## Frame and layers

The frame is 2048×1152 (16:9). Every layer is an SVG with
`viewBox="0 0 2048 1152"`.

| Layer        | Depth | What it is                                                  |
| ------------ | ----- | ----------------------------------------------------------- |
| `sky.svg`    | 0     | flat blue `#8fcff0`, opaque                                 |
| sun          | 0     | `shared/sun.svg`, moved by the `day` clip                   |
| clouds       | 0     | three shared clouds, moved by the `drift` clip              |
| `trees.svg`  | 0.25  | round and poplar trees behind the village, tops at y ≈ 240  |
| `houses.svg` | 0.45  | small houses and a church tower on a hill, roofs at y ≈ 380 |
| `ground.svg` | 1     | a grass verge (y ≈ 790 to 840) and a sandy road below it    |

The order in the table is the draw order, from far to near. The actors stand on
the road, between y = 840 and the bottom of the frame. A good standing line is y
= 920.

## How the layers were made

The same way as the [meadow](../meadow/LOG.md): each strip was generated at
2048×768 with a transparent background, put in the 2048×1152 frame at a scale
and a y offset, and traced with the default settings. The trees and the houses
repeat the row 12 px above the bottom of the strip down to the bottom of the
frame. The trees are mixed 45 % with the sky color, so that they sit behind the
houses.

## Prompts and seeds

- **Trees** (`trees.prompt.json`, seed 42): "the edge of a village garden", a
  row of round trees and a few tall poplars with gaps, low hedges and a white
  picket fence along the bottom. Placed at scale 1, y 50. The fence is hidden
  behind the houses layer. Seed 41 had darker, denser trees.
- **Houses** (`houses.prompt.json`, seed 1): "the edge of a small town far away:
  a row of small houses and roofs of different heights in pale soft colors",
  with a church tower and trees, on a pale green hill. Placed at scale 1.6, x
  −614, y −84, so that the houses are about 200 px tall. Seed 2 drew a tiny town
  on a wide plain.
- **Ground** (`ground.prompt.json`, seed 51): a strip of grass along the top and
  a wide flat sandy road with pebbles and wheel ruts, touching the edges with no
  border. Placed at scale 1.15, x −154, y 399.

## What failed

The first plan had a middle layer of big village houses seen from the front
(`village-middle.txt`, seeds 1 and 2). They covered the whole frame above the
road and made a street, not the edge of a village. The far houses, scaled up,
became the houses layer instead, and the trees went behind them.

## What could be better

- The road is a large plain beige area with only a few pebbles.
- The houses are pastel and a little faded next to the bright road and grass.
