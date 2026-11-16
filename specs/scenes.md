# Scenes

A scene is a background with characters and props on it, and a timeline for
them. The user edits each scene on its own, and a [cartoon](cartoon.md) plays
parts of its scenes in a row.

- [x] User can add characters and props to the scene, and remove them.
- [x] User can move a character by dragging it, and change its size.
- [x] If the user changes the size of an actor, its ground point stays in place,
      so its feet stay on the ground.
- [ ] User can lock an actor in a scene. A locked actor can't be selected or
      moved by touching it on the stage, so that the user can work on the other
      actors.
- [ ] User can select a locked actor and unlock it from outside the stage, such
      as from the timeline or a list of the actors.
- [x] Scenes are saved on the server, and the user can open them later.
- [x] User can undo and redo the edits of a scene.
- [x] User can remove a scene, after confirming it. The removal can be undone.
      If the user removes the last scene, the cartoon gets a new empty scene.
- [ ] User can edit a scene in the web app, also on an iPad.

## Backgrounds

A background is an actor too. It can have layers at different depths, such as
the sky, the hills far away and the ground that the actors stand on, and it can
have clips, such as the sun moving across the sky.

- [x] User can pick a background from the library.
- [ ] A background has one or more layers, each at its own depth. The
      [camera](camera.md) moves the far layers less than the near ones.
- [x] The actors stand on the ground layer of the background. Each actor has its
      own place on it, so actors can stand nearer to the camera or further from
      it.
- [x] If actors overlap, the one nearer to the bottom of the frame is in front.
- [x] If the user adds an actor without picking a place, it goes to the start
      point of the background.
- [x] A background can have a perspective. Then an actor gets smaller as it goes
      further from the camera, toward the horizon. Without a perspective, the
      actors have the same size everywhere, also up on the sky.
- [ ] A background can set where the actors walk, such as the road. If it
      doesn't, the actors can go anywhere.
- [ ] By default, an actor follows the background: its perspective and where the
      actors walk. User can turn this off for an actor in a scene, and then the
      actor keeps its size and can go anywhere.
- [x] A background can have clips, such as the sun moving across the sky or
      leaves moving in the wind.
- [x] User can start a clip of the background on the timeline, as for any other
      actor.

## Open questions

- Can a background have layers in front of the actors, such as a bush that an
  actor walks behind?
