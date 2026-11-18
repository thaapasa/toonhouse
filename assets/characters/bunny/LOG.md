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

- The body pivot is the hip, in the middle of the round haunch.
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

## Body without the hind foot

The body came with a hind foot drawn at the bottom, under the front of the
haunch. When the bunny sat, the near hind foot covered it, but in the hop the
drawn foot showed next to the legs of the renderer, so the bunny had two pairs.
I removed the foot from `body.svg`:

- I dropped the paths of the toes and of the top line of the foot.
- A clip path cuts off the bottom front corner of the body along a curve from
  the flat bottom up to the belly, and a stroke in the outline color and width
  closes the outline along the same curve.
- Two patches in the fur and the belly colors cover what was left of the outline
  around the foot, and the line of the haunch now runs down to the bottom.

The hip and the pivot of the body did not need to move. I checked the hop, the
idle, the look out and the talk in the studio.

## Redrawn parts

The traced parts had stacked shapes in many shades and rough edges. All five
parts were redrawn with `redraw-image`, and the configs are in `redraw/`.

### Sources

The head, the ear, the paw and the foot were redrawn from the pieces in
`assets/work/bunny/pieces/`, which have the same frames as the parts. The pieces
are smoother than the traced SVGs: the trace had broken the rim of the inner ear
into many shades. To get the pieces back, generate `parts-13.png` from
`parts.prompt.json` and split it as in "Splitting and tracing".

The body was redrawn from the committed `body.svg` of commit `c70f59d`, because
the piece still has the hind foot that was removed from the part (see "Body
without the hind foot"). To get it back:

```sh
mkdir -p assets/work/bunny/traced
git show c70f59d:assets/characters/bunny/body.svg > assets/work/bunny/traced/body.svg
```

### Prep scripts

Two scripts change the sources before the redraw. Run them from the repo root:

```sh
mkdir -p assets/work/bunny/redraw
MISE_ENV=art mise exec -- uv run --script assets/characters/bunny/redraw/prep-head.py \
  assets/work/bunny/pieces/head.png assets/work/bunny/redraw/head-prep.png
python3 assets/characters/bunny/redraw/prep-body.py \
  assets/work/bunny/traced/body.svg assets/work/bunny/traced/body-prep.svg
```

- `prep-head.py`: in the head piece, the pupil, the ring around the eye and the
  smile are all near black, while the outline of the head is dark brown. The
  script paints the near-black pixels outside an ellipse around the pupil in the
  outline color, so that only the pupil is black. On the right, the pupil
  touches the ring, so a little of the ring stays black.
- `prep-body.py`: in the traced body, the line of the haunch was three pieces of
  different widths and came out wavy. The script replaces them with one stroke
  in the outline color, covers a leftover wedge of the old line with fur, and
  starts the stroke that closes the cut outline a little higher up, so that no
  notch shows where it meets the traced outline.

### Colors

- The outline is `#442113`, the fur `#e7a862` and the belly `#fcf0da`, the same
  as `colors.outline`, `colors.fur` and `colors.belly` of the rig. The traced
  shades went to the color they belong to, such as the darker fur at the bottom
  of the head and the paw, and the shaded belly.
- `belly` is the role of all the light fur: the muzzle, the belly, the inner
  side of the paw and the sole of the foot.
- The other roles are `eye`, `pupil` and `nose` on the head, `ear-inner` and
  `ear-inner-rim` on the ear, and `tail` on the body. The highlight of the eye
  is part of `eye`, and the highlight of the nose is part of `nose`.
- The line of the haunch was a lighter brown and is now in the outline color.
- These lines are line paths (`lines` in the configs): the smile and the ring of
  the iris on the head (in two pieces), the line of the haunch and the line
  between the tail and the body, and the toe line on the foot.

All five configs use a higher `smooth` than the default, because the pieces are
small and their edges came out lumpy.
