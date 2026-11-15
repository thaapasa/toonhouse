# Cartoon

A cartoon is made of shots. Each shot plays a part of one [scene](scenes.md),
and the shots play one after another. The user edits each scene on its own, and
then puts the cartoon together from them. One scene can appear in many shots, so
the cartoon can show it again or cut back to it.

- [ ] User can add a shot that plays a scene, and remove a shot.
- [ ] User can change the order of the shots.
- [ ] A shot plays the whole scene, or the part between a start time and an end
      time that the user picks.
- [ ] User can use the same scene in several shots.
- [ ] User can set the speed of a shot to any number other than zero, such as
      2x, 0.5x, 8.5x or 0.03x. A negative speed plays the shot backwards. The
      app offers common speeds as presets, and the user can type any other
      speed.
- [ ] User can make a shot hold one frame of the scene for a time.
- [ ] A shot plays the sounds of its scene, in sync with the speed of the shot.
- [ ] User can add music to the cartoon that plays across several shots.
- [ ] If the user changes a scene, every shot that uses it shows the change.
- [ ] If a scene gets shorter than the part that a shot plays, the shot plays
      only up to the new end of the scene, and the cartoon gets shorter.
- [x] Each scene belongs to one cartoon.
- [ ] User can copy a scene. The copy is a new scene in the same cartoon, and
      the shots keep using the original.

## Open questions

- Can shots overlap, for example to show two scenes at once or to fade from one
  to the next?
- Which transitions between shots does the app have, such as a cut, a fade or a
  wipe?
- Can the user copy a scene to another cartoon? The cast belongs to one cartoon,
  so the actors of the copy would use cast members that the other cartoon
  doesn't have.
