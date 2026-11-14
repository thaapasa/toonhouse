# Emo girl: work log

A moody teenage girl with violet hair, made with the steps in
[cutout-toons.md](../../cutout-toons.md). Work files are in `assets/work/emo/`.

## Parts sheet

1. The prompt is the one for the boy, with a new description of the character:
   long straight violet hair with a hot pink streak and a heavy fringe, a bored
   half-closed eye with eyeliner, a flat closed mouth, a grey t-shirt with a
   pink skull, a purple and pink plaid skirt, and purple platform boots. Every
   color is bright, so that tracing does not merge any of them with the dark
   outline.
2. Generated three seeds at 1280×1024:
   `pnpm generate-image --prompt-file assets/work/emo/parts.txt --out assets/work/emo/parts.png --width 1280 --height 1024 --seed 11 --count 3`.
   Each took about 105 s.
3. I picked seed 11, and `parts.prompt.json` is its request. In seeds 12 and 13,
   the relaxed hand came with a forearm. Seed 11 has five clean pieces, a sleeve
   mark on the torso for the shoulder and a closed mouth.

## Splitting and tracing

1. In `prototypes/`:
   `node scripts/split-sheet.ts ../assets/work/emo/parts-11.png ../assets/work/emo/pieces`.
   It found five pieces. I renamed `piece-0…4` to `head`, `torso`, `hand-open`,
   `foot` and `hand`.
2. Traced each piece with the default settings and checked it on a blue
   background. No colors merged. Then I added a `viewBox` to each SVG.
3. Both hands came off the sheet as mirror images of the boy's. On the relaxed
   hand the thumb was at the back, so on the near arm it pointed down. On the
   open hand the thumb was on the wrong side for a palm that faces the viewer,
   so the wave showed a twist that an arm can't make. I mirrored `hand.svg` and
   `hand-open.svg` with a `transform` on a group around their paths, and moved
   the wrist pivots to match.

## Rig

I did not run `build-rig-2d.ts`, because its neck rule does not fit this head.
The script puts the neck in the middle of the bottom rows of the head, but here
the bottom rows are the tips of the hair. Instead, I read the points from the
alpha masks and from `inspect-piece.ts`:

- The neck on the head is in the short neck stub under the jaw, at (165, 345).
  The hair hangs below it and covers the back of the shoulders.
- The shoulder is at the top of the sleeve mark on the torso.
- The hips are inside the skirt, about 55 px above its hem, so that the legs
  come out from under the skirt. They are 10 and 30 px behind the middle of the
  skirt. When they were centred on it, the forward leg in a long stride poked
  out past the front edge of the skirt.
- The ankle is inside the boot shaft. The boot is tall, so `ankleHeight` is 116
  foot pixels, against 85 for the boy's sneaker.
- The outline color `#452332` and the skin color `#f8bd93` are the most common
  colors in the traced head and hand.
- The legs are 190 long, instead of the boy's 205, because the higher ankle
  leaves a shorter distance from the hip, and a longer leg would bend more while
  she stands. The arms and legs are a little thinner than the boy's.

## Face

- **Eye:** the white of the eye spans x 185–240 and y 207–228 in head pixels,
  and the eyeliner reaches from x 172 to 260 with a wing at the top left. An
  ellipse that covers the eyeliner would also cover the lid crease above it, so
  the closed eye showed the old eyeliner and the lower lid line around the new
  lash line. The rig now has `eyeClip`, a path around the eye and the eyeliner
  that I read from `inspect-piece.ts`, and the lids are clipped to it. The
  ellipse `eye` is the box around that path. The eye is wider than the boy's, so
  the renderer now sizes the lids and the lash line from `eye.rx` instead of
  using fixed widths.
- **Mouth patch:** the traced mouth is a short line at y 284, inside a straight
  profile. The patch is a single skin-colored shape over the line, with no new
  outline.
- **Mouth:** the control point of the upper lip is above the corners, so the
  closed mouth turns down a little. The corner mark also points down.

## Checks

I rendered frames of each clip to SVG and checked them with `pnpm render-svg`:
standing, five frames of the walk, the wave, and the talk with a blink at 2×.

## Hair layers

The traced head has all the hair in it. The hair on the near side of the head
hangs down over the shoulder and should be in front of the arms, and the slice
of far hair behind the neck should be behind the torso. I split `head.svg` into
three layers in the same pixels, each one the traced head with a clip path. A
line under the jaw and across the hair, above the collar of the torso, divides
them:

- `head.svg`: everything above the line: the face, the fringe, the ear and the
  top of the hair.
- `head-front-hair.svg`: the near hair under the line, left of the neck and
  along the edge of the lock with the pink streak. It goes last in `drawOrder`,
  in front of the near arm and the hand.
- `head-back-hair.svg`: the neck and the slice of far hair behind it. It goes
  right before the torso, so the neck goes into the collar and the torso covers
  the far hair below the collar.

The two layers under the line reach 8 px above it, so that no seam shows.

The traced paths are big stacked shapes that cross the face and the hair, so
sorting them by color did not give clean layers. The clip paths keep the look of
the trace exactly. The ids of the clip paths start with `emo-`, because the
layers of all parts are symbols in one SVG document.

A first version put all the hanging hair behind the torso. Then the hair showed
only behind the back, and the near side of the head looked as if it had little
hair. I checked the idle, the walk, the wave and the talk in the studio.
