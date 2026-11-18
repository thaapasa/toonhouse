# Flowering bush: work log

A bright green bush with small pink and white flowers, made of three clumps.
Work files are in `assets/work/props/`.

## Parts sheet

1. The prompt asks for three round leaf clumps of a flowering garden bush, each
   with a bumpy edge and a flat bottom, in bright green and covered with small
   pink and white five-petal flowers.
2. Generated seeds 11 and 12 at 1280×1024. I picked seed 11, and
   `parts.prompt.json` is its request. Seed 12 had blotchy shading on the leaves
   and a ground shadow under each clump.
3. Each clump of seed 11 came with a darker green band at the bottom. I kept it,
   because it reads as the base of the bush on the ground.
4. `split-sheet.ts` found three pieces, and they traced with the default
   settings. The thin outlines of the flowers merged into the petals, which
   still look fine at the size of the prop. I added a `viewBox` to each SVG.

## Rig

- The large clump is the root bone, drawn at 1.45, with the ground point in the
  middle of its bottom edge. The bush is about 0.65 times as tall as the boy.
- The medium clump is on the left and the small clump on the right, both behind
  the large clump at 0.9, so they show at the sides.
- The root sways 1° and the side clumps 2.5°, with a squash of 0.03 to 0.04.

## Redrawn parts

The traced clumps had rough edges, pale halos around the flowers and stray
streaks of the darker green along the edge. The clumps were redrawn with
`redraw-image` from the traced SVGs of commit `c2e0330`, so their frames and the
pivots in `rig.json` stay as they were. The configs are in `redraw/`.

To get the sources back and redraw the clumps:

```sh
mkdir -p assets/work/flowering-bush/traced
for p in clumpBig clumpMedium clumpSmall; do
  git show c2e0330:assets/props/flowering-bush/$p.svg > assets/work/flowering-bush/traced/$p.svg
  MISE_ENV=art mise run redraw-image -- assets/props/flowering-bush/redraw/$p.json
done
```

The clumps have the same colors and color roles:

- `outline`, `leaves` for the green, and `leaves-dark` for the darker green band
  at the bottom.
- `flower` for the pink flowers, `flower-alt` for the white flowers and
  `flower-center` for the middles of both. The middles of the pink flowers were
  a darker shade than those of the white flowers, and they now have one color.
- The pale halos around some petals go to `leaves`. In the large clump,
  `recolor` gives the two darker green streaks along the left edge the leaf
  color.
