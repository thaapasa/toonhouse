# Captain: work log

A stout ship captain with curly auburn hair under a red bandana, a gold hoop
earring and a smirk, in a navy double-breasted jacket, ochre trousers and
oxblood boots. She is in the [adventure pack](../../packs/adventure/), and was
made with the steps in [cutout-toons.md](../../cutout-toons.md) after the
[quartermaster](../quartermaster/LOG.md). Work files are in
`assets/work/captain/`.

## Parts sheet

1. The first prompt described "a stout, broad-shouldered middle-aged woman ship
   captain with a weathered tanned face, a strong chin". All three seeds (11
   to 13) drew a man. They also had black boots, which would merge with the
   near-black outline in tracing.
2. The second prompt asks for "a female ship captain with a clearly feminine
   face, long eyelashes, full lips", "the head of the woman", "a fitted ...
   jacket for a woman" and oxblood red boots. Seeds 21 to 23 at 1280×1024 took
   about 90 s each.
3. I picked seed 22, and `parts.prompt.json` is its request. Seed 21 had a long
   neck and an open hand with a long wrist, and seed 23 had short sleeves on the
   torso.

## Splitting and tracing

1. `split-sheet.ts` found five pieces: `head`, `torso`, `hand-open`, `hand` and
   `foot`, in that order.
2. Traced each piece with the default settings. No colors merged.
3. The relaxed hand is a mitten with the cuff at the bottom, so `hand.svg` is
   flipped upside down with a `transform`. The thumb then sits at the front of
   the hanging hand. The open hand came with the thumb on the left, so
   `hand-open.svg` is mirrored.
4. The torso came out 515 px tall and is scaled to 0.8, which makes it 196×412,
   about the size of the emo girl's.

## Rig

I wrote `rig.json` by hand from the row extents of the alpha masks and from
`inspect-piece.ts`, in the same way as for the quartermaster.

- The curly hair hangs below the jaw at the back, so the head is drawn before
  the torso in `drawOrder`, and the hair goes behind the back.
- The hips are near the hem of the shorts, and the legs are ochre, as trousers,
  with `legColor`.
- The sleeve is navy and covers 85 % of the arm, as the sleeve of the jacket.
- The head is drawn at 0.75, the hands at 0.62 and the boot at 0.6.

## Face

- **Eye:** the white of the eye spans x 268–296 and y 126–140 in head pixels.
- **Mouth patch:** a skin-colored shape over the traced lips and the smile line,
  inside the profile outline. The lips still show as a bump in the profile.
- **Mouth:** from (290, 193) to (337, 199), with the control point below the
  corners, so the closed mouth smiles. The corner mark turns up.

## Checks

I rendered frames of the walk, the wave, the talk and the blink with
`assets/work/quartermaster/frames.ts` (`CHAR=captain`) and checked them with
`pnpm render-svg`. The wave shows the traced lips, because the wave uses the
traced mouth.
