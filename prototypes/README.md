# Motion prototypes

Two throwaway prototypes that play the same 8-second scene: a character walks
along a curved path through a park, stops and waves. One is 2D, made from
generated and traced cutout pieces. The other is 3D, made from a ready-made
rigged character. [PLAN.md](PLAN.md) has the goal, and [LOG.md](LOG.md) has
every step that made the assets.

## Running them

From the repo root, after `mise install`:

```sh
cd prototypes
pnpm dev
```

Open http://localhost:10790 and pick a prototype. If the sandbox runs the
server, its port forward is in `airlock.local.toml`. Without a sandbox restart,
run `airlock network forward 10790` on the Mac.

- The controls are play and pause, one frame back and forward, and a scrub bar.
  The arrow keys step and the space bar plays and pauses.
- `?t=6.2` in the URL opens a page paused at 6.2 s.
- `pnpm build` builds both pages into `dist/`.

### Shared code

- `src/common/player.ts` has the controls. The clock only picks the time `t`.
  Each page draws its scene from `t` alone, so stepping, scrubbing and playing
  all show the same frames.
- `src/common/path.ts` has the path, a cubic Bézier on the ground, and the
  timing: an even walk with a ramp up and down, a stop at 5.2 s and a wave from
  5.6 s to 7.4 s. Both pages use it.
- `scripts/screenshot.ts` takes screenshots with headless Chromium at given
  times, for checking the work without a browser:
  `node scripts/screenshot.ts 2d ../assets/work/shots/2d 0 2.5 6`.

## Comparison

Both reach the same point: a character walks without sliding, stops cleanly and
waves, and every frame depends only on `t`.

- The 2D version looks like the art style of the app, and its motion has more
  cartoon character, because every bounce and overshoot is written by hand. It
  is limited to the side view. Every new view or body part means generating and
  rigging more pieces.
- The 3D version gets camera freedom, turning, shading and shadows almost for
  free, and its motion is smooth. It looks like a low-poly game rather than the
  style reference, and its motion is limited to the clips that come with the
  model. Making the character turn and blend clips without sliding took more
  code than the hand-made 2D walk.
- In effort, the hard part of 2D was the art: getting a usable parts sheet,
  splitting it and finding the pivots. After that, the walk and the wave were a
  few hundred lines. The hard part of 3D was making ready-made clips follow a
  path whose speed changes, without the feet sliding.

## 2D: cutout with rubber-hose limbs

The 2D page puts traced cutout pieces of a generated character on a traced
background and draws the arms and legs in code. All motion is written by hand in
`src/2d/anim.ts`.

### Assets

- One parts sheet from Draw Things (Qwen Image 2.1 Turbo, seed 12) with five
  pieces: the head with hair, the torso with the shorts, a relaxed hand, an open
  hand and a foot. `scripts/split-sheet.ts` cuts it into pieces by the islands
  in the alpha channel, and `pnpm trace-image` traces each piece.
- `scripts/build-rig-2d.ts` finds the neck, shoulder, hips, wrists and ankle
  from the shape of each piece and writes `public/2d/rig.json`.
- One background from Draw Things (seed 21), traced the same way.
- `public/2d/` is 43 kB in total. `LOG.md` has every step and setting.

### How it works

- The page is one SVG. The pieces are symbols, placed with a transform around
  their pivot each frame.
- Each arm and leg is a quadratic curve with an outline stroke under a skin
  stroke. The control point keeps the curve at about the same length, so the
  limb bends when the hand or foot comes closer, like a rubber hose.
- The walk moves the feet, not the legs: a planted foot moves back exactly as
  fast as the ground moves under it, and a swinging foot moves forward in an
  arc. The phase comes from the distance covered on the screen, so the feet
  don't slide.
- The hips bob twice per cycle, the torso leans into the walk, the head lags
  behind the bob, and the arms swing against the legs with a little delay.
- After the stop, the body sinks and springs back, and the head nods once.
- The wave has a short wind-up, the arm shoots up with an overshoot, the hand
  switches to the open hand and wags, and the head tilts with it.

### What looks good

- It looks like the style reference: the same flat colors and the same brown
  outline as the rest of the art. The limbs have the same outline as the traced
  pieces, so the drawn parts and the traced parts look like one drawing.
- The motion has cartoon timing: bounce, lean, overshoot and follow-through.
  Each of these is a line or two of code, and changing the feel of the walk
  means changing a number.
- The feet stay planted, and the start and the stop blend without pops.
- The whole page is 43 kB of art and a few hundred lines of code. It renders
  sharp at any size.

### What looks wrong

1. The character only exists in side view. Turning towards the camera, walking
   towards it or away from it needs more views of every piece: a front view at
   least, and usually a three-quarter view.
2. The hair is part of the head, so it can't lag behind on its own. Only the
   whole head lags.
3. The sleeve is drawn in code as a plain red tube, while the shirt has stripes.
4. The torso is one stiff piece. The body doesn't squash or twist, which makes
   the walk look a little like a puppet from the waist up.
5. The far arm and leg are drawn 18 % darker with a CSS filter. That works, but
   a real far-side color per piece would look cleaner.
6. The perspective is a cheat: the character is drawn 1.55 times larger than the
   ground scale, so that he reads well. It fits a cartoon, but anything placed
   on the ground has to use the same rule.
7. The open hand faces the viewer while the body is in profile. It reads as a
   wave, but the wrist joint looks odd.

### What it would take to fix

- 1: generate the parts sheet in front and three-quarter views from the same
  prompt and seed, and switch the piece set when the character turns. Getting
  the same character in several views from the image model is the hard part; it
  may need a reference image or several tries.
- 2: ask for the hair as a separate piece, or split it from the head by its
  color, and give it a damped spring.
- 3 and 4: ask for a sleeve piece and a separate chest and hips, or bend the
  torso with a mesh deformation.
- 5: trace each piece a second time with a darker palette.

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
