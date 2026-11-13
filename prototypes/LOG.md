# Work log

Each entry says what was done, with which tool and settings, so that every asset
can be made again. The 2D and 3D prototypes have their own sections. Paths are
relative to the repo root.

## Shared setup

### Tools

- Node 26.13.1 and pnpm 12.19.0 come from `mise install` (see `mise.toml`).
- VTracer 1.0.0-alpha.4 comes from `mise install` (`github:visioncortex/vtracer`
  in `mise.toml`).
- npm packages in `prototypes/`, installed with
  `pnpm add -D vite typescript playwright @types/node @types/three` and
  `pnpm add three`: vite 8.3.8, typescript 6.0.3, playwright 1.65.0, three
  0.187.0, @types/three 0.187.0.
- Headless Chromium for screenshots:
  `pnpm exec playwright install --with-deps chromium` in `prototypes/`. It
  downloaded Chrome Headless Shell 158.0.8127.18 (playwright build 1254) to
  `~/.cache/ms-playwright/`.

### App

- `prototypes/` is one Vite app in the pnpm workspace with `index.html`,
  `2d.html` and `3d.html`.
- `src/common/player.ts` has the controls. The clock only picks which `t` to
  draw. The URL parameter `?t=3.2` opens the page paused at that time.
- `src/common/path.ts` has the walk path and timing that both prototypes use: a
  cubic Bézier on the ground, walked at an even speed with a ramp up and down, a
  stop at 5.2 s and a wave from 5.6 s to 7.4 s.
- `scripts/screenshot.ts` takes screenshots at given times:
  `node scripts/screenshot.ts 2d ../assets/work/shots/2d 0 2.5 6`. It sets the
  time through `window.toon.setTime`.

## 2D

All work files are in `assets/work/2d/`. Run the commands from the repo root
unless the entry says otherwise.

### Tools

- `pngjs` 7.0.0 and `@types/pngjs` 6.0.5, installed in `prototypes/` with
  `pnpm add -D pngjs @types/pngjs`. The split and rig scripts use them to read
  the alpha channel.
- `pnpm trace-image` needs `svgo` from `node_modules/.bin`, so run it through
  `pnpm` and not with `node scripts/trace-image.ts`.

### Parts sheet

1. The prompt is in `assets/work/2d/parts.txt`. It asks for five separate
   pieces: the head with hair, the torso with the shorts, a relaxed hand, an
   open waving hand and a foot in a sneaker. The colors follow
   `assets/examples/boy.svg`, but the shorts are bright green, because dark
   green merges with the outline when tracing.
2. Generated three seeds at 1280×1024:
   `pnpm generate-image --prompt-file assets/work/2d/parts.txt --out assets/work/2d/parts.png --width 1280 --height 1024 --seed 11 --count 3`.
   Each took about 105 s.
3. I picked seed 12 (`parts-12.png`). Seed 11 has a sleeve stuck on the torso
   and a shorts piece shaped like a single leg. Seed 13 gave an arm with a hand
   instead of a hand. Seed 12 has a clean head with a neck stub, and a torso
   with a sleeve hole that marks the shoulder and a leg hole that marks the hip.
4. `prototypes/public/2d/parts.prompt.json` is the request for seed 12.

### Splitting and tracing

1. In `prototypes/`:
   `node scripts/split-sheet.ts ../assets/work/2d/parts-12.png ../assets/work/2d/pieces`.
   It finds the islands in the alpha channel (alpha ≥ 32, 8-connected), merges
   small islands into a piece within 12 px, drops pieces under 400 px and crops
   each with 6 px of padding. It found five pieces, which I renamed by hand from
   `piece-0…4.png` to `head`, `torso`, `hand-open`, `hand` and `foot` `.png`.
2. Traced each piece with the default settings:
   `pnpm trace-image assets/work/2d/pieces/<name>.png assets/work/2d/pieces/<name>.svg`.
   Checked each with `pnpm render-svg … --background '#50a0dc'`. No colors
   merged, so no palette was needed.

### Rig

In `prototypes/`: `node scripts/build-rig-2d.ts ../assets/work/2d/pieces`. It
copies the five SVGs to `public/2d/` with a `viewBox` added, finds the pivot
points from the alpha masks and writes `public/2d/rig.json`:

- neck on the head: the middle of the bottom rows, 18 px up into the neck
- neck on the torso: the middle of the top rows
- shoulder: at 18 % of the torso height, where the sleeve hole is drawn
- hips: at 86 % of the torso height, inside the bottom of the shorts, 8 px in
  front of and 14 px behind the middle
- wrist on the relaxed hand: the middle of the top rows; on the open hand, the
  middle of the bottom rows
- ankle: 30 % of the foot width from the heel, 14 px below the top edge there

These rules came from looking at the pieces. The script also holds the values I
set by eye: the outline color `#422517` and the skin color `#fbc688` (the most
common colors in the traced torso and hand), the arm length 175 and the leg
length 205 (long enough that the knees bend at the hip height of the walk), the
limb widths, and the scales of the head (0.82), the hands and the foot (0.62).
The pieces come off the sheet at different sizes, and these scales even them
out.

### Background

1. The prompt is in `assets/work/2d/park.txt`.
2. Generated two seeds at 1536×896:
   `pnpm generate-image --prompt-file assets/work/2d/park.txt --out assets/work/2d/park.png --width 1536 --height 896 --seed 21 --count 2`.
3. I picked seed 21: an empty lawn over the lower 40 %, trees and a fence at the
   back.
4. Traced it with the default settings to `assets/work/2d/park-21.svg`, then
   added `viewBox="0 0 1536 896"` with sed to get
   `prototypes/public/2d/park.svg`. `public/2d/park.prompt.json` is its request.

### Animation

The walk and the wave are in `src/2d/anim.ts`, drawn as SVG by `src/2d/main.ts`.

- The arms and legs are quadratic curves from the shoulder or hip to the wrist
  or ankle. The control point is set so that the curve keeps about the same
  length, so a short reach bends the limb. Knees bend forward, elbows back.
- The walk phase comes from the distance covered on the screen, divided by the
  scale of the character. A planted foot moves back at the speed of the ground
  under it, so it doesn't slide even though the character is drawn 1.55 times
  larger than the ground scale.
- The walk is 8.25 cycles long. It ends with one foot planted under the body and
  the other passing it, close to the standing pose.
- The far arm, leg, hand and foot are drawn 18 % darker.

### Mouth

The traced head has an open grin, which looked odd for the whole scene.
`public/2d/mouth-patch.svg` covers it. I drew it by hand in the pixels of the
head piece: a skin-colored shape over the mouth, and a new profile line from
under the nose to the chin, where the open jaw had cut a notch into the outline.
I placed the points by reading the alpha and colors of
`assets/work/2d/pieces/head.png` row by row around the mouth, then checked the
patch by rendering it over `public/2d/head.svg` with `pnpm render-svg` at 4×
zoom. The skin color `#fbc78c` and the outline color `#44260c` come from
`head.svg`.

`src/2d/face.ts` draws the mouth on top of the patch: a smile line when closed,
and a dark shape with a tongue when open. When talking, the opening comes from a
hash of the frame number, about ten new shapes a second, so it stays a function
of `t`. The scene shows a closed smile while walking, the traced grin while the
arm goes up, then talking during the wave.

## 3D

### Downloads

Google Drive downloads from the Quaternius pack pages failed. Both
`drive.usercontent.google.com/download?id=…` and `drive.google.com/uc?id=…`
return an HTML "Quota exceeded" page, even for the 2 KB `License.txt` of the
Ultimate Modular Men pack. The folder listings still work with
`curl -sL 'https://drive.google.com/embeddedfolderview?id=<folderId>'`.

All models therefore come from [poly.pizza](https://poly.pizza/u/Quaternius),
which hosts single Quaternius models as GLB files. Each model page
(`https://poly.pizza/m/<id>`) has the GLB URL
`https://static.poly.pizza/<uuid>.glb` and the license in its page data. Each
file went into its own directory `assets/work/3d/pp-<id>/model.glb` with a
`source.txt` that has the page URL, the GLB URL, the title and the license.

The character is "Anne" (https://poly.pizza/m/tZYaOQ4l94, CC0 1.0). It is from
Quaternius' [Pirate Kit](https://quaternius.com/packs/piratekit.html) (November
2023, CC0). It has the clips Idle, Walk and Wave, among others, and a double axe
as a separate mesh.

Other characters I downloaded and looked at, not used:

- Ultimate Modular Men and Women characters, such as "Casual Character"
  (kZ3DmIoGip), "Animated Woman" (qJ2gsTUBHL) and "Adventurer" (ZwF0K7WBmu).
  They have Idle, Walk and Wave, but adult proportions and 1.3–1.6 MB each.
- "Animated Base Character" (cwYvO5UauX), the Universal Animation Library
  mannequin. It has 45 clips but no wave, and it looks like a mannequin.
- "Animated Platformer Character" (kKtL4zvS3n), a blue creature with Wave.
- Older Quaternius humans without a wave clip (HMnuH5geEG, jpKRgGDxhk and
  others).

I picked Anne because the chibi proportions look most like a cartoon, and she
has all three clips.

Props, all Quaternius, CC0 1.0 on poly.pizza:

| File in `prototypes/public/3d/` | poly.pizza title | id         |
| ------------------------------- | ---------------- | ---------- |
| `anne.glb`                      | Anne             | tZYaOQ4l94 |
| `tree-round.glb`                | Tree             | i4QMw4L64D |
| `tree-layered.glb`              | Tree             | 9nvGuZlbpE |
| `tree-wide.glb`                 | Tree             | 2paAm1ja4w |
| `tree-birch.glb`                | Birch Tree       | k6cozoNfLH |
| `rock-big.glb`                  | Rock             | RtLRqYjfMs |
| `rock-small.glb`                | Rocks            | OQvi8PIZ40 |
| `bench.glb`                     | Bench            | jLxjFxFRpw |

The files in `public/3d/` are copies of the downloaded GLBs without changes. I
chose props with simple shapes and flat colors, because they read better with
toon shading than the detailed leafy trees.

I first used the textured "Bush" (ooG6CkLyE8) too, but dropped it. Its leaves
are alpha-tested cards, and with the toon material and the outline they showed
as dark streaks. The bushes are now the round tree sunk into the ground so that
only the crown shows.

### Look

- `src/3d/toon.ts` swaps every material for a `MeshToonMaterial` with the same
  color and texture, and a gradient map with three bands (90, 175, 255 of 255).
  The prop colors are set by hand by material name to brighter greens, browns
  and greys, because the original colors are dark under toon shading.
- The outline is an inverted hull: a copy of each mesh drawn on its back faces
  in a dark brown (`#2a1d1a`) and pushed outwards in screen space by 2.8 px. For
  the character the hull is a `SkinnedMesh` bound to the same skeleton. The
  models are flat-shaded, so their normals are split at every edge, and a hull
  built from them tears open. The hull therefore uses normals averaged over all
  vertices at the same position, stored in an extra attribute.
- The sky is a vertical canvas gradient, the ground a large toon-shaded disc,
  and the path a sand-colored ribbon along the shared Bézier.
- The camera sits low in front of the path, at 0.8 character heights, and pans
  part of the way with the character.

### Motion

- The world is the shared path scaled by `K = groundSpeed / MAX_SPEED`. At top
  speed the character then walks exactly as fast as the walk clip was made for,
  so the clip plays at its normal rate. The character keeps its size.
- On load, the code samples the walk clip at 240 points with the model at the
  origin and records how far the planted foot moves backwards in each slice. The
  clip does not move the body forward at an even speed: in the first version,
  with the phase growing evenly with distance, the planted foot slid at about
  60% of the walking speed. Now the distance walked goes through the inverse of
  that measured curve to get the clip phase, and the planted foot slides at
  about 5–10% of the walking speed. The clip has a short hop where neither foot
  is on the ground; there the body moves at the average speed.
- When the character speeds up or slows down, the walk blends with idle by
  `sqrt(speed / top speed)` and plays at the same factor, so the stride gets
  shorter and the cadence slower at the same time. The phase is an integral of
  that rate over `t`, kept in a table, so the pose still depends only on `t`.
- The walk phase is offset so that the feet pass each other at the stop.
- Idle plays on `t`. Wave fades in around `waveStart` and out after `waveEnd`.
- The character faces the direction of travel and, from 4.6 s, turns 70% of the
  way towards the camera for the wave.
- The `window.toon3d` debug hook returns the foot positions at a given `t`. I
  used it to measure the foot sliding.
- The wave clip is 1.67 s long: it raises the arm, waves once or twice and
  lowers it. Looping the whole clip raised the arm again at the end of the wave.
  On load, the code now finds two times in the clip, both while the hand is up,
  where the hand and forearm are in nearly the same pose (it found 0.50 s and
  0.83 s). The wave plays the raise, repeats that middle part a whole number of
  times, slightly slowed to fill the wave, then plays the lowering.

### Look, second pass

- The texture of the character is dark brown. Its colors are multiplied by 1.35
  so that the character reads against the grass.
- Low round hills (flattened spheres) on the horizon hide the pale band where
  the ground disc meets the sky.
- Darker flattened discs on the ground break up the plain green in front of the
  camera.
- The camera moved closer, to 6.2 character heights from the middle of the path.

### Checks

- `/tmp` helper scripts with Playwright took contact sheets around the character
  every 1/30 s for the start (0–0.9 s), one walk cycle (2.5–3.5 s), the stop
  (4.8–6.0 s) and the wave (5.9–7.8 s). None showed a pop in the blends. They
  are not committed; `scripts/screenshot.ts` with `SHOT_CLIP` does the same job
  for single frames.
- `pnpm build` passes. The 3D bundle is 644 kB, almost all of it three.js.
