# Properties pane

The properties pane shows all the data of the selection in the
[editor](scenes.md), and the user can change any of it there. It gives exact
values where the stage and the timeline give quick ones: a size that the size
buttons don't have, or a point of a walk to the pixel.

- [x] The editor has a properties pane on the right. It floats over the stage,
      so that the stage keeps its size.
- [x] User can attach the pane to the right side of the editor. Then it has a
      column of its own and the stage gets narrower, so that the pane covers
      nothing. The editor remembers whether the pane is attached.
- [x] User can hide the pane. Then it becomes a button, which opens it again.
      The editor remembers whether the pane is open.
- [x] When nothing is selected, the pane shows the background of the scene and
      the length of the scene, which the user can change.
- [x] When the user selects an actor, the pane shows where it starts, which way
      it faces and its size. The user can set the size to any value from 1% to
      100,000%, not only the steps of the size buttons. An actor of size zero
      would have nothing to select.
- [x] When the user selects an action on the timeline, the pane also shows its
      clip, its start time, when it ends, its speed and the point of the clip
      where it starts. The user can change all but the end.
- [x] When the user selects a walk, the pane shows the points of its path and
      where the walk starts. The user can change a point, add a point halfway
      between two points and remove a point. A walk keeps at least one point.
- [x] The point that the user works on in the pane shows on the stage.
- [x] Each change in the pane is one step of undo.
- [x] User can type a number or step it with the buttons beside it. The buttons
      are big enough for a finger.
- [x] Places are in the pixels of the background frame, the size is in percent,
      the speed is a multiplier of the normal speed and times are in seconds.
- [x] When the user selects an actor, the pane shows its settings, such as its
      color preset, and which of them are overrides. See [Cast](cast.md).
- [ ] When the user selects an actor, the pane lists its changes in the middle
      of the scene. See [Timeline](timeline.md).
