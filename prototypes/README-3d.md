## 3D: toon-shaded ready-made character

The 3D page renders a ready-made rigged character with three.js, toon shading
and an outline. The character walks the shared path through a small park, stops,
turns towards the camera and waves.

### Assets and license

- The character is "Anne" from Quaternius'
  [Pirate Kit](https://quaternius.com/packs/piratekit.html), downloaded as a
  single GLB from [poly.pizza](https://poly.pizza/m/tZYaOQ4l94). License: CC0.
  The GLB has the clips Idle, Walk and Wave. Her double axe is a separate mesh,
  which the page hides.
- The trees, rocks and bench are single Quaternius models from poly.pizza, all
  CC0. `LOG.md` lists each file with its source.
- The files in `public/3d/` are the downloads without changes, 1.1 MB in total.
  Anne is 690 kB of that, because the file has 14 clips and the page uses three.
- The Quaternius pack pages link to Google Drive, but Drive refused every file
  download from the sandbox with "Quota exceeded".

### How it works

- Every material becomes a `MeshToonMaterial` with a three-band gradient map.
- The outline is an inverted hull: a copy of each mesh, drawn on its back faces
  in dark brown and pushed out by 2.8 px in screen space. The character's hull
  is skinned to the same skeleton, so it follows the animation. The hull uses
  normals averaged over vertices at the same position, because flat-shaded
  models tear the hull open at their hard edges.
- The animation is set from `t` alone: the code sets the time and weight of each
  clip and calls `mixer.update(0)`.
- The path is scaled so that the top walking speed is the speed the walk clip
  was made for. On load, the code measures how far the planted foot moves in
  each slice of the walk clip. The distance walked then maps to the clip phase
  through that measurement, so the planted foot stays on the ground even though
  the clip itself moves the body forward unevenly.
- When the character speeds up or slows down, the walk blends with idle and
  plays slower by the same factor, so the steps get shorter rather than slow
  motion.
- The wave clip raises the arm, waves and lowers it. The code finds a loop in
  the middle of the clip and repeats it to fill the wave.

### What looks good

- The walk is smooth and the feet stay planted. The start, the stop and the wave
  blend without pops, also when stepping frame by frame.
- The toon shading and the outline give a clean cartoon look with almost no
  manual work, and the shadows come for free.
- The camera, lighting and layout can change at any time without new art. The
  user could later pick another camera angle for the same scene.

### What looks wrong

1. The character comes with a dark brown texture, so the toon bands are weaker
   on her than on the flat-colored props. The colors are lifted by a factor,
   which helps but makes the texture look washed out in places.
2. She is a pirate, and her idle pose is a wide, crouched stance with the arms
   held out. It reads as "ready to fight" more than "standing in a park".
3. The feet slide a little where the path bends and while she turns towards the
   camera during the last steps, because the body rotates around the planted
   foot. It is hard to see at normal speed.
4. The walk clip has a short hop where both feet are in the air. It looks bouncy
   and cartoonish, which fits, but it is not a choice we made.
5. The outline has the same width in pixels everywhere, so distant trees get as
   thick a line as the character.
6. The motion is only as good as the ready-made clips. Anything that the pack
   does not have, such as sitting on the bench, needs a new clip from another
   source, and the rigs of different Quaternius packs are not the same.

### What it would take to fix

- 1 and 2: pick or make a friendlier character. The Quaternius Universal
  Animation Library has 45 clips on a standard rig; retargeting them to one
  character in Blender would give a much bigger set of motions. A flat-color
  material instead of the texture would give cleaner toon bands.
- 3: add foot IK that pins the planted foot, or turn the character only while a
  foot is in the air.
- 5: scale the outline width down with distance, or draw the outline as a
  post-processing pass on depth and normals.
- The JavaScript bundle is 640 kB because of three.js. That is fine for a
  prototype, but the app would want to load the 3D renderer only when needed.
