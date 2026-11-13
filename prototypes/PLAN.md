# Motion prototypes

Two throwaway prototypes that play the same short scene, one in 2D and one in
3D. The developer watches both and decides which way the app goes. The question
is which one gives better-looking motion for the effort, not which one has
better code.

## The scene

A character walks along a curved path across a simple background, stops and
waves. The scene is about 8 seconds long.

- Controls: play, pause, a scrub bar and stepping one frame forward or back.
- The picture at time `t` depends only on `t`, as in the planned renderer. Don't
  advance the animation by the time between frames.

## Setup

- One Vite app in `prototypes/`, added to the pnpm workspace, with two pages:
  `2d.html` and `3d.html`, plus an index page that links to both.
- TypeScript without React. The UI is only the controls.
- Vite runs on port 10790 with `strictPort: true`. The developer opens it on the
  Mac at http://localhost:10790. The port forward is in `airlock.local.toml` and
  needs a sandbox restart. Without one, the developer runs
  `airlock network forward 10790` on the Mac.
- Check your own work with screenshots from headless Chromium (Playwright).
- Downloads and generated images go to `assets/work/`, which git ignores. Commit
  only the small files that the prototypes load, under `prototypes/public/`.
- Work on the `prototypes` branch and commit when a step works.

## 2D: cutout with rubber-hose limbs

Read [assets/CLAUDE.md](../assets/CLAUDE.md) before you generate images.

1. Generate a parts sheet of an original boy in side profile, at 1024 px or
   more: the head with hair, the torso with shorts, one hand and one foot, with
   space between the pieces. The style reference is
   [assets/examples/boy.svg](../assets/examples/boy.svg).
2. Split the sheet into pieces by finding the separate islands in the alpha
   channel. Crop each piece and trace it to its own SVG.
3. Set the pivot points from the shapes: neck, shoulders, hips, wrists, ankles.
4. Draw the arms and legs in code as thick curved strokes with the outline color
   from the art, from the shoulder or hip through the elbow or knee to the hand
   or foot.
5. Make a walk clip and a wave clip by hand, with easing, a bounce in the walk
   and some lag in the hair or the head. Swap the hand to an open hand for the
   wave if the sheet has one.
6. Generate a simple background, such as a park, and trace it.

## 3D: toon-shaded ready-made character

1. Download a CC0 rigged and animated character from
   [Quaternius](https://quaternius.com), in glTF. Pick one with walk, idle and
   wave animations, or take the animations from Quaternius' animation library.
   Write the pack name and its license in `prototypes/README.md`.
2. Render it with three.js, a toon material and an outline.
3. Drive the animations from `t` with `AnimationMixer.setTime`. Move the
   character along the path and turn it to face the way it walks.
4. Use a ground plane and a few props from the same pack as the background.
   Choose a camera that makes it look like a cartoon, such as a low-angle side
   view.

## When done

Write `prototypes/README.md` with how to run the prototypes, what each one uses,
and what you noticed: what looks good, what looks wrong, and what it would take
to fix it.
