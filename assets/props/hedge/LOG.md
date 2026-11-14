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
