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
