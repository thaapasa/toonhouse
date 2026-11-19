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
- [x] User can add a scene to the cartoon, and open any scene of the cartoon in
      the editor.
- [x] Scenes are saved on the server, and the user can open them later.
- [x] The editor saves the cartoon by itself a moment after each edit, and at
      once when the page goes to the background. The user doesn't need to save.
- [x] The editor shows whether the edits are saved, not saved yet or being
      saved, and tells the user when they can't be saved.
- [x] If a save fails because the device is offline or the server has an error,
      the editor tells the user and tries again after a few seconds.
- [x] The editor opens the latest saved version of the cartoon.
- [x] If the server refuses a save, for example because the cartoon is too
      large, the editor tells the user what is wrong. It tries again after the
      next edit.
- [x] If the login has ended, the editor tells the user to log in again and
      keeps the edits on the device. After the login, the editor saves them.
- [x] If the cartoon was saved in another window or on another device after the
      editor opened it, the editor doesn't overwrite that save without asking.
      The user keeps their own version or loads the saved one.
- [x] If the editor closes before its edits are saved, the next editor of the
      cartoon on the same device starts from those edits and saves them. If the
      cartoon was saved elsewhere since, the user chooses between those edits
      and the saved version.
- [x] If the cartoon has been removed while the user edits it, the editor tells
      the user and stops saving.
- [x] User can undo and redo the edits of a scene.
- [x] User can remove a scene, after confirming it. The removal can be undone.
      If the user removes the last scene, the cartoon gets a new empty scene.
- [ ] User can edit a scene in the web app, also on an iPad.

## Stage

The stage in the editor shows the frame of the scene and a band around it. The
user zooms and pans the stage to see what they work on. This view is only for
editing. What the cartoon shows is up to the [camera](camera.md).

- [x] The editor shows a band around the frame of the scene. Actors outside the
      frame show dimmer there, and the user can select and move them, so that an
      actor can wait outside before it comes in. The player shows only the
      frame.
- [x] The band is wide enough that the largest actor fits in it whole, at the
      size of the background, outside the frame.
- [x] An actor can't go past the outer edge of the band, when the user drags it
      or picks the points of a walk. The reason: past the band, the user can't
      see the actor or select it to bring it back.
- [x] User can zoom the stage with the mouse wheel and pan it by dragging with
      the wheel button pressed. On a trackpad, a pinch zooms and a swipe with
      two fingers pans. The zoom keeps the point under the pointer in place.
- [x] On a touch screen, the user zooms the stage with a pinch and pans it with
      two fingers. One finger still selects and moves the actors.
- [x] The stage can't zoom out past the band, or pan so far that the band leaves
      the view.
- [x] User can go back to the home view with one button.
- [x] The editor opens a scene at the home view: the whole frame with a thin
      margin. The stage doesn't fit the whole band, because the band can be
      almost as large as the frame.
- [x] Zooming and panning the stage doesn't change the scene, the camera or the
      cartoon, and undo doesn't step through it.

## Backgrounds

A background is an actor too. It can have layers at different depths, such as
the sky, the hills far away and the ground that the actors stand on, and it can
have clips, such as the sun moving across the sky.

- [x] User can pick a background from the library.
- [x] A background has one or more layers, each at its own depth. The
      [camera](camera.md) moves the far layers less than the near ones.
- [x] The actors stand on the ground layer of the background. Each actor has its
      own place on it, so actors can stand nearer to the camera or further from
      it.
- [x] If actors overlap, the one nearer to the bottom of the frame is in front.
- [x] A background can have layers in front of the actors, such as a bush that
      an actor walks behind. The layers after the ground layer are in front of
      all actors.
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

## Technical notes

### Splitting the editor

The editor is one large component, `Editor` in `apps/web/src/editor`. It keeps
the selection in three state variables, `selected`, `walking` and `bubbleId`,
and picks the open scene by its index. Several places check with `isMoving`
whether an action is a walk. Each new thing to select, such as a camera move,
needs changes in all of them. Shot composition (see [Cartoon](cartoon.md)) needs
a view of the whole cartoon that shares the content, undo and saving with the
scene editor, but not the selection. When shot composition starts:

- Split the editor into an editor shell and a scene editor. The shell owns the
  content of the cartoon, undo, saving and the mode, such as editing a scene or
  composing shots. The scene editor owns the selection.
- Pick the open scene by its id, not by its index.
- Keep the selection as one union: an actor, an action, a bubble or the camera.
  A hook checks the selection against the scene, so that an undo can't leave an
  id that no longer exists, and it knows which actions are walks.
- Move the choice of the toolbar for the selection into a component of its own.
