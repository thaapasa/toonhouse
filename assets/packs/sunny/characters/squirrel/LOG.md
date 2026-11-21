# Squirrel: work log

A lively red squirrel with a cream belly, tufted ears and a big curled tail,
made with the steps in [cutout-toons.md](../../../../cutout-toons.md) on the
rabbit rig of the [bunny](../bunny/LOG.md). Work files are in
`assets/work/squirrel/`.

## Parts sheet

1. The prompt is the bunny's, with a squirrel in place of the rabbit: the head
   without ears, one small pointed ear with a tuft at the tip, the sitting body
   with a huge tail that curls up behind the back, a round front paw and a long
   hind foot.
2. Generated three seeds at 1280×1024:
   `pnpm generate-image --prompt-file assets/work/squirrel/parts.txt --out assets/work/squirrel/parts.png --width 1280 --height 1024 --seed 11 --count 3`.
   Each took about 90 s.
3. I picked seed 13, and `parts.prompt.json` is its request. Seed 11 has a tiny
   paw and a hind foot as thin as a stick. Seed 12 has a foot drawn at the
   bottom of the body, which the bunny's body also had and which had to be cut
   off. Seed 13 has a round head with a clear smile, a body without a foot, and
   a tail that stays clear of the head.

## Splitting and tracing

1. In `prototypes/`:
   `node scripts/split-sheet.ts ../assets/work/squirrel/parts-13.png ../assets/work/squirrel/pieces`.
   It found five pieces: `body`, `head`, `ear`, `paw` and `foot`, in that order.
   The tufts of the ear stayed in the ear piece.
2. Traced each piece with the default settings and checked it on a blue
   background. No colors merged. Then I added a `viewBox` to each SVG.
3. The body came with two specks in the empty space under the tail, which I
   removed, and a dark red streak along the outline of the tail, which I
   recolored to the outline color.

## Redrawn parts

The traced parts had stacked shapes in several shades of dark red along the
outline, and the ear was a pile of overlapping red shapes. All five parts were
redrawn with `redraw-image` from the pieces of the parts sheet, which have the
same frames as the parts, so the pivots in `rig.json` stay right. The pieces
give cleaner shapes than the traced SVGs, most of all for the ear. The configs
are in `redraw/`.

To make the pieces again, generate seed 13 with `parts.prompt.json`, save it as
`assets/work/squirrel/parts-13.png`, and split it as described in "Splitting and
tracing". Then redraw the parts:

```sh
for p in head ear body paw foot; do
  MISE_ENV=art mise run redraw-image -- assets/packs/sunny/characters/squirrel/redraw/$p.json
done
```

The parts have these colors and color roles:

- The outline of every part is `#3b0603`, the fur is `#f23c06` and the cream is
  `#fceac6`, the same as `colors.outline`, `colors.fur` and `colors.belly` of
  the rig.
- Head: `fur`, `belly` for the cream cheek and chin, and `eye`. The pupil and
  the nose are in the outline color. The smile is a line.
- Ear: `fur` and `ear-inner` for the pink inside. The tufts are dark in the
  sheet, so they are mostly outline, with fur at their roots. The ear is small,
  so its config uses `scale` 8, `smooth` 1.5, `minArea` 120 and `edge` 2.5.
  Without the last two, the bottom edge came out ragged where the source outline
  is thin.
- Body: `fur` and `belly` for the cream belly. The line of the haunch and the
  curl of the tail are lines.
- Paw: `fur` and `belly` for the cream top. The notch between the fingers runs
  into the outline, so it stays part of the outline. The paw uses `scale` 8 and
  `smooth` 1.5.
- Foot: `fur` and `belly` for the cream sole. The crease at the heel is a line.

The redrawn silhouettes are 1 to 3 px smaller than the traced ones, because the
traced outline spread a little past the edge of the piece. The ground points
stay as they were. Measured with `assets/work/fixes/lowest.ts`, the look out and
the hop reach 7 px below the ground and the idle 4 px, against 9, 9 and 6 px
with the traced parts. Near the tip of the tail, the first ground point is now
about 7 px below the edge of the body. It only lifts the body a little earlier
when the tail tips down.

## Rig

The rabbit clips place the paws and the feet for the proportions of the bunny:
the hip is 78 px above the ground, and the near shoulder is 120 px in front of
the hip and 35 px above it. I read the points from zoomed crops of the pieces
with a 20 px grid (`inspect-piece.ts --zoom`) and set them to fit:

- The body pivot is the hip, in the middle of the round haunch, 78 px above the
  bottom of the body, so the squirrel sits on the ground.
- The shoulders are in the cream belly, 120 px in front of the hip. The neck is
  near the narrow top of the body, which the head covers.
- The head and the hind foot came off the sheet at nearly the size of the
  bunny's, so they keep the bunny's scales, 0.8 and 0.45. The foot also keeps
  the bunny's heel pivot and heel height.
- The ear is short, so it is drawn at 0.7. Both roots are under the top edge of
  the head, and the ears are drawn behind the head, as on the bunny.
- The outline color `#3b0603` is the outline of the body, where the legs join.

## Face

- **Eye:** the ellipse is a little smaller than the ring around the eye, so the
  closed eye keeps its ring.
- **Mouth:** the head came with a closed smile, so it needs no patch. With the
  bunny's opening of 60 px, the open mouth hung far below the chin, because the
  chin of this head turns back right under the smile. The mouth now opens by 42
  px. The drawn upper lip first sat 4 px below the traced smile, so the teeth
  floated in a dark band. I moved the lip and the teeth up to meet the smile.

## Checks

I rendered frames of each clip to SVG with `tools/frames.ts` in the work folder
and looked at them with `render-svg`: the idle with a blink, the hop every 0.08
s, the look out going up and coming down, and the open mouth at 9×.

- The hop works without changes: the tail rides along with the body.

## Tail on the ground

In the look out, the body tips back 52° around the hip, and the tail went up to
24 px below the ground line. The clip sets the tilt and the lift of the hips for
the bunny, and clips don't know the rig, so the fix is in the renderer.

The rabbit rig has `groundPoints`: points along the bottom of the body, 8 px
inside the outline, read from the lowest opaque row of every 20th column of
`body.svg`. If a clip tips the body so that one of them would go below the
ground, the renderer lifts the hip until it is on the ground, and the hind legs
stretch to the feet. While the squirrel sits, the points are about 4 px above
the ground, so the sitting pose doesn't change. The bunny has no ground points
and draws as before.

The tail now lies on the ground in the look out. The hop also changed a little:
at the landing, the front of the body dipped 17 px into the ground, and now the
body stays on it.

To measure how far a clip reaches below the ground, I rendered every frame
without the shadow and found the lowest opaque row. The script is
`assets/work/fixes/lowest.ts`.

## Known problems

- At the mouth's full opening, the bottom of the mouth pokes a little past the
  line of the chin. It shows only in a close-up.
