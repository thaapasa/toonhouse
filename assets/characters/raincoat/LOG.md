# Raincoat girl: work log

A curious seven-year-old girl with two afro puffs, a yellow raincoat and red
rain boots, made with the steps in [cutout-toons.md](../../cutout-toons.md).
Work files are in `assets/work/raincoat/`.

## Parts sheet

1. The prompt is the one for the boy, with a new description of the character:
   warm brown skin, two big afro puffs high on the back of the head, a closed
   smile, a sunny yellow raincoat with light blue buttons that reaches the
   middle of the thighs, and red rubber boots with white soles.
2. Generated three seeds at 1280×1024:
   `pnpm generate-image --prompt-file assets/work/raincoat/parts.txt --out assets/work/raincoat/parts.png --width 1280 --height 1024 --seed 11 --count 3`.
   Each took about 90 s.
3. I picked seed 11, and `parts.prompt.json` is its request. Seed 12 has a hand
   drawn on the coat, and seed 13 has a cuff on the relaxed hand. Seed 11 has
   five clean pieces, a sleeve mark on the coat for the shoulder and a closed
   smile.

## Splitting and tracing

1. In `prototypes/`:
   `node scripts/split-sheet.ts ../assets/work/raincoat/parts-11.png ../assets/work/raincoat/pieces`.
   It found five pieces. I renamed `piece-0…4` to `head`, `torso`, `hand-open`,
   `foot` and `hand`.
2. With the default settings, the dark brown hair merged with the outline, and
   the curls of the puffs were lost. A fixed palette did not help, because the
   hair and the outline are almost the same color. Before tracing, the script
   `tools/hair.ts` in the work folder paints every dark pixel either in the
   outline color or in a lighter brown, `#6e3a16`, split at a brightness of 38.
   Then I traced the head with the palette `#2a1202,#6e3a16,#bc6b26,#fefefd`.
   The pupil is now the same brown as the hair, which reads as a brown eye.
3. The thin outlines of the coat, the hands and the boot traced as broken lines.
   `tools/clean.ts` makes the alpha fully opaque or fully transparent and paints
   every pixel under a brightness limit in the outline color. The limit is 120
   for the coat, 85 for the hands and 45 for the boot, each below the brightness
   of the fill: the skin is at about 123 and the red boot at 76. Then I traced
   each piece with a palette of its colors.
4. The relaxed hand has its thumb at the front, as on the boy. The open hand had
   its thumb on the left, so I mirrored `hand-open.svg` with a `transform` on a
   group around its paths.
5. I added a `viewBox` to each SVG.

## Rig

I read the points from the alpha masks, row by row, and from `inspect-piece.ts`:

- The neck on the head is in the neck stub under the jaw, at (218, 385), and the
  neck on the torso is in the collar.
- The near shoulder is near the top of the sleeve mark on the coat. The far
  shoulder is in front of the middle of the coat. Further back, the far sleeve
  stuck out behind the coat as a yellow bump.
- The hips are 55 px above the hem, so the legs come out under the coat.
- The ankle is inside the boot shaft, and `ankleHeight` is 130 boot pixels. The
  boot is drawn at 0.55, so the ankle is about as high as the emo girl's, and
  the legs are 190 long, as hers are.
- The arms are 155 long. At 175, as on the boy, the arms bent at the elbow while
  she stood. The yellow sleeves cover 55 % of each arm.
- The outline color `#2a1202` and the skin color `#bc6b26` are the colors of the
  palettes.

## Face

- **Eye:** the white of the eye spans x 296–329 and y 222–272. The ellipse is a
  little larger, so that the closed lids also cover the brown ring around it.
- **Pupil:** the pupil and the line of the upper lid traced in the hair brown,
  `#6e3a16`, so she had brown eyes. They are now in the outline color.
- **Mouth patch:** the cutout renderer draws the mouth only if the rig has a
  patch. The patch is a skin-colored shape over the traced smile line, up to
  where the line meets the lips in the profile.
- **Mouth:** the drawn smile follows the traced one and ends at the profile. An
  open depth of 30 was too small to see at the size of the head, so it is 50.

## Redrawn parts

The traced parts had rough edges, stacked shapes and stray shades. The parts
were redrawn with `redraw-image`, and the configs are in `redraw/`.

- The head, the hands and the boot come from the traced SVGs of commit
  `738affe`, so the hair split, the pupil fix and the mirrored open hand stay as
  they were. Their source is `assets/work/raincoat/traced/<part>.svg`.
- The torso comes from the torso piece of the parts sheet, which has the same
  frame as the part. The traced torso had lost the blue rims of the buttons and
  had green halos around them. To make the piece again, generate seed 11 with
  `parts.prompt.json` and split the sheet as described in "Splitting and
  tracing".

To get the sources back and redraw the parts:

```sh
mkdir -p assets/work/raincoat/traced
for p in head hand hand-open foot; do
  git show 738affe:assets/characters/raincoat/$p.svg > assets/work/raincoat/traced/$p.svg
done
MISE_ENV=art mise exec -- uv run --script assets/characters/raincoat/redraw/prep-torso.py \
  assets/work/raincoat/pieces/torso.png assets/work/raincoat/pieces/torso-prep.png
for p in head torso hand hand-open foot; do
  MISE_ENV=art mise run redraw-image -- assets/characters/raincoat/redraw/$p.json
done
```

`redraw/prep-torso.py` prepares the torso piece. Where the yellow coat blends
into the blue rim of a button, the pixels come out close to the color of the
collar lining, so the buttons got a ring of lining. The script paints those
pixels in the rim color. It also paints every pixel darker than the seams in the
outline color, as `tools/clean.ts` did for the first trace, because the thin
outline along the front edge of the coat otherwise went to the seams.

The parts have these colors and color roles:

- The outline of every part is `#2a1202` and the skin is `#bc6b26`, the same as
  `colors.outline` and `colors.skin` of the rig. The coat is `#fddc01`, the same
  as the sleeve.
- Head: `hair`, `skin` and `eye`. The pupil is in the outline color. The curl of
  the ear and the smile had the hair color in the trace, so `recolor` in the
  config gives them the outline color, and they are lines. The mouth patch
  covers the smile as before.
- Torso: `coat`, `coat-seam` for the darker yellow lines of the sleeve mark, the
  collar and the front edge, `coat-lining` for the inside of the collar,
  `button-rim` and `button`.
- Hands: `skin`. The finger gaps and the crease of the palm are lines. The
  crease is thin, so the open hand uses `scale` 8, `minLine` 0.5 and `smooth`
  0.5. The crease still has a small gap where it is thinnest.
- Boot: `boot` and `boot-sole`. The darker red band above the sole and under the
  cuff was a shade, so it is part of `boot`.

## Checks

I rendered frames of each clip to SVG with `tools/frames.ts` in the work folder
and checked them with `pnpm render-svg`: standing, six frames of the walk, the
wave, and the talk with a blink at 3×.

## Known problems

- When the eye is about 0.93 closed, a thin sliver of the white shows under the
  lash line, near its ends. The gap between the lids is (1 − blink) × 2 ×
  `eye.ry`, and the lash line covers only about 2.5 px below the upper lid. Her
  eye is tall (`ry` 31), so the gap is about 4 px, and the white stands out
  against the brown skin. A tighter ellipse would gain under a pixel. A fix
  belongs in the renderer, for example a lash line that thickens as the eye
  closes.
