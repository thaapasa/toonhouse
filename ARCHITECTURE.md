# Architecture

Toonhouse is a TypeScript monorepo with pnpm workspaces. This page describes the
planned structure. So far, the character studio and the packages it uses exist.
The web app, the server and the export client don't.

The requirements are in [specs/](specs/README.md), and the UI design is in
[design/](design/CLAUDE.md).

## Apps

- **Web app** (`apps/web`): the player and the editor, built with React and
  Vite. The server serves it at https://piirretyt.pomeranssi.fi. The editor
  works on an iPad.
- **Server** (`apps/server`): a Node server that stores the cartoons and serves
  the assets and the web app. It never renders video.
- **Export client** (`apps/export`): a CLI that runs on the user's own computer.
  It downloads a cartoon from the server, renders it frame by frame and writes
  the video or the images to the local disk.
- **Character studio** (`apps/studio`): a development tool for making
  characters, props and clips. It runs only on the Vite dev server, and it
  writes its changes to the files in `assets/`. The files are committed to the
  repo. The production build doesn't include the studio.

The editor exists only in the web app. To edit on a computer, the user opens the
same web app in a browser.

## Packages

- `packages/model`: the types and the schemas of the cartoon, rig and clip
  formats.
- `packages/renderer`: computes what the cartoon looks like at a given time. It
  has no UI and runs in the browser, in Node and in headless Chromium.
- `packages/stage`: the React components that the web app and the studio share,
  such as the stage that draws the renderer output and the playback controls.

## Deterministic rendering

The picture of a scene is a pure function of the scene data and the time `t`.
The renderer returns a tree of things to draw, in the draw order, each with its
transform. The editor draws that tree as SVG, and export draws it on a canvas.

Because of this, export never records live playback. It steps `t` one frame at a
time and renders each frame at the chosen resolution. The export client runs the
renderer in headless Chromium through Playwright and pipes the frames to ffmpeg.
Export in the browser, with WebCodecs and the File System Access API, may come
later.

## Assets

All graphics are SVG, so they stay sharp at any size.

- A **rig** is a character: a tree of bones joined at pivot points, with a part
  on each bone. A part has one or more SVG layers. A prop is a rig with one
  bone.
- A **clip** is a short motion, such as a walk cycle. A clip works on any rig
  that has the same bones.
- A **scene** has a background and actors. Each actor uses a rig and has a list
  of actions on the timeline.

### Cutout characters and code clips

The first characters are cutouts, as in the 2D motion prototype in
`prototypes/`. Traced pieces make the head, the torso, the hands and the feet.
The renderer draws the arms and the legs between them as rubber hoses, which
bend to reach the hands and the feet. Each character has a folder in
`assets/characters/` with a `rig.json` and its SVG pieces.

Birds have a rig of their own kind. Traced pieces make the head, the body with
the tail, a folded and an open wing, and the feet. The renderer draws the neck
and the legs. Each leg has two straight bones that bend backwards at the joint,
as on a real bird, and the head can move forward and back on the neck as well as
turn.

Rabbits have a third kind of rig. Traced pieces make the head, an ear, the body
with the haunch and the tail, a front paw and a long hind foot. Both ears use
the same piece, and so do both paws and both feet. The ears turn on the head, so
they can trail behind in a hop and flick to listen. The front legs are rubber
hoses, and each hind leg has two straight bones from the hip to the heel with
the knee bending forwards.

A clip works on the rigs of one kind only.

### Layers and draw order

Each part has a main layer, the `svg` of the part in `rig.json`, and it can list
more layers in `layers`, such as the back hair and the front hair of the head.
All layers of a part are drawn in the pixels of the part, so they move with its
bone. The things that the renderer draws on a part, such as the eyelids on the
head, go with the main layer.

The renderer draws each rig kind as a fixed set of slots, such as the near hand,
the far leg or the head. A slot is either a limb that the renderer draws or a
part on a bone. Each slot has one entry in the draw order for the limb or the
main layer, and one for each other layer of its part, with the id `slot.layer`.
The renderer computes the full transform of every entry and then draws the
entries in the draw order, not in the order of the bones. So the front hair can
go in front of the near arm while the back hair is behind the torso, although
both move with the head. The entries on the far side get the far shade of the
rig each, wherever they are in the order.

Each rig kind has a default draw order in `packages/renderer`. A rig can set its
own in `drawOrder`, a flat list of entry ids from the back to the front. If that
list leaves out an entry, such as a layer added later, the entry goes after the
entry before it in the default order. The developer changes the draw order in
the character studio.

For now, the clips are TypeScript code in `packages/renderer`: each clip is a
function from the time `t` to a pose and a face. This kept the motion of the
prototype, where the walk ties the steps to the distance walked so that the feet
don't slide. Clips with keyframes, stored as JSON and edited in the studio, may
come later as a second kind of clip.

### Files

The graphics are generated with AI and traced to SVG, as described in
[assets/CLAUDE.md](assets/CLAUDE.md). Rigs and clips are JSON files. The
built-in characters, props, clips and backgrounds live in `assets/` and are
committed to the repo. The server stores the cartoons that users make. The
server cleans uploaded SVG files of scripts and external links before it stores
them.

## Hosting

The app runs at https://piirretyt.pomeranssi.fi, on the pomeranssi.fi server
next to the other services. An English host name may come later.
