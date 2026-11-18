# Characters

Characters and props come from a ready-made library. A character is made of
parts, such as the head, the torso and the arms, joined at pivot points. Users
can't make their own characters or props. Developers add them to the library
with the [character studio](studio.md).

- [x] User can pick a character or a prop from the library.
- [ ] A character has clips, such as standing, walking, waving and jumping.
- [ ] The same clip works on every character that has the same rig kind.
- [ ] A character or a prop has settings with defaults, such as color presets
      for its clothes and its size. See [Cast](cast.md).
- [ ] The colors of a character or a prop are split into color roles, such as
      the skin, the hair, the shirt and the logo on the shirt. Each color in its
      parts and its drawn limbs belongs to one role.
- [ ] The color roles and the color presets are made by hand for each character
      or prop, so that every preset is a set of colors that suits that
      character.
- [ ] A color preset can set any of the color roles. A role that the preset
      doesn't set keeps the color that the character has in the library.
- [ ] If a character gets new parts, a saved cartoon still shows its actors in
      the colors that the user picked.
- [x] Each layer of a character has its own place in the draw order, so the
      front hair can be in front of the arms while the back hair is behind the
      torso.
- [ ] A clip can change the draw order while it plays, such as when a hand
      reaches behind the back.
- [x] A character can face left or right.
- [ ] A character's mouth moves while it talks.

## Open questions

- Is a color preset one set of all the colors, or can the user pick the skin,
  the hair and the clothes from separate presets?
- Can a color preset change the outline color, such as a lighter outline for a
  dark character?
- Can an asset draw part of itself with a script, with the colors from the color
  preset? The emo character's skirt plaid is drawn by a script at build time,
  because a redrawn plaid comes out as blotches. If the app ran such scripts, a
  pattern could follow the color preset and even change its layout, such as a
  plaid, stripes or polka dots on the same skirt. The script would have to be
  pure, like the renderer, so that the picture still depends only on the scene
  data and the time.
