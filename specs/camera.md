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

## Technical notes

### The camera in the frame of a scene

The `camera-moves` branch works out the camera in `SceneDrawing` in the web app.
Since then, `sceneFrame` in `packages/renderer` builds the frame of a scene for
the editor, the player and the preview image, and export will use it too. When
the branch is rebased, put the camera into `sceneFrame`. It calls `cameraAt`,
returns the camera with the frame, draws the scene through the camera and wraps
the bubbles in the transform of the ground layer. An option gives the editor its
view of the ground layer. Then every caller of `sceneFrame` draws through the
camera, and `SceneDrawing` keeps only the mask and the SVG symbols.

## Open questions

- Can a shot in the cartoon set its own camera view, or does only the scene move
  the camera?
- Can the camera follow an actor?
