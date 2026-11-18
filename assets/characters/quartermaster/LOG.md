# Quartermaster: work log

A tall, grumpy harbor quartermaster with a long hooked nose, a mustache and a
black ponytail, in a teal waistcoat, a red sash and plum trousers. He is the
first character of the [adventure pack](../../packs/adventure/), and the test of
its style prompt. He was made with the steps in
[cutout-toons.md](../../cutout-toons.md). Work files are in
`assets/work/quartermaster/`.

## Parts sheet

1. The prompt is the one for the boy, with a new description of the character
   and the style prompt of the adventure pack.
2. The first three seeds (11 to 13) had the right style, but the torso came with
   a whole trouser leg down to the ankle, and the boot was a tall riding boot.
   The rig draws the legs in code, so the torso has to end at the hips.
3. The second prompt asks for "only the torso, from the collar down to the hips,
   with no legs", with "the very top of plum trousers, cut off straight at the
   hips like short shorts", and for a short ankle boot. Seeds 21 to 23 at
   1280×1024 took about 95 s each.
4. I picked seed 21, and `parts.prompt.json` is its request. Seed 22 had no
   relaxed hand, and in seed 23 the relaxed hand came with a sleeve and a
   forearm.

## Splitting and tracing

1. `split-sheet.ts` found five pieces: `torso`, `head`, `hand-open`, `hand` and
   `foot`, in that order.
2. Traced each piece with the default settings. No colors merged.
3. The open hand came with the thumb on the left, so `hand-open.svg` is mirrored
   with a `transform` on a group around its paths.
4. The torso came out 582 px tall, much taller than the torso of the boy (357)
   or the emo girl (415). The clips have a fixed hip height, so a tall torso
   gives short legs. `torso.svg` is scaled to 0.7 with a `transform` on a group
   around its paths, which makes it 168×407.
5. I removed two paths from `head.svg`: a speck left of the ponytail, and the
   frown line of the traced mouth under the mustache.

## Redrawn parts

The traced parts had stacked shapes in many shades and rough edges. The five
parts were redrawn with `redraw-image` from the traced SVGs of commit `24de57f`,
so the frames, the mirrored open hand and the scaled torso stay as they were.
The redrawn SVGs have no `transform`: the paths are in the coordinates of the
frame. The mouth patch was not redrawn. The configs are in `redraw/`. Their
source is `assets/work/quartermaster/traced/<part>.svg`, which you get back
with:

```sh
mkdir -p assets/work/quartermaster/traced
for p in head torso hand hand-open foot; do
  git show 24de57f:assets/characters/quartermaster/$p.svg > assets/work/quartermaster/traced/$p.svg
done
for p in head torso foot; do
  python3 assets/characters/quartermaster/redraw/prep.py $p \
    assets/work/quartermaster/traced/$p.svg assets/work/quartermaster/traced/$p-prep.svg
done
```

- `redraw/prep.py` recolors paths of the head, the torso and the boot before the
  redraw, so that no color has two roles. On the head, the line down the neck
  goes to the skin, because as a line it came out as a heavy black mark. On the
  torso, four folds of the sash had the color of the trousers and are now lines,
  and the shadow under the collar had the color of the trouser crease and is now
  part of the outline. On the boot, the line above the sole had the color of the
  inside of the boot and is now part of the outline.
- The outline of every part is `#121817` and the skin is `#e29f60`, the same as
  `colors.outline` and `colors.skin` of the rig. The shirt is `#e1cea1`, the
  color of the sleeve in `limbs`. The hands were a little lighter before.
- The color roles are `skin`, `hair-tie` and `eye` on the head, `trousers`,
  `waistcoat`, `shirt`, `sash` and `button` on the torso, and `boot`,
  `boot-sole`, `boot-inside`, `boot-strap` and `boot-buckle` on the boot.
- The hair, the eyebrow and the mustache have no role of their own. In the image
  they are near-black, the same as the outline, and the trace draws them and the
  outline as one shape, so the script can't tell them apart. They are part of
  the outline, and a color preset can't change the color of the hair. The grey
  shine on the ponytail went to the outline too.
- The shades went to the color they belong to: the shading of the face, the
  neck, the ear and the eyelid, the shading on the open hand, the shading on the
  shirt and the collar, and the dark wedge between the legs of the trousers.
- The line under the eye, the nostril, the curl of the ear, the folds of the
  sash, the lines between the fingers, the creases of the palm and the wrist,
  and the crease on the boot are now in the outline color, as lines of their
  own.
- The torso uses `minLine` 0.8 and `minArea` 8, so that the thin dark rims of
  the buttons stay.

## Rig

I wrote `rig.json` by hand from the row extents of the alpha masks and from
`inspect-piece.ts`.

- The head came with a long neck. The head is drawn before the torso in
  `drawOrder`, so that the collar covers the bottom of the neck, and the
  ponytail goes behind the back.
- The hips are near the hem of the shorts, at y 382 of 407, so that more of the
  legs shows and he looks lanky. The legs are plum, as trousers, with
  `legColor`.
- The arms are 215 long, against 175 for the boy, so that the relaxed hand hangs
  at the sash. The sleeve is the cream of the shirt and covers 90 % of the arm.
- The relaxed hand has a long wrist. Its pivot is 70 px down the piece, and the
  wrist above it lies over the arm.
- The head is drawn at 0.72, the hands at 0.45 and the boot at 0.62.

## Face

- **Eye:** the white of the eye spans x 175–215 and y 121–143 in head pixels.
  The ellipse `eye` is a little larger, with the lids meeting at y 135.
- **Mouth:** the traced frown line is removed from `head.svg`, and the patch is
  a skin-colored shape over the same place, under the mustache. The drawn mouth
  runs from (208, 244) to (246, 229), with the control point above the corners,
  so the closed mouth turns down.

## Checks

I rendered frames of the idle, the walk, the wave and the talk to SVG with
`assets/work/quartermaster/frames.ts` and checked them with `pnpm render-svg`.
The blink in the idle at t = 1.3 covers the whole eye.
