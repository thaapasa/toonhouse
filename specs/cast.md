# Cast

Each cartoon has a cast: its own set of characters and props, made from the
library and named by the user. An actor in a scene can use a cast member, and
then it changes whenever the user edits the cast member. A setting can come from
three levels, and each level starts from the one above it:

1. The [library](characters.md) character or prop has defaults for its settings.
2. A cast member sets its own values for the cartoon.
3. An actor in a scene can override any setting for that scene only.

- [ ] User can make a cast member from a character or a prop in the library, and
      give it a name.
- [ ] User can change the settings of a cast member, such as a color preset or
      the size.
- [ ] User can add a cast member to a scene as an actor.
- [ ] If the user changes a cast member, every actor that uses it changes in
      every scene of the cartoon.
- [ ] User can override a setting of an actor in one scene. Then a change to the
      cast member doesn't change that setting of that actor.
- [ ] If the user resizes an actor by dragging it in a scene, the size becomes
      an override for that actor.
- [ ] User can clear an override, and then the actor follows its cast member
      again.
- [ ] User can see which settings of an actor are overrides.
- [ ] User can add a character or a prop from the library straight to a scene,
      without a cast member. Then the actor starts from the defaults of the
      library and has only its scene overrides.
- [ ] User can remove a cast member.

## Open questions

- Which settings beyond colors and size, such as the size of the head?
- Besides the color presets, can the user pick any color with a color picker?
- If the user removes a cast member that actors still use, are those actors
  removed, or do they become actors without a cast member?
- Can the user turn an actor without a cast member into a cast member later?
