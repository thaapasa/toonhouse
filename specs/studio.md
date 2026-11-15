# Character studio

A development tool for making the built-in characters, props, backgrounds and
clips. It runs only on the developer's computer, and it saves its changes to the
asset files in the repo. See [Characters](characters.md).

- [x] Developer can pick a character or a prop and play any of its clips.
- [x] Developer can pick a background and see it fill the stage.
- [ ] Developer can play a clip on every character that it works on.
- [x] Developer can move the pivot points of a character and save the rig.
- [x] Developer can give a part several layers, such as the back hair, the face
      and the front hair of the head. The layers move with the part.
- [x] Developer can change the draw order of a rig: the order of all its layers
      and its drawn limbs, from the back to the front.
- [ ] Developer can tune how the shared clips fit a character, see the effect
      while a clip plays, and save it to the rig:
  - [x] The size of each part, such as the head, the torso or the feet. The
        relaxed hand and the open hand have their own sizes.
  - [x] The leg length and the arm length, which set how much the knees and the
        elbows bend.
  - [x] The width of the rubber-hose limbs and of their outline, to match the
        style of the traced parts.
  - [x] The hip height: how high the clips hold the hips above the feet. It
        scales the leg length with it, so that the knees keep their bend.
  - [x] An offset that moves the feet forward or back against the hips.
  - [x] An offset that moves the whole character up or down, so that the soles
        touch the ground.
  - [ ] The stride and the step lift. A longer stride also makes the character
        walk faster in a scene, so that the feet don't slide.
- [ ] Developer can make a background from layers, set the depth of each layer
      and pick the ground layer.
- [ ] Developer can set the start point, the perspective and the walking area of
      a background and save them.
- [x] Developer can play the clips of a background.
- [x] Developer can zoom and pan the camera on a background, with the fingers or
      with buttons, to see the layers move by their depth.
- [x] Developer can put a character or a prop on a background, to see it stand
      on the ground layer. The developer can drag it to any place, to see how
      big it is there.
- [ ] Developer can set the ground point of a character or a prop and save it.
      By default it is on the ground under the feet.
- [ ] Developer can edit the keyframes of a clip and save it.
- [ ] Developer can set the color presets of a character or a prop and save
      them.
- [x] The URL names the picked character or prop and the picked background, so
      that a reload shows them again.
- [x] The studio isn't part of the production build.
- [x] The studio works with a mouse on a computer. It doesn't need to work with
      touch.
