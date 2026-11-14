# Squirrel: work log

A lively red squirrel with a cream belly, tufted ears and a big curled tail,
made with the steps in [cutout-toons.md](../../cutout-toons.md) on the rabbit
rig of the [bunny](../bunny/LOG.md). Work files are in `assets/work/squirrel/`.

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
- In the look out, the body tips back around the hip, and the tail comes down to
  lie along the ground behind the squirrel. Its lowest part goes about 15 px
  below the ground line. The clip sets the tilt and the lift of the hips for the
  bunny, so a fix needs a setting for the tilt in the rig or the clip.
