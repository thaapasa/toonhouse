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

## Redrawn layers

The trees, the houses and the ground were redrawn with `redraw-image`, with
`openEdges` on the left, right and bottom edges. The configs and a prep script
are in `redraw/`. The sources are the traced layers of commit `c4cb810`. To get
them back and redraw a layer, such as the trees:

```sh
mkdir -p assets/work/village/traced
git show c4cb810:assets/backgrounds/village/trees.svg > assets/work/village/traced/trees.svg
python3 assets/backgrounds/village/redraw/prep-trees.py \
  assets/work/village/traced/trees.svg assets/work/village/traced/trees-prep.svg
MISE_ENV=art mise run redraw-image -- assets/backgrounds/village/redraw/trees.json
```

The houses and the ground need no prep script. Their configs read
`assets/work/village/traced/houses.svg` and `ground.svg`.

### Colors and roles

The colors are the ones of the traced layers, so the trees stay mixed with the
sky color.

- Trees: `grass` for the strip at the bottom, `hedge` for the low hedges behind
  the fence, `leaves` for the crowns and the poplars, and `fence`. The trunks
  were a gray close to the outline and went to the outline. A `trunk` layer was
  tried, but most of the trunk pixels still went to the outline.
- Houses: `grass` for the hill and the poplar on the left, `leaves` for the
  trees between the houses, `wall` for the cream walls, `wall-side` for the
  peach walls and the church tower, `wall-alt` for the gray walls, `roof`,
  `roof-side` for the darker roof slopes, `trim` for the tan window frames and
  doors, and `window` for the gray windows. The pink windows have the color of
  the roofs and are part of `roof`.
- Ground: `grass`, `grass-dark` for the band under the grass, `road`,
  `road-dark` for the ruts and the shade under the grass, and `pebble`.

### Changes from the traced layers

- The trace drew the outlines with brown, olive or gray streaks along them. The
  streaks went to the outline, so the outlines are even, and a little thicker in
  places.
- The traced grass of the trees layer starts 2 px from the left edge of the
  frame. `prep-trees.py` fills the gap, so that the redraw doesn't draw an
  outline there.
- The traced houses layer draws the gray walls and the gray windows in one
  color. The config gives the paths of the gray walls another color with
  `recolor`, so that they get their own role.
- The olive edge along the top of the grass is part of the outline now. The
  largest grass tuft, near the left edge, had olive blades on its right side,
  and they became a dark wedge in the outline color. A `grass-shade` layer for
  the olive kept the blades but also kept the uneven double edge along the
  grass.
- The pebbles have an outline-colored rim instead of the darker olive one.
