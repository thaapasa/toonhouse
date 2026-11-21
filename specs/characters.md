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
- [ ] A color preset sets the color roles of its color setting. A role that no
      setting colors keeps the color that the character has in the library.
- [ ] A character or a prop has color settings, such as the skin, the hair and
      the shirt. Each setting has its own color presets, and the user picks one
      preset for each setting.
- [ ] A color preset of a setting can color several roles, such as the shirt and
      the stripes on it.
- [ ] The outline is a color setting of its own, with one color for all the
      lines of the character, so that the lines suit the other colors.
- [ ] The first color preset of each setting is the default, and it has the
      colors that the character has in the library.
- [ ] Every character and prop in the library has color settings from the time
      it is added, for the colors that a user would want to change. A person has
      settings for the skin, the hair, the eyes, the clothes and the outline, an
      animal for its fur or feathers, and a plant for its leaves or flowers.
- [ ] Each color setting has a range of presets that suit the character, such as
      natural hair colors from blond to black and a few playful ones, such as
      blue.
- [ ] A color setting colors the shades and the details of a thing together,
      such as the dark and the light shades of the leaves or the sole of a shoe,
      so that they still match.
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

- Can an asset draw part of itself with a script, with the colors from the color
  preset? The emo character's skirt plaid is drawn by a script at build time,
  because a redrawn plaid comes out as blotches. If the app ran such scripts, a
  pattern could follow the color preset and even change its layout, such as a
  plaid, stripes or polka dots on the same skirt. The script would have to be
  pure, like the renderer, so that the picture still depends only on the scene
  data and the time.
