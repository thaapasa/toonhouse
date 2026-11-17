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

## Redrawn layers

The far, the middle and the ground layers were redrawn with `redraw-image`, with
`openEdges` on the left, right and bottom edges. The configs and the prep
scripts are in `redraw/`. The sources are the traced layers of commit `b26d3ac`.
To get them back and redraw all three layers:

```sh
mkdir -p assets/work/farm/traced
for l in far middle ground; do
  git show b26d3ac:assets/backgrounds/farm/$l.svg > assets/work/farm/traced/$l.svg
done
R=assets/backgrounds/farm/redraw
W=assets/work/farm/traced
python3 $R/prep-far.py $W/far.svg $W/far-prep.svg
MISE_ENV=art mise exec -- uv run --script $R/prep-middle.py $W/middle.svg $W/middle-prep.svg
python3 $R/prep-ground.py $W/ground.svg $W/ground-prep.svg
for l in far middle ground; do
  MISE_ENV=art mise run redraw-image -- $R/$l.json
done
```

### Colors and roles

The colors are the ones of the traced layers, so the far layer stays mixed with
the sky color.

- Far: `field-wheat`, `field-ploughed` with `furrow` for its stripes,
  `field-green`, `field-light`, `field-pale` for the field on the far hill in
  the middle, and `tree`. The borders between the fields are line paths.
- Middle: `grass`, `grass-light` for the band along the top of the rise,
  `trunk`, `leaves`, `barn`, `roof` for the roof of the farmhouse, `trim` for
  the white trim and the farmhouse door, `silo`, `silo-light`, `wall` for the
  walls of the farmhouse, `frame` for the window frames, the door frame and the
  chimney, `hay` and `hay-light` for the strands on the haystack.
- Ground: `grass`, `grass-dark` for the tufts, `fence`, `fence-grain` for the
  grain on the posts, `flower` and `flower-red`. The pebble and the middle of
  the red flower are in `fence-grain`.

### Prep scripts

- Far: the trace drew a thin stripe in the tree color down the left edge, which
  would show as a line where the layer runs off the frame. `prep-far.py` covers
  10 px on the left and right edges with a mirror image of the pixels just
  inside them.
- Middle: the trace drew several roles in one color, inside the large paths that
  VTracer stacks on top of each other, so `recolor` can't separate them.
  `prep-middle.py` gives each role its own color by where the path is. The dark
  brown of the trunks also drew the edges of every shape, so the script draws it
  in the outline color and keeps it as `trunk` only inside two rectangles around
  the trunks. The barn red also drew the roof of the farmhouse, the grass green
  also drew the tree crowns, and the yellows of the farmhouse and the haystack
  mixed. The script also mirrors the edges as for the far layer, because the
  trace drew an outline down both edges, and it fills a small hole of sky in the
  outline near the left edge.
- Ground: the mid brown drew both the grain on the posts and the lower edges of
  the rails. `prep-ground.py` gives it the outline color around the rails, so
  the rails have an even outline, and keeps it as grain inside the posts and
  below the fence.

### Changes from the traced layers

- The trees on the far hills have an even outline, and the blurred edges around
  them are gone.
- The darker band under the roof of the farmhouse and the darker barn walls
  below the roof went to `wall` and `barn`. The brown smudges at the foot of the
  haystack and the stray mark on its side are gone.
- The grass along the top of the ground layer has a thin outline in the outline
  color now. In the trace, its tufts met the sky with no outline.
- The ground uses `minLine` 0.8. With the default, the outline between a post
  and the lower rail disappeared in some places.
