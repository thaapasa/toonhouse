# Hen: work log

A plump white hen with a red comb, made with the steps in
[cutout-toons.md](../../cutout-toons.md) but with a bird rig instead of a cutout
rig. Work files are in `assets/work/chicken/`.

## Parts sheet

1. The prompt follows the boy's, with five pieces for a bird: the head on a
   short neck with the comb, the wattles and a closed beak; the body as an egg
   shape with the tail; a folded wing; an open wing; and a foot with three toes
   in front and one at the back.
2. Generated three seeds at 1280×1024:
   `pnpm generate-image --prompt-file assets/work/chicken/parts.txt --out assets/work/chicken/parts.png --width 1280 --height 1024 --seed 11 --count 3`.
   Each took about 90 s.
3. I picked seed 11, and `parts.prompt.json` is its request. Seeds 12 and 13
   came with soft shading on the white feathers, which tracing turns into
   blotches. Seed 11 is flat.

## Splitting and tracing

1. In `prototypes/`:
   `node scripts/split-sheet.ts ../assets/work/chicken/parts-11.png ../assets/work/chicken/pieces11`.
   It found five pieces: `head`, `body`, `wing-open`, `wing` and `foot`, in that
   order.
2. Traced each piece with the default settings and checked it on a blue
   background. No colors merged. Then I added a `viewBox` to each SVG.

## Redrawn parts

The traced parts had stacked shapes in many shades of brown along the outline
and rough edges. All five parts were redrawn with `redraw-image` from the traced
SVGs of commit `0d1f630`, so the frames and the pivots stay as they were. The
configs are in `redraw/`. Their source is
`assets/work/chicken/traced/<part>.svg`, which you get back with:

```sh
mkdir -p assets/work/chicken/traced
for p in head body wing wing-open foot; do
  git show 0d1f630:assets/characters/chicken/$p.svg > assets/work/chicken/traced/$p.svg
done
```

- The outline of every part is `#4f382e`, the feathers are `#fbf9f4` and the
  foot is `#fbaf00`, the same as `colors.outline`, `colors.feathers` and
  `colors.leg` of the rig. The beak is `#f9af01`, as `colors.beak`.
- The color roles are `feathers`, `comb`, `beak` and `eye` on the head,
  `feathers` on the body and the wings, and `leg` on the foot. The comb and the
  wattles are one red, so both are `comb`.
- All the brown shades went to the outline. The darker orange of the lower half
  of the beak and of the claws went to `beak` and `leg`. The two shades of white
  on the body and the tail are both `feathers`.
- The gray glint in the pupil is gone, and the pupil is a round dot in the
  outline color. A path in the same gray also ran along the back of the neck,
  and as the eye white it left a white sliver in the outline there.
- The step on the top edge of the front toe and the short ticks on the toes are
  in the traced foot, so they stay.

## Rig

The pivots come from the alpha masks, read row by row:

- The body pivot is between the hips, 35 px above the bottom of the egg. The
  neck point is at the top front of the egg, and the shoulder is a little in
  front of the middle, where the folded wing covers the side.
- The head turns around the middle of its neck stub. The feather ruff at the
  bottom of the head hangs over the body and hides the top of the neck.
- The folded wing turns around its rounded front end, and the open wing around
  its root at the bottom right, so that it points up and back.
- The ankle is on top of the heel of the foot, 75 px above the sole.
- The open wing is drawn larger than the folded one (1.05 against 0.75), so that
  the flap reads.

## Face

- **Eye:** the ellipse is a little smaller than the ring around the eye, so the
  closed eye keeps its ring.
- **Beak:** the head came with a closed beak. To open it, the renderer turns a
  lower half drawn in code down around the back corner of the beak, and fills
  the gap between the halves with the color of the mouth. The gap follows the
  curved line between the halves, so it does not show past the tip.

## Clips

- **Walk:** a real bird holds its head still in the air for a whole step and
  then thrusts it forward. With this big head and short neck, that left the head
  far ahead of the body before each thrust. The head now holds back for 40 % of
  the step, which still reads as a head-bob.
- **Peck:** at first the head moved along the axes of the tipped body, so it
  slid down under the front of the body. Then I let the neck stretch from the
  neck point to the ground, but it had to stretch about 190 px, and the neck
  became a long white pipe. Now most of the drop comes from the body: it tips
  52° around the hips, the legs bend into a crouch, and the head turns until the
  beak points down. The neck stretches about 90 px.

## Checks

I rendered frames of each clip to SVG and checked them in Chromium: the walk
every 0.05 s, the peck at its lowest point, the flap in the air and the beak at
3×. Then I played each clip in the studio.
