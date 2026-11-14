# Duck: work log

A plump duck with a green head, a white collar, a grey body and orange webbed
feet, made with the steps in [cutout-toons.md](../../cutout-toons.md) and the
bird rig of the hen. Work files are in `assets/work/duck/`.

## Parts sheet

1. The prompt follows the hen's, with five pieces for a duck: the head on a
   short neck with a white collar and a closed broad bill; the body as a round
   boat shape with a curled tail; a folded wing; an open wing; and a webbed
   foot.
2. Generated three seeds at 1280×1024:
   `pnpm generate-image --prompt-file assets/work/duck/parts.txt --out assets/work/duck/parts.png --width 1280 --height 1024 --seed 11 --count 3`.
   Each took about 90 s.
3. I picked seed 13, and `parts.prompt.json` is its request. Seed 11 has a small
   open wing that looks like a second folded wing. Seed 12 has a body split into
   a grey and a tan half with no wing patch, and an open wing that points
   forward. Seed 13 has a clear fan for the open wing and a round body.

## Splitting and tracing

1. In `prototypes/`:
   `node scripts/split-sheet.ts ../assets/work/duck/parts-13.png ../assets/work/duck/pieces`.
   It found five pieces: `wing-open`, `head`, `body`, `wing` and `foot`, in that
   order.
2. Traced each piece with the default settings and checked it on a blue
   background. No colors merged. Then I added a `viewBox` to each SVG.
3. The body came with a tan wing patch drawn on its side. The folded wing is
   narrower than the patch, so the patch showed around it. `body.svg` now ends
   with a grey ellipse over the patch.
4. The open wing fans up and forward from its root. A wing that spreads for a
   flap points up and back, so `wing-open.svg` is mirrored with a transform.
5. The foot came as a webbed paddle seen from above. Standing on its edge, it
   would have been a large orange fan. `foot.svg` is drawn by hand instead: a
   flat side view of a webbed foot with a scalloped front edge and two toe
   lines, in the outline color and the orange of the traced foot.

## Rig

I read the points from zoomed crops of the pieces with a 20 px grid
(`inspect-piece.ts --zoom`).

- The head turns around a point low in the neck stub, above the collar.
- The folded wing turns around its rounded front end and is turned 40°
  (`foldedAngle`), so that it lies along the body with the feather tips at the
  back. The open wing turns around its root.
- The clips are made for the hen. In the peck, the body tips 75° around its
  pivot, and with the first rig the bill went about 50 px under the ground. Two
  changes lift the head: the body pivot is near the front and the bottom of the
  body, at (165, 192), and the neck point is further back on the top of the
  body. The hips stay at y 178, so the legs come out of the bottom of the body.
- The neck and the lids take the color in `colors.feathers`, which is the green
  of the head. The thighs take `colors.thigh`, the grey of the body, so that
  they look like a part of it.
- The legs are 45 + 78 px long. The hips are 117 px above the ankles when the
  duck stands, so the legs bend a little and bend more in the walk.
- The head is drawn at 0.56 and the feet at 0.6.

## Face

- **Eye:** the ellipse is a little smaller than the ring around the eye, so the
  closed eye keeps its ring.
- **Bill:** the head came with a closed bill. The line between the halves runs
  from the back corner of the bill at (157, 137) to under the tip at (248, 139).
  The lower half is drawn in code along that line and turns down by 30°.

## Checks

I rendered frames of each clip to SVG with `tools/frames.ts` in the work folder
and checked them with `render-svg`: the idle, the walk every 0.15 s, the peck
going down and coming up, the flap in the air, and the open bill and a blink at
3×.

## Fixes after the first version

I measured how far each clip reaches below the ground by rendering every frame
without the shadow and finding the lowest opaque row, with
`assets/work/fixes/lowest.ts`. The first version had three problems:

- **Peck:** the bill went up to 38 px into the ground at each stab. The peck
  tips the body 75° around its pivot, and the bill of the duck is longer than
  the beak of the hen. Moving the neck point 32 px back on the body, to (160,
  48), raises it by about 30 px when the body is tipped, and drawing the head at
  0.56 instead of 0.6 shortens the bill. The bill now touches the ground at each
  stab.
- **Walk:** at the toe-off, the foot turns around the ankle and the toes went 13
  px into the ground. The ankle was near the heel, at x 42 of the 192 px foot.
  At x 80, the toes reach less far in front of the ankle and stay on the ground.
- **Thighs:** the bird rig painted the thighs in the color of the neck, so they
  were green. The rig now has an optional `colors.thigh`, and the duck's thighs
  are the grey of the body. With grey thighs, the legs could be long enough to
  bend: they were 28 + 58 px, shorter than the 117 px from the hip to the ankle,
  so they were always straight and the shanks stretched.
