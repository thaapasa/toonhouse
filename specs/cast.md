# Cast

Each cartoon has a cast: its own set of characters and props, made from the
library and named by the user. An actor in a scene can use a cast member, and
then it changes whenever the user edits the cast member. A setting can come from
three levels, and each level starts from the one above it:

1. The [library](characters.md) character or prop has defaults for its settings.
2. A cast member sets its own values for the cartoon.
3. An actor in a scene can override any setting for that scene only.

The settings are the size and a color preset for each color setting. The user
picks the colors from the presets of the character or the prop.

- [x] User can make a cast member from a character or a prop in the library, and
      give it a name.
- [x] User can see the cast of the cartoon in the editor, with a picture of each
      cast member in its colors.
- [x] User can change the name of a cast member.
- [x] User can change the settings of a cast member, such as a color preset or
      the size.
- [x] User can add a cast member to a scene as an actor.
- [x] If the user changes a cast member, every actor that uses it changes in
      every scene of the cartoon.
- [x] User can override a setting of an actor in one scene. Then a change to the
      cast member doesn't change that setting of that actor.
- [ ] If the user resizes an actor by dragging it in a scene, the size becomes
      an override for that actor.
- [x] User can clear an override, and then the actor follows its cast member
      again.
- [x] User can see which settings of an actor are overrides.
- [x] Resizing an actor with the size buttons or the properties pane makes the
      size an override for that actor.
- [x] User can add a character or a prop from the library straight to a scene,
      without a cast member. Then the actor starts from the defaults of the
      library and has only its scene overrides.
- [x] User can remove a cast member. If actors use it, the app first shows how
      many actors use it and asks the user to confirm.
- [x] If the user removes a cast member that actors use, the actors stay in
      their scenes as actors without a cast member, and they look the same as
      before. The settings of the cast member become overrides of each actor,
      together with the overrides that the actor already had.
- [x] User can make a cast member from an actor without a cast member and give
      it a name. The settings of the actor become the settings of the new cast
      member, and the actor uses the new cast member with no overrides. The
      other actors of the same character or prop don't change.
