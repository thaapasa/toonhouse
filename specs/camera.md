# Camera

The camera shows a part of the background of a [scene](scenes.md). By default it
shows the whole background. The user can zoom in for a close-up and pan across
the background, and the camera can move on the [timeline](timeline.md).

- [x] A new scene's camera shows the whole background. The user can set a
      different camera view for the start of the scene.
- [x] If the user picks a different background for a scene, the start view of
      the camera goes back to the whole background.
- [x] User can zoom the camera in and out, and pan it.
- [x] The camera stays inside the background. It can't zoom out further than the
      whole background, or pan past its edges.
- [x] User can start a camera move at the current point on the timeline. The
      camera zooms and pans to the new view over a time that the user picks.
- [x] User can make the camera jump to a new view at the current point.
- [x] If the background has layers, they move at different speeds when the
      camera zooms or pans, so that the far layers move less than the near ones.
- [x] The player and the preview image show what the camera sees.

## The camera on the stage

- [x] The stage shows the camera box: the view of the camera at the current
      time. What the box shows is what the frame of the cartoon shows.
- [x] Outside the camera box, the stage shows the rest of the background as the
      camera sees it, dimmer. A far layer ends where its drawing ends, so its
      edge can show outside the box.
- [x] The ground layer and the actors keep their places on the stage when the
      camera moves. Only the far layers move against them.
- [x] User selects the camera from its row on the timeline, or from the tab at
      the top of the camera box.
- [x] With the camera selected, the user pans the camera by dragging the
      background inside the camera box, and zooms it by dragging a corner. The
      opposite corner stays in place. With Alt, the middle of the box stays in
      place instead.
- [x] With the camera selected, a tap on an actor or a bubble inside the camera
      box selects it, and a tap on the background clears the selection.
- [x] The corners of the camera box are big enough for a finger at any zoom of
      the stage.
- [x] Dragging the camera box changes the view that the camera holds at the
      current time: the start view, or the view of the last camera move or
      camera jump before the current time.
- [x] While a camera move plays, the camera box can't be dragged, because the
      camera has no view of its own there. The properties pane offers to go to
      the end of the move.
- [x] User can fit the stage to the camera box with one button. The other button
      shows the whole background, as before.

## Camera moves and jumps

- [x] The timeline has a row for the camera, above the background. A camera move
      is a block with a time mark at its start and its end, and a camera jump is
      a single time mark. The start view has a time mark at the start of the
      scene.
- [x] A new camera move starts at the current time from the view of the camera
      there. It lasts 2 seconds, or until the next camera move or jump if that
      comes sooner. The playhead goes to the end of the move, so that the user
      sets where it goes.
- [x] A new camera jump goes at the current time with the view of the camera
      there, and the user then sets the view after the jump.
- [x] A camera move or jump can't start in the middle of another camera move.
- [x] Dragging the start or the end of a camera move changes only that time. The
      views stay, so the move gets faster or slower. Dragging the block moves
      the whole move, and dragging a camera jump moves the jump. A drag stops at
      the next camera move or jump.
- [x] A tap on a time mark of the camera selects the camera and moves the
      playhead there. A tap on a camera move goes to its end.
- [x] User can pick the easing of a camera move: linear, ease in, ease out, or
      ease in and out. A new move eases in and out.
- [x] The zoom of a camera move changes at an even rate, so that a zoom from 1
      to 4 doesn't seem to speed up at the end. When a move zooms into a corner,
      the corner stays in place.
- [x] The properties pane shows the view that the camera holds, the timing of
      the move or the jump, and the easing of a move. The user can type the
      numbers there and go back to the whole background with one button.
- [x] User can remove a camera move or jump, and reset the start view to the
      whole background.

## Open questions

- Can a shot in the cartoon set its own camera view, or does only the scene move
  the camera?
- Can the camera follow an actor?
- Should the stage follow the camera while the cartoon plays?
