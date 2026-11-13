# Bunny: work log

A chubby caramel bunny with a cream belly and pink ears, made with the steps in
[cutout-toons.md](../../cutout-toons.md) but with a rabbit rig. Work files are
in `assets/work/bunny/`.

## Parts sheet

1. The prompt follows the hen's, with five pieces for a rabbit: the head without
   ears, with a closed smile; one long ear; the body as a crouched loaf with the
   haunch and the tail; a round front paw; and a long hind foot. The ears are a
   separate piece so that they can move on their own.
2. Generated three seeds at 1280×1024:
   `pnpm generate-image --prompt-file assets/work/bunny/parts.txt --out assets/work/bunny/parts.png --width 1280 --height 1024 --seed 11 --count 3`.
   Each took about 90 s.
3. I picked seed 13, and `parts.prompt.json` is its request. Seed 11 has a
   shaded band under the head, and seed 12 has an upright egg for a body and
   claw lines on the paw and the foot. Seed 13 is flat, and its crouched body
   suits both sitting and hopping.

## Splitting and tracing

1. In `prototypes/`:
   `node scripts/split-sheet.ts ../assets/work/bunny/parts-13.png ../assets/work/bunny/pieces`.
   It found five pieces: `ear`, `head`, `body`, `paw` and `foot`, in that order.
2. Traced each piece with the default settings and checked it on a blue
   background. No colors merged. Then I added a `viewBox` to each SVG.

## Rig

I read the points from zoomed crops of the pieces with a 20 px grid
(`inspect-piece.ts --zoom`).

- The body pivot is the hip, in the middle of the round haunch. The body came
  with a small foot drawn at the bottom, and the near hind foot covers it when
  the bunny sits.
- The head turns around a point at the bottom of the back of the head. The head
  is drawn at 0.8 and overlaps the top of the body, so no neck is needed.
- The ears turn around the middle of their flat bottom edge. Both roots are
  under the top edge of the head, and both ears are drawn behind the head, so
  that the cut edge doesn't show.
- The heel of the hind foot is the pivot of the foot. The hind legs are long
  enough (68 and 72 px) to reach the toes at the push-off of a hop. When the
  bunny sits, the legs fold up inside the haunch.

## Face

- **Eye:** the ellipse is a little smaller than the ring around the eye, so the
  closed eye keeps its ring.
- **Mouth:** the head came with a closed smile, so it needs no patch. An open
  mouth follows the traced smile on top and drops a curve below it, with the
  tongue and two front teeth inside. At first the mouth opened by 34 px and was
  too small to see at the normal size, so it now opens by 60 px.

## Clips

- **Idle:** the bunny sniffs with quick little nods, looks up for a moment and
  flicks an ear.
- **Hop:** the ground only moves while the bunny is in the air, so a foot that
  is flat on the ground stays still without any sliding. The hind feet push off
  from the toes, and the front paws land first, ahead of the body. With a short
  push-off, the feet left the ground while still under the body, and the push
  didn't show. The toes now stay down for 42 % of the jump.
- **Look out:** the bunny sits up on the hind legs with the paws in front of the
  chest, and the ears stand up and turn to listen. When the body tipped back
  around the hip, the tail went into the ground, so the hips also lift.
- **Talk:** the mouth opens and closes with the front teeth showing, and the
  head bobs a little.

## Checks

I rendered frames of each clip to SVG with a script in `assets/work/bunny/` and
looked at them with `render-svg`: the hop every 0.04–0.07 s, the look out going
up and coming down, and the open mouth at 5×. Then I opened the bunny in the
studio.
