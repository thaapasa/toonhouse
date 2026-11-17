# Hedge: work log

A long low hedge made of three sections. Work files are in `assets/work/props/`.

## Parts sheet

1. The prompt asks for three parts of a long low hedge, each with a bumpy leafy
   edge and a flat bottom: a long section in dark green, much wider than it is
   tall, and a medium and a short section in green.
2. Generated seeds 11 and 12 at 1280×1024. I picked seed 12, and
   `parts.prompt.json` is its request. Its sections are taller and rounder than
   the flat strips of seed 11.
3. `split-sheet.ts` found three pieces. They traced cleanly with the default
   settings. I added a `viewBox` to each SVG.

## Rig

- The long section is the root bone, drawn at 1.8, with the ground point in the
  middle of its bottom edge. The hedge is about half as tall as the boy and
  about 1.7 times as wide as he is tall.
- The medium section is at the left end and the short one at the right end, both
  behind the long section, with their bottoms on the ground line.
- The long section sways only 0.5° with a squash of 0.025, because it is so wide
  that a larger angle lifts its ends off the ground. The end sections sway 1.5°
  with a squash of 0.04.

## Redrawn parts

The traced sections had rough edges and darker green specks along the top. The
sections were redrawn with `redraw-image` from the traced SVGs of commit
`c2e0330`, so their frames and the pivots in `rig.json` stay as they were. The
configs are in `redraw/`.

To get the sources back and redraw the sections:

```sh
mkdir -p assets/work/hedge/traced
for p in sectionLong sectionMiddle sectionShort; do
  git show c2e0330:assets/props/hedge/$p.svg > assets/work/hedge/traced/$p.svg
  MISE_ENV=art mise run redraw-image -- assets/props/hedge/redraw/$p.json
done
```

The sections have these colors and color roles:

- The outline of every section is `#453614`. The leaf marks inside the sections
  are lines in the outline color. They are wider than the default
  `lines.maxWidth` of 8 px, so the configs set it to 14.
- The long section has `leaves-dark`, and the medium and the short section have
  `leaves`, so that a color preset can keep the long section darker.
- The dot in the medium section was dark green in the trace. `recolor` gives it
  the outline color, as in the other sections.
