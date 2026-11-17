# Boy

The boy was made in the 2D motion prototype, and
[prototypes/LOG.md](../../../prototypes/LOG.md) describes how. This log covers
the changes after he moved to the app.

## Redrawn parts

The traced parts had stacked shapes in many shades, rough edges and seams. The
head, the torso, the hands and the foot were redrawn with `redraw-image` from
the traced SVGs of commit `21d5f56`. The configs are in `redraw/`. Their source
is `assets/work/boy-traced/<part>.svg`, which you get back with:

```sh
mkdir -p assets/work/boy-traced
for p in head torso hand hand-open foot; do
  git show 21d5f56:assets/characters/boy/$p.svg > assets/work/boy-traced/$p.svg
done
```

- The outline of every part is `#422517` and the skin is `#fbc688`, the same as
  `colors.outline` and `colors.skin` of the rig. The mouth patch and
  `colors.lid` use the same skin.
- The traced shades went to the color they belong to, and these details went
  with them: the darker patch on the neck, the darker streak in the hair, and
  the dark red tongue of the shoe.
- On the open hand, the light brown knuckle crease is now in the outline color.
- On the torso, the dark green split line between the legs of the shorts is in
  the outline color, and the dark green band along the edge of the shorts is
  part of the shorts. The shirt is one shape under its stripes.
- The outline around the shorts is thicker on the right side, as in the traced
  SVG.
- Each fill path has the class of its color role, such as `c-skin`. The white
  sole, toe cap and laces of the shoe are one role, `trim`.
