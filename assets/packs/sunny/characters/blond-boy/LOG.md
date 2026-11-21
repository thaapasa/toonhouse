# Boy

The boy was made in the 2D motion prototype, and
[prototypes/LOG.md](../../../../../prototypes/LOG.md) describes how. This log
covers the changes after he moved to the app.

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
  sole, toe cap and laces of the shoe are one role, `shoe-trim`.
- The lines inside the outline are paths of their own (`lines` in the configs):
  the mouth, the lid line, the ear and its curl on the head, the finger gaps and
  the creases on the hands, the waistband and the split line of the torso, and
  the lace outlines and the sole line of the shoe.

## Color presets

The boy has color settings for the skin, the hair, the eyes, the shirt, the
shorts, the shoes and the outline. An eye preset colors the pupil. A shirt
preset colors the stripes too, and a shoe preset colors the trim. The eyelids
follow the skin, and the sleeves follow the shirt. The mouth patch got the class
`c-skin`, so that it follows the skin.

The outline is one color for the whole boy. The lines of the face, `colors.line`
and the line of the mouth patch, were `#44260c`, next to the `#422517` of the
outline. They are now the outline color, and `colors.line` follows the outline
role, so that the outline preset colors every line.

The black hair is `#2e2826`, a little lighter than the outline, so that the
outline still shows around the hair.
