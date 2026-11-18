# Timeline

The timeline works like in Cartooners. The user moves to a point in time and
starts an action for a character there. The action goes on until the user starts
another action for that character.

- [x] User can move to any point on the timeline, by scrolling it or by stepping
      one frame at a time.
- [x] User can start an action for a character at the current point, such as
      walking somewhere, waving or jumping.
- [x] An action goes on until the next action of the same character.
- [x] User can make a character walk to a point, or along a path through several
      points. When it gets to the last point, it stands still until its next
      action. If the next action starts before it gets there, it stops walking
      at that time.
- [ ] User can make a character walk in a direction. It walks until its next
      action. If it walks past the edge of the background, it stops when it is a
      bit outside the edge, so that the camera can't see it.
- [x] A character can walk in any direction on the ground layer, also toward the
      camera and away from it.
- [x] User can pick the clip of a walk, such as a walk or a run, and set the
      speed of the walk to any number. The clip plays faster or slower to match
      the speed, so the feet don't slide on the ground.
- [x] If the user changes the speed of a walk, only the walk gets faster or
      slower. The other actions stay where they are on the timeline.
- [x] When the user picks the points of a walk, the stage shows a box around the
      actor and a box at each point, with a line from the actor through the
      points. The user moves a point by dragging its box.
- [ ] User can add a speech bubble to a character for a time.
- [ ] Speech bubbles use a comic font that the app serves itself, so that a
      bubble looks the same in the editor, the player and the exported video.
- [ ] User can change the font of a speech bubble. The default font comes from
      the asset pack of the character.
- [ ] User can add a sound at the current point.
- [x] The timeline scrolls in time and up and down through the rows. The mouse
      wheel scrolls the rows, and Shift with the wheel or a sideways swipe on a
      trackpad scrolls in time. On a touch screen, a finger scrolls both ways.
- [x] User can zoom the timeline with Ctrl or Cmd and the mouse wheel, with a
      pinch on a trackpad or with two fingers on a touch screen. The zoom keeps
      the time under the pointer or the fingers in place.
- [x] User can zoom the timeline in steps with the zoom buttons, which keep the
      playhead in place, and show the whole scene again with one button.
- [x] User can zoom in so far that each frame shows on the timeline. The ruler
      shows shorter steps of time, down to a tenth of a second, as the user
      zooms in.
- [x] The names of the rows and the ruler stay in sight when the timeline
      scrolls.
- [x] The timeline goes on past the end of the scene, and shows where the scene
      ends. User can move to a point after the end and start an action there.
- [x] The playhead has a knob on the ruler that the user can drag.
- [x] Each row of the timeline has a time mark where each action starts and
      ends. A tap on a time mark moves the playhead to that frame.
- [x] User can drag an action on the timeline to move it. Its start and its end
      move together, so the action stays as long, and the action before it gets
      longer or shorter. If it is the last action, the scene gets longer when
      needed. The actions keep their order.
- [x] User can drag the time mark at the start of an action to move only the
      start. The action before it gets longer or shorter.
- [x] Each action on the timeline has a strip that fills up as its clip plays. A
      looping clip fills up once for each loop, so the user sees where each loop
      starts. A walk fills up once over its whole path, and the strip is empty
      after the actor gets to the last point.
- [x] An action has a smaller time mark where its clip starts a new loop, and a
      walk has one where it gets to its last point. When the user drags the end
      of an action, or the end of the scene, the end snaps to these marks.
- [x] A scene ends a few seconds after its last action, unless the user sets its
      length. User sets the length by dragging the time mark at the end of the
      scene. The scene can't end before its last action starts, so that every
      action shows on the timeline.
- [x] While the cartoon plays, the timeline scrolls to keep the playhead in
      sight.
- [x] User can play the cartoon from the current point and stop it to add the
      next action.
- [x] On a keyboard, the space bar plays and stops the cartoon anywhere in the
      editor. The left and right arrow keys step one frame back and forward, and
      the up and down arrow keys go to the start and the end of the scene. The
      keys do this except while the user types a text.
- [x] User can change or remove an action.
- [x] User can start the clip of an action from any point of the clip, such as a
      day with the sun already high on the sky. The timeline shows the first
      loop of the clip as shorter.
- [x] The speed of an action defaults to 1. The speed is between 0.05 and 20,
      because the server doesn't save other values.

## Changes in the middle of a scene

- [ ] User can change a setting of an actor at a point in the middle of a scene,
      such as its size or its place, so that the actor grows or jumps there at
      once.
- [ ] Each change has a time mark on the row of its actor, so that the user can
      find it later.
- [ ] When the user selects an actor, the [properties pane](properties.md) lists
      its changes.

## Open questions

- What is the term for a change in the middle of a scene? "Override" is taken
  for a setting that an actor sets for one scene.
- How does the user make a change in the middle of a scene? One idea: a button
  turns on a mode where every edit of an actor makes a change at the current
  time, instead of changing where and how the actor starts.
- Can a change in the middle of a scene be animated, such as an actor growing
  over a second? The first version changes at once.
- What happens to the later actions when the user changes an earlier one?
- How does the user add the points of a walk? Now the stage goes into a mode
  that adds a point on every tap when the user selects a walk. It might be
  better if the user has to do something to add a point, and a tap on the stage
  selects as usual.
