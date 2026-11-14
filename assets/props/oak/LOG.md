# Oak: work log

A big round leafy tree: a trunk with a fork of short branches, and four clumps
of leaves for the crown. Work files are in `assets/work/props/`.

## Parts sheet

1. The first prompt (`oak.txt`, seeds 11 and 12) asked for the trunk with two
   branches and three leaf clumps. Both seeds drew the largest clump on top of
   the trunk, so the trunk and the crown came as one piece.
2. The second prompt (`oak2.txt`) asks for "a bare leafless tree trunk like a
   tree in winter … standing alone with empty space all around it" on the left,
   and four loose leaf clumps "floating apart from each other and from the
   trunk" on the right.
3. Generated seeds 21 to 23 at 1280×1024. I picked seed 21, and
   `parts.prompt.json` is its request. It has a bold outline like the
   backgrounds. Seed 22 had a thinner outline, and seed 23 was as clean as seed
   21 with a plainer trunk.

## Splitting and tracing

`split-sheet.ts` found five pieces: the big clump, the trunk, a dark clump, a
light clump and a small light clump. They traced cleanly with the default
settings. I added a `viewBox` to each SVG.

## Rig

- The trunk is the root bone, drawn at 1.65, with the ground point at the middle
  of its base. The oak is about 2.4 times as tall as the boy.
- The big clump is behind the trunk, at 1.9, so the forked branches show in
  front of the leaves, as in the style reference. The dark clump is on the right
  behind the trunk, the light clump on the left in front of it, and the small
  light clump on top in front of the big one. The side clumps hang low enough
  that the trunk shows only below the fork.
- The pivot of each clump is in its middle, at 75 % of its height, near where a
  branch would hold it.
- The trunk sways 0.5°. The big clump sways 1.5°, the side clumps 2.5° and the
  small top clump 3.5°, with a squash of 0.03 to 0.04.
