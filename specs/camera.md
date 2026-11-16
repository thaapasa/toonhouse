# Camera

The camera shows a part of the background of a [scene](scenes.md). By default it
shows the whole background. The user can zoom in for a close-up and pan across
the background, and the camera can move on the [timeline](timeline.md).

- [ ] A new scene's camera shows the whole background. The user can set a
      different camera view for the start of the scene.
- [ ] If the user picks a different background for a scene, the start view of
      the camera goes back to the whole background.
- [ ] User can zoom the camera in and out, and pan it.
- [ ] The camera stays inside the background. It can't zoom out further than the
      whole background, or pan past its edges.
- [ ] User can start a camera move at the current point on the timeline. The
      camera zooms and pans to the new view over a time that the user picks.
- [ ] User can make the camera jump to a new view at the current point.
- [ ] If the background has layers, they move at different speeds when the
      camera zooms or pans, so that the far layers move less than the near ones.

## Open questions

- Can a shot in the cartoon set its own camera view, or does only the scene move
  the camera?
- Can the camera follow an actor?
