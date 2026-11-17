# Round bush: work log

A round garden bush made of three leaf clumps. Work files are in
`assets/work/props/`.

## Parts sheet

1. The prompt asks for three round leaf clumps of a garden bush, each with a
   bumpy edge and a flat bottom: large and medium green, medium light green,
   small medium green.
2. Generated seeds 11 and 12 at 1280×1024. I picked seed 12, and
   `parts.prompt.json` is its request. Seed 11 drew a pale ground shadow under
   the large clump.
3. `split-sheet.ts` found three pieces. They traced cleanly with the default
   settings. I added a `viewBox` to each SVG.

## Rig

- The large clump is the root bone, drawn at 1.15, with the ground point in the
  middle of its bottom edge. The bush is about 0.6 times as tall as the boy.
- The light clump is on the left behind it and the small clump on the right in
  front of it, both with their pivots in the middle of their bottom edges and
  their bottoms on the ground line.
- The pivots are at the bottom, so the clumps sway like a bush rooted in the
  ground. The root sways only 1°, because a larger angle lifts the corners of
  its bottom edge off the ground. The side clumps sway 2.5°, and all clumps
  squash by 0.03 to 0.04.

## Redrawn parts

The traced clumps had rough edges and a few darker green streaks along the edge.
The clumps were redrawn with `redraw-image` from the traced SVGs of commit
`c2e0330`, so their frames and the pivots in `rig.json` stay as they were. The
configs are in `redraw/`.

To get the sources back and redraw the clumps:

```sh
mkdir -p assets/work/round-bush/traced
for p in clumpBig clumpLight clumpSmall; do
  git show c2e0330:assets/props/round-bush/$p.svg > assets/work/round-bush/traced/$p.svg
  MISE_ENV=art mise run redraw-image -- assets/props/round-bush/redraw/$p.json
done
```

The clumps have these colors and color roles:

- The outline of every clump is `#4d3a1a`. The leaf curls inside the clumps are
  lines in the outline color.
- The large and the small clump have `leaves`, and the light clump has
  `leaves-light`, so that a color preset can keep it lighter.
