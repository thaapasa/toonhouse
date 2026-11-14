# Grandma: work log

A short, round grandmother with silver-lilac hair in a bun, a teal cardigan, a
coral flowered dress and purple slippers, made with the steps in
[cutout-toons.md](../../cutout-toons.md). Work files are in
`assets/work/grandma/`.

## Parts sheet

1. The prompt is the one for the boy with a new description of the character:
   the hair in a bun, rosy cheeks, a pearl earring, no glasses, a knitted
   cardigan over a dress that falls to just below the knees, and slippers. The
   prompt leaves out glasses, because a lens over the eye would get in the way
   of the lids.
2. Generated three seeds at 1280×1024:
   `pnpm generate-image --prompt-file assets/work/grandma/parts.txt --out assets/work/grandma/parts.png --width 1280 --height 1024 --seed 11 --count 3`.
   Each took about 90 s.
3. I picked seed 11, and `parts.prompt.json` is its request. Seed 12 has a body
   like an egg with a stub at the bottom and a wrist cut at an angle on the open
   hand. Seed 13 has a short boxy dress. Seed 11 has five clean pieces and a
   dress that leaves room for the legs below the hem.

## Splitting and tracing

1. In `prototypes/`:
   `node scripts/split-sheet.ts ../assets/work/grandma/parts-11.png ../assets/work/grandma/pieces`.
   It found five pieces. I renamed `piece-0…4` to `head`, `torso`, `hand-open`,
   `hand` and `foot`.
2. Traced each piece with the default settings and checked it on a blue
   background. A trace of the torso with a fixed palette lost the ribs of the
   cardigan cuff and drew a dark teal edge around the cardigan, so the torso
   keeps the default trace. Then I added a `viewBox` to each SVG.
3. The open hand had its thumb on the left, the wrong side for a palm that faces
   the viewer, so I mirrored `hand-open.svg`. The relaxed hand has its thumb at
   the front, as on the boy's.
4. The dress came off the sheet tall, so the shoulders sat high above the hips.
   I scaled `torso.svg` to 0.75 with a `transform`.
5. The blush on the cheek traced with a square notch on its right edge. I
   replaced its path in `head.svg` with an ellipse of the same color.

## Rig

I read the points from the zoomed crops of `inspect-piece.ts` instead of running
`build-rig-2d.ts`.

- The head has no neck, so it turns around a point under the jaw, at (200, 298),
  and the bottom of the head covers the top of the torso.
- The hips are 146 px above the hem, so the hem hangs about 100 px above the
  ground and the lower legs show below it. The feet stay in front of the dress.
- The shoulders are in the sleeve hole of the cardigan. At first they were at
  the top of the cardigan, right under the chin, and in the wave the raised arm
  crossed the mouth. 24 px lower, the arm passes under the chin.
- The sleeves are the teal of the cardigan and cover 85 % of each arm.
- The slipper is low, so `ankleHeight` is 62 foot pixels, against 85 for the
  boy's sneaker.
- The head is drawn at 0.82, as the boy's, and she stands a little taller than
  him.

## Face

- **Eye:** the white of the eye spans x 238–257 and y 176–216, with the pupil at
  the front. The lids are the skin color of the head, `#fbc08c`.
- **Mouth patch:** the traced smile runs into the profile line under the nose.
  The patch is a skin-colored shape over the smile, with its front edge along
  the inside of the profile line, so the traced outline stays and no new stroke
  is needed.
- **Mouth:** the drawn mouth follows the traced smile, from its curled back end
  to the profile line. An open depth of 28 was hard to see at the normal size,
  so it is 36.

## Checks

I rendered frames of each clip to SVG with `tools/frames.ts` in the work folder
and checked them with `pnpm render-svg`: standing, eight frames of the walk, the
wave, and the talk with a blink at 3×. To see the face, `tools/crop.ts` cuts
regions out of a large render.
