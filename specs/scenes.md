# Scenes

A scene is a background with characters and props on it, and a timeline for
them. The user edits each scene on its own, and a [cartoon](cartoon.md) plays
parts of its scenes in a row.

- [ ] User can add characters and props to the scene, and remove them.
- [ ] User can move a character by dragging it, and change its size.
- [ ] If the user changes the size of an actor, its ground point stays in place,
      so its feet stay on the ground.
- [ ] User can lock an actor in a scene. A locked actor can't be selected or
      moved by touching it on the stage, so that the user can work on the other
      actors.
- [ ] User can select a locked actor and unlock it from outside the stage, such
      as from the timeline or a list of the actors.
- [ ] Scenes are saved on the server, and the user can open them later.
- [ ] User can edit a scene in the web app, also on an iPad.

## Backgrounds

A background is an actor too. It can have layers at different depths, such as
the sky, the hills far away and the ground that the actors stand on, and it can
have clips, such as the sun moving across the sky.

- [ ] User can pick a background from the library.
- [ ] A background has one or more layers, each at its own depth. The
      [camera](camera.md) moves the far layers less than the near ones.
- [ ] The actors stand on the ground layer of the background.
- [ ] A background can have clips, such as the sun moving across the sky or
      leaves moving in the wind.
- [ ] User can start a clip of the background on the timeline, as for any other
      actor.

## Open questions

- Can a background have layers in front of the actors, such as a bush that an
  actor walks behind?
