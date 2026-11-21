# Grandma: work log

A short, round grandmother with silver-lilac hair in a bun, a teal cardigan, a
coral flowered dress and purple slippers, made with the steps in
[cutout-toons.md](../../../../cutout-toons.md). Work files are in
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

## Redrawn parts

The traced parts had stacked shapes in many shades and rough edges. The head,
the torso, the hands and the slipper were redrawn with `redraw-image` from the
traced SVGs of commit `deaaa49`, so the scaled torso, the mirrored open hand and
the pivots stay as they were. The configs are in `redraw/`. Their source is
`assets/work/grandma/traced/<part>.svg`, which you get back with:

```sh
mkdir -p assets/work/grandma/traced
for p in head torso hand hand-open foot; do
  git show deaaa49:assets/characters/grandma/$p.svg > assets/work/grandma/traced/$p.svg
done
python3 assets/packs/sunny/characters/grandma/redraw/prep-head.py \
  assets/work/grandma/traced/head.svg assets/work/grandma/traced/head-prep.svg
python3 assets/packs/sunny/characters/grandma/redraw/prep-torso.py \
  assets/work/grandma/traced/torso.svg assets/work/grandma/traced/torso-prep.svg
```

- `redraw/prep-head.py` recolors the pearl of the earring. It had the white of
  the eye and, on its shade, the light lilac of the hair strands, so the eye
  color or the hair color of a color preset would have changed it too.
- `redraw/prep-torso.py` recolors the far edge of the cardigan, which had the
  dark teal of the lines on the cardigan. In the outline color, it made a thick
  dark band along the back of the dress.
- The outline of every part is `#533121`, the skin is `#fbc08c` and the cardigan
  is `#00b9b6`, the same as `colors.outline`, `colors.skin` and
  `limbs.sleeve.color` of the rig. The hands were a little lighter before.
- The color roles are `skin`, `hair`, `blush`, `earring` and `eye` on the head,
  `dress`, `cardigan`, `dress-pattern` and `dress-pattern-center` on the torso,
  and `slipper`, `slipper-inside` and `slipper-sole` on the slipper. The pink of
  the nose tip is `blush`, as the cheek.
- The shades went to the color they belong to: the strands of the hair, the
  darker red of the dress, the lighter teal of the cuff, the shades of the sole,
  and the dark purple band above the sole, which is now `slipper`. The ribs of
  the cuff were light teal on teal, so they are gone.
- The pupil, the brow, the curl of the ear, the pocket and the front edge of the
  cardigan, the finger gaps and the creases of the palm and the wrist are in the
  outline color, as lines of their own. The curl of the ear and the creases were
  light orange before.
- The slipper uses `minArea` 250. It removes a thin light sliver of the sole
  above the purple band.
- The mouth patch was not redrawn. It still covers the smile line of the redrawn
  head.

## Rig

I read the points from the zoomed crops of `inspect-piece.ts` instead of running
`build-rig-2d.ts`.

- The head has no neck, so it turns around a point under the jaw, at (200, 298),
  and the bottom of the head covers the top of the torso.
- The hips are 146 px above the hem, so the hem hangs about 100 px above the
  ground and the lower legs show below it. The feet stay in front of the dress.
- The shoulders are low in the cardigan, at (120, 116) and (112, 110). At first
  they were at the top of the cardigan, right under the chin, and in the wave
  the raised arm crossed the mouth. 24 px lower, it still brushed the jaw. The
  wave puts the hand at a fixed offset from the shoulder, so a lower shoulder
  lowers the whole raised arm, and 16 px more leaves a gap under the jaw.
- The arms are 152 long. The clips hang the hand 150 px from the shoulder, and
  at 165 the slack bent the arm into an arch that pointed up at the back of the
  walk swing. At 152, the arm is almost straight there and still bends in the
  wave.
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

## Known problems

- In the walk, the top of the arm starts a little below the sleeve cap that is
  drawn on the torso.

## Color presets

The head and the torso were edited by hand in Affinity: the tip of the nose is
now skin instead of `blush`, and the flowers of the dress are gone, because the
redrawn flowers were broken. The exports got the role classes back, and the
torso keeps its old size of 221.3 × 438.8, because Affinity rounded the canvas
up to whole pixels while the paths stayed where they were. The roles
`dress-pattern` and `dress-pattern-center` are gone with the flowers.

The grandma has color settings for the skin, the hair, the cardigan, the dress,
the slippers and the outline. A skin preset colors the blush too, so that the
cheek suits the skin. A slipper preset colors the inside and the sole.

- The dress is coral with white flowers by default, drawn in code with the
  `flowers` pattern, and the plain coral comes next. Five more dress presets
  have flowers, each in one bright color with a yellow middle, so that they
  stand out on the dress. The plain colors come after them.
- The eyelids follow the skin, the sleeves follow the cardigan and the face
  lines follow the outline, through `colorRoles`. The mouth patch got the class
  `c-skin`, so that it follows the skin.
- The pupil is part of the outline paths, so the grandma has no eye setting. The
  earrings stay pearl white.

## Legs inside the slippers

The slipper has two layers, as the boots of the wizard and the captain have.
`foot-back.svg` is the back wall of the slipper behind the ankle, the main layer
of the part, and `foot-front.svg` is the rest of the slipper, as the `front`
layer. They were drawn by hand in Affinity in the frame of the old `foot.svg`,
so the pivot stays the same, and that file is gone. The exports got the role
classes of the old file, with the paths of the drawings unchanged.

The rig has its own draw order now, with each leg between the two layers of its
slipper. The front of the near slipper is drawn after the dress, as the near
foot was before.
