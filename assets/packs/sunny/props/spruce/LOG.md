# Spruce: work log

A tall spruce made of a bare trunk and four tiers of branches that sway in the
wind. Work files are in `assets/work/props/`.

## Parts sheet

1. The prompt asks for a cutout puppet parts sheet with four separate pieces: a
   tall thin trunk that tapers to a point, and a wide, a medium and a small
   triangular tier of spruce branches with a zigzag lower edge. It ends with the
   flat style and "plain shapes with no faces, no eyes and no marks".
2. Generated seeds 11 and 12 at 1280×1024. Each took about 95 s.
3. I picked seed 12, and `parts.prompt.json` is its request. Seed 11 drew the
   three tiers stacked into one tree.

## Splitting and tracing

1. `split-sheet.ts` found four pieces: the trunk and the top, middle and bottom
   tiers.
2. The default trace left gray specks and a thin line along the zigzag edges. I
   traced again with a fixed palette: the outline `#241004` with the green
   `#2a7a20`, or `#04541e` for the dark bottom tier, and the brown `#5e3818` for
   the trunk. The bottom tier also needed `--speckle 40`.
3. I added a `viewBox` to each SVG.

## Rig

- The trunk is the root bone, with the ground point at the middle of its base.
  It is drawn at 2.15, so the tree is about 2.6 times as tall as the boy and
  still fits in the frame of the meadow.
- Four tiers hang on the trunk: the bottom tier, the middle tier, the middle
  tier again at 0.8 of its size, and the top tier. Each is drawn at 1.1 times
  the trunk scale and overlaps the tier below by about 90 trunk pixels. The
  trunk leans a little to the right on the sheet, so the tiers follow its middle
  line.
- The pivot of each tier is in its middle, at 70 % of its height, where the
  trunk goes through it. The top tier sits high enough to hide the tip of the
  trunk.
- The bones are in the draw order from the bottom up, so each tier covers the
  top of the one below.
- The trunk sways 0.5°. The tiers sway from 1.5° at the bottom to 3° at the top,
  with a squash of 0.03.

## Redrawn parts

The traced tiers had a few green specks on the outline and a ragged zigzag edge.
The parts were redrawn with `redraw-image` from the traced SVGs of commit
`c2e0330`, so the frames and the pivots in `rig.json` stay the same. The configs
are in `redraw/`.

To get the sources back and redraw the parts:

```sh
mkdir -p assets/work/trees-redraw/spruce/traced
for p in trunk tierTop tierMiddle tierBottom; do
  git show c2e0330:assets/props/spruce/$p.svg > assets/work/trees-redraw/spruce/traced/$p.svg
  MISE_ENV=art mise run redraw-image -- assets/packs/sunny/props/spruce/redraw/$p.json
done
```

The parts have these colors and color roles:

- The outline of every part is `#241004`, as in the trace.
- Trunk: `bark`.
- Tiers: `needles` for the top and the middle tier, and `needles-dark` for the
  darker bottom tier.

Some parts of the trace had green where the outline should be:

- Top tier: in the middle of the zigzag edge, the trace had a green patch that
  reached out under the outline. `recolor` gives it the outline color, so the
  outline is thicker there than elsewhere. `speckle` 80 removes a small hole in
  the outline next to it.
- Middle tier: `recolor` gives the outline color to a green patch on the outline
  near the tip and to a green sliver under the zigzag edge on the left.
- Bottom tier: a thin green sliver still shows along one spike of the zigzag
  edge, left of the middle, because it is part of the main green path of the
  trace.
