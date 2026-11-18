# Wizard: work log

An old wandering wizard with a long white beard, a grey robe, a battered pointed
hat and a wooden staff, made with the steps in
[cutout-toons.md](../../cutout-toons.md). Work files are in
`assets/work/wizard/`.

## Parts sheet

1. The prompt is the one for the boy with a new description of the character and
   a sixth piece: a tall wooden staff with a knot of twisted roots at the top
   that holds a pale blue crystal. The robe falls straight to the ankles, and
   the relaxed hand is a closed fist, so that it can hold the staff.
2. Generated three seeds at 1280×1024:
   `pnpm generate-image --prompt-file assets/work/wizard/parts.txt --out assets/work/wizard/parts.png --width 1280 --height 1024 --seed 11 --count 3`.
   Each took about 90 s.
3. I picked seed 11, and `parts.prompt.json` is its request. All three seeds had
   six clean pieces. Seed 11 has the clearest fist, with the thumb at the front,
   and a staff with a round knot and a crystal.

## Splitting and tracing

1. In `prototypes/`:
   `node scripts/split-sheet.ts ../assets/work/wizard/parts-11.png ../assets/work/wizard/pieces`.
   It found six pieces. I renamed `piece-0…5` to `head`, `staff`, `torso`,
   `hand-open`, `hand` and `foot`.
2. Traced each piece with the default settings and checked it on a blue
   background. No colors merged. Then I added a `viewBox` to each SVG.
3. The crystal came with a soft glow around the top of the staff, which traced
   as pale specks outside the outline. Before tracing the staff again, I cleared
   every pixel of the PNG that can be reached from the edge of the image without
   crossing the dark outline.
4. The open hand had its thumb on the wrong side for a palm that faces the
   viewer, as on the emo girl, so I mirrored `hand-open.svg`.
5. The robe came off the sheet much taller than the boy's torso. With the hips
   at the height that the clips use, the shoulders were so high that the hands
   hung at the chest. I scaled `torso.svg` to 0.9 with a `transform`, so the
   hands hang just below the rope belt.

## Rig

I read the points from the zoomed crops of `inspect-piece.ts` instead of running
`build-rig-2d.ts`, because the beard hides the neck and the robe has no leg
holes.

- The neck on the head is in the beard under the ear, at (150, 370). The beard
  hangs over the chest of the robe.
- The hips are 224 px above the hem of the robe, so the hem stays about 20 px
  above the ground when he stands. The legs are hidden by the robe and only show
  when a foot swings forward, so `legColor` paints them the grey of the robe.
- The boots go behind the robe, so that the hem hides the top of them.
  `feetBehindTorso` draws the near foot before the torso instead of over it.
- The far shoulder is near the front of the robe. Further back, the wide far
  sleeve stuck out behind the robe when he stood.
- The sleeves cover 85 % of each arm and are 16 px wider than the arm.
- The head is drawn at 0.85, so that he stands a little taller than the boy,
  with the hat tip at about 895 px.

## Staff

The staff is a new optional part of the cutout rig, with `staff` settings that
say how the near hand holds it:

- The clips place the hands for the boy, and at his hand positions the staff
  crossed the face. `hold` moves the near wrist forward to (110, 110) from the
  shoulder, and `follow` keeps 30 % of the motion of the clip. At 50 %, the
  staff still crossed the nose when the arm swung back in the walk.
- The fist is turned by `handAngle` −90°, so the knuckles point forward and the
  thumb is on top. The staff goes through `grip`, the middle of the fist.
- The wave tips the open hand back. When the staff turned with it, its top swung
  across the hat, so `turn` is −0.6: the staff tips forward instead, and he
  raises it in greeting. The hand stays a fist.
- At scale 0.8, the staff reaches from the ground to above the hat brim.

## Face

- **Eye:** the white of the eye spans x 184–202 and y 259–285, with the pupil at
  the front. The lids are the skin color of the head, `#f6bf7a`.
- **Mouth patch:** the traced mouth is a short lower lip line under the front of
  the moustache. The patch is a beard-colored shape over it.
- **Mouth:** the drawn mouth sits under the front of the moustache. An open
  depth of 20 was too small to read at the size of the head, so it is 30.

## Checks

I rendered frames of each clip to SVG with `tools/frames.ts` in the work folder
and checked them with `pnpm render-svg`: standing, eight frames of the walk, the
wave, and the talk with a blink at 3×.

## Redrawn parts

The traced parts had stacked shapes in many shades and rough edges. All six
parts were redrawn with `redraw-image` from the pieces of the parts sheet in
`assets/work/wizard/pieces/`, which have the same frames as the parts. The staff
comes from `staff-clean.png`, the piece without the glow. The configs are in
`redraw/`. To make the pieces again, generate seed 11 with `parts.prompt.json`,
split the sheet and clear the glow of the staff as described in "Splitting and
tracing".

1. Run `redraw/prep-head.py`, which writes
   `assets/work/wizard/redraw/head-prep.png`:
   `MISE_ENV=art mise exec -- uv run --script assets/characters/wizard/redraw/prep-head.py assets/work/wizard/pieces/head.png assets/work/wizard/redraw/head-prep.png`.
2. Run the configs:
   `for p in head torso hand hand-open foot staff; do MISE_ENV=art mise run redraw-image -- assets/characters/wizard/redraw/$p.json; done`.
   The torso and the open hand go to `assets/work/wizard/redraw/`, and the rest
   go straight to the parts.
3. Run `python3 assets/characters/wizard/redraw/finish.py`. It scales the torso
   to 0.9 and mirrors the open hand, as the traced parts were.

### The hat and the beard

The hat and the beard share some blue-grey shades in the image. The light
streaks on the hat are almost the color of the beard, and the strands of the
beard have the color of the shade under the brim. Without the prep step, the
beard got blue-grey patches and the hat got beard-colored streaks.
`prep-head.py` paints the greys above the lower edge of the brim in the hat
color and the greys below it in the beard color. The edge is a polyline in the
script, read from a grid over the piece.

### Colors and color roles

- The outline of every part is `#403228` and the skin is `#f6bf7a`, the same as
  `colors.outline` and `colors.skin` of the rig. The robe is `#8fa1a9`, the same
  as the sleeve and `legColor`. `colors.lid` is now the same skin, because the
  skin of the head was `#f3b870` before.
- Head: `skin`, `hair`, `hat` and `eye`. The pupil is in the outline color.
  `hair` is the beard, the moustache, the eyebrows and the hair at the sides, in
  `#dad9cc`, the color of the mouth patch. The shading of the hat, such as the
  dark underside of the brim, went to the hat, and the strands in the beard went
  to the hair. The line around the brim, the eyebrows, the ear and the moustache
  are lines in the outline color.
- Torso: `robe` and `rope`. The twists of the hanging rope are lines in the
  outline color, kept with `minLine` 0.7. The shading of the robe went to the
  robe.
- Hands: `skin`. The finger gaps are lines in the outline color. The faint
  crease of the palm went to the skin.
- Foot: `boot`. The sole has the color of the boot in the image, so it is part
  of `boot`, and the line between them is a line in the outline color. The
  opening at the top is in the outline color.
- Staff: `staff` and `staff-crystal`. The grain of the wood went to the wood.
  The green rim around the crystal and the olive glow along the top of the knot
  are in the outline color, so the crystal has an outline all around.

### Checks

I rendered frames of the idle, the walk, the wave and the talk with
`tools/frames.ts`, and a blink with a copy of it that sets `face.blink`. The
pivots, the grip of the staff and the face points did not change, because the
redrawn parts have the same frames as the traced ones. The closed lids cover the
eye, and the mouth patch matches the beard.
