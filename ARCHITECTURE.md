# Architecture

Toonhouse is a TypeScript monorepo with pnpm workspaces. This page describes the
planned structure. Most of it does not exist yet.

The requirements are in [specs/](specs/README.md).

## Packages

- `packages/model`: the types and the schemas of the scene, rig and clip
  formats.
- `packages/renderer`: computes what the scene looks like at a given time. It
  has no UI and runs in the browser, in Node and in headless Chromium.
- `apps/web`: the editor and the player, built with React and Vite.
- `apps/server`: a Node server that stores the scenes and the assets.

## Deterministic rendering

The picture of a scene is a pure function of the scene data and the time `t`.
The renderer returns a list of parts to draw, each with its transform and draw
order. The editor draws that list as SVG, and export draws it on a canvas.

Because of this, export never records live playback. It steps `t` one frame at a
time and renders each frame at the chosen resolution. Two ways to export are
planned:

- in the browser, with WebCodecs and the File System Access API
- with a CLI that runs the renderer in headless Chromium through Playwright and
  pipes the frames to ffmpeg

## Assets

All graphics are SVG, so they stay sharp at any size.

- A **rig** is a character: a tree of bones joined at pivot points, with an SVG
  part on each bone. A prop is a rig with one bone.
- A **clip** is a short animation, such as a walk cycle. It has keyframes for
  the rotation and the offset of each bone. A clip works on any rig that has the
  same bones.
- A **scene** has a background and actors. Each actor uses a rig and has a list
  of actions on the timeline.

Scenes, rigs and clips are stored as JSON. The server cleans uploaded SVG files
of scripts and external links before it stores them.

## Hosting

The app will run on the pomeranssi.fi server, next to the other services. The
host name is not decided.
