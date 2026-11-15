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
