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
- [ ] User can pick the clip of a walk, such as a walk or a run, and set the
      speed of the walk to any number. The clip plays faster or slower to match
      the speed, so the feet don't slide on the ground.
- [ ] If the user changes the speed of a walk, only the walk gets faster or
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
- [x] User can play the cartoon from the current point and stop it to add the
      next action.
- [x] User can change or remove an action.

## Open questions

- How does the user see and edit actions that are already on the timeline?
- What happens to the later actions when the user changes an earlier one?
