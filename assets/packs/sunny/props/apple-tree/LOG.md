# Apple tree: work log

A young apple tree: a slender trunk with three branches and three leaf clumps
with red apples. Work files are in `assets/work/props/`.

## Parts sheet

1. The prompt asks for a parts sheet with four pieces: a short slender trunk
   with two thin branches and no leaves, and three round leaf clumps of
   different greens with one to three small red apples each.
2. Generated seeds 11 and 12 at 1280×1024. I picked seed 12, and
   `parts.prompt.json` is its request. In seed 11 a branch of the trunk touched
   a clump. Seed 12 has four separate pieces and a bold outline. Its trunk came
   with three branches.

## Splitting and tracing

1. `split-sheet.ts` found four pieces: the trunk and the dark, light and bright
   clumps.
2. The trunk traced with a stray speck to the right of it. I traced it again
   with the palette `#2a1004,#825228` and `--speckle 30`, and then removed the
   one path that was left of the speck.
3. I added a `viewBox` to each SVG.

## Rig

- The trunk is the root bone, drawn at 1.25. The apple tree is about 1.7 times
  as tall as the boy.
- The dark clump is behind the trunk at 2 times its size, over the fork. The
  light clump is in front on the left and the bright clump in front on the
  right, at 1.5. They cover the branch tips and overlap each other and the dark
  clump.
- The pivot of each clump is in its middle, at 75 % of its height.
- The trunk sways 0.7°, the back clump 2° and the front clumps 3°, with a squash
  of 0.03 to 0.04.

## Redrawn parts

The traced parts had rough edges and two or three shades of each color. The
parts were redrawn with `redraw-image` from the traced SVGs of commit `c2e0330`,
so the frames and the pivots in `rig.json` stay the same. The configs are in
`redraw/`.

To get the sources back and redraw the parts:

```sh
mkdir -p assets/work/trees-redraw/apple-tree/traced
for p in trunk clumpDark clumpLight clumpBright; do
  git show c2e0330:assets/props/apple-tree/$p.svg > assets/work/trees-redraw/apple-tree/traced/$p.svg
  MISE_ENV=art mise run redraw-image -- assets/packs/sunny/props/apple-tree/redraw/$p.json
done
```

The parts have these colors and color roles:

- The outline of every part is `#2a1004`, the outline color of the trunk. The
  clumps had a slightly greener outline, which now goes to the same color.
- Trunk: `bark`.
- Clumps: `leaves-dark`, `leaves-light` or `leaves`, after the clump, and
  `apple`. Each clump has its own leaf role, so that a color preset can keep the
  clumps in different greens.
