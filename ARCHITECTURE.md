# Architecture

Toonhouse is a TypeScript monorepo with pnpm workspaces. This page describes the
planned structure. So far, the character studio, the packages it uses, the first
parts of the server and the first screens of the web app exist. The export
client doesn't.

The requirements are in [specs/](specs/README.md), and the UI design is in
[design/](design/CLAUDE.md).

## Apps

- **Web app** (`apps/web`): the player and the editor, built with React and
  Vite. The server serves it at https://piirretyt.pomeranssi.fi. The editor
  works on an iPad.
- **Server** (`apps/server`): a Node server that stores the cartoons and serves
  the assets and the web app. It never renders video. See [Server](#server).
- **Export client** (`apps/export`): a CLI that runs on the user's own computer.
  It downloads a cartoon from the server, renders it frame by frame and writes
  the video or the images to the local disk.
- **Character studio** (`apps/studio`): a development tool for making
  characters, props, backgrounds and clips. It runs only on the Vite dev server,
  and it writes its changes to the files in `assets/`. The files are committed
  to the repo. The production build doesn't include the studio.

The editor exists only in the web app. To edit on a computer, the user opens the
same web app in a browser.

## Packages

- `packages/model`: the types and the schemas of the cartoon, rig and clip
  formats.
- `packages/renderer`: computes what the cartoon looks like at a given time. It
  has no UI and runs in the browser, in Node and in headless Chromium.
- `packages/api`: the Zod schemas of the API between the server and the web app.
  Both validate the requests and the responses with them.
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

- A **rig** is a character or a prop: a tree of bones joined at pivot points,
  with a part on each bone. A part has one or more SVG layers.
- A **background** has layers at different depths, and parts that its clips
  move, such as the sun. It is not a rig.
- A **clip** is a short motion, such as a walk cycle. A clip works on any rig of
  the same kind, or on any background.
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

Props have a rig kind of their own, `prop`, for scenery such as trees and
bushes. A prop rig is a small tree of bones in `assets/props/`, each with a
part, such as a trunk with a few clumps of leaves for the crown. Several bones
can carry the same part. The pivot of the part of the root bone is the ground
point of the prop. A prop has two clips: `idle` stands still, and `rustle` sways
each bone and squashes its part a little, as far as the `sway` of the bone in
the rig sets. Each bone sways in its own phase, from its place in the rig, so
that the clumps of a crown don't move together. The clip gives only the strength
of the wind and where the gusts are, so it works on every prop.

A clip works on the rigs of one kind only.

### Layers and draw order

Each part has a main layer, the `svg` of the part in `rig.json`, and it can list
more layers in `layers`, such as the back hair and the front hair of the head.
All layers of a part are drawn in the pixels of the part, so they move with its
bone. The things that the renderer draws on a part, such as the eyelids on the
head, go with the main layer.

The renderer draws each rig kind as a fixed set of slots, such as the near hand,
the far leg or the head. A slot is either a limb that the renderer draws or a
part on a bone. A prop has one slot for each bone, in the order of its bones.
Each slot has one entry in the draw order for the limb or the main layer, and
one for each other layer of its part, with the id `slot.layer`. The renderer
computes the full transform of every entry and then draws the entries in the
draw order, not in the order of the bones. So the front hair can go in front of
the near arm while the back hair is behind the torso, although both move with
the head. The entries on the far side get the far shade of the rig each,
wherever they are in the order.

Each rig kind has a default draw order in `packages/renderer`. A rig can set its
own in `drawOrder`, a flat list of entry ids from the back to the front. If that
list leaves out an entry, such as a layer added later, the entry goes after the
entry before it in the default order. The developer changes the draw order in
the character studio.

### Backgrounds

Each background has a folder in `assets/backgrounds/` with a `background.json`
and its SVG files. The frame of a background is 16:9, in its own pixels.

- The **layers** go from the far to the near, which is also the draw order. Each
  layer is an SVG of the whole frame with a depth from 0 to 1. A layer at depth
  0, such as the sky, is infinitely far away, and the ground layer is at
  depth 1.
- The **ground layer** is the layer that the actors stand on. The background
  sets the ground line, the y of the ground points of the actors, and the size
  of the actors, as frame pixels for one pixel of a rig. The renderer draws the
  actors right after the ground layer, so the layers after it, such as grass at
  the bottom edge, are in front of them.
- The **parts** of a background are drawings on a layer that clips move, such as
  the sun and the clouds. A part moves with its layer when the camera moves.
  Parts that several backgrounds use, such as the sun, can come from
  `assets/backgrounds/shared/`.

A background is not a rig kind. It has no bones and no ground point, and the
camera moves its layers, which no rig has. Its parts still have the fields of a
rig part, and its clips are code clips like the others. A background clip gives
only how far along its motion it is, and the background sets the path of each
part: `idle` leaves the parts where they rest, `day` moves each part with an
`arc` from its start through its top to its end, as the sun rises and sets, and
`drift` moves each part with a `drift` sideways across the frame, as the clouds
drift. A drifting part leaves the frame on one side and comes back on the other.
The renderer rounds its speed so that it goes across a whole number of times in
one loop of the clip, and the loop ends where it started.

### Camera and parallax

The camera is the view of the ground layer: a rectangle with the shape of the
frame, set by its middle point and its zoom. At zoom 1 it shows the whole
background. The renderer clamps the camera so that it never zooms out past the
whole background or shows anything past its edges.

A layer at depth `d` zooms by `zoom ** d`, and the middle of its view moves from
the middle of the frame by `d` times as much as the camera. So a layer at depth
0 never moves, a layer at depth 1 moves with the camera, and each step in depth
zooms by the same factor, which looks more natural than a zoom that grows evenly
with the depth. With this formula the view of every layer stays inside the frame
whenever the view of the ground layer does, so only the camera needs clamping.

The renderer draws a background with its actors as one tree, in the pixels of
the picture, which has the size of the frame. Each actor is a group that names
the actor, because the parts of different actors can have the same ids. The
stage looks up the parts of a group under the prefix of its actor.

### Clips as code

For now, the clips are TypeScript code in `packages/renderer`: each clip is a
function from the time `t` to a pose and a face. This kept the motion of the
prototype, where the walk ties the steps to the distance walked so that the feet
don't slide. Clips with keyframes, stored as JSON and edited in the studio, may
come later as a second kind of clip.

### Files

The graphics are generated with AI and traced to SVG, as described in
[assets/CLAUDE.md](assets/CLAUDE.md). Rigs and backgrounds are JSON files. The
built-in characters, props, clips and backgrounds live in `assets/` and are
committed to the repo. The test art in `assets/fixtures/`, a background and two
props made of simple shapes, is not part of the library. Only the tests use it.
The server stores the cartoons that users make. The server cleans uploaded SVG
files of scripts and external links before it stores them.

## Server

The server is a [Hono](https://hono.dev) app on Node. Node runs the `.ts` files
directly, so the server has no build step. It stores its data in PostgreSQL and
uses hand-written SQL with [`postgres`](https://github.com/porsager/postgres).
The migrations are numbered `.sql` files in `apps/server/migrations`, and the
server applies the new ones at startup. The server follows the server of the
[cookbook](https://github.com/thaapasa/cookbook), so that the two work the same
way.

The web app calls the API under `/api/app`. The server serves the build of the
web app from `apps/web/dist`, and every other path gets its `index.html`.

### Users and sessions

Users and groups are added on the server with the commands in
`apps/server/src/cli`, and the app can't add them. A user can't choose their
password: the password reset on the profile page generates one. The command
generates one too, unless the developer types a password for the user. The
server stores an Argon2id hash of it.

A login makes a session. The browser keeps the session token in an HTTP-only
cookie, and the database stores only a SHA-256 hash of the token, so a copy of
the database doesn't let anyone log in. The web app has no other way to
authenticate, such as personal tokens.

The server counts the login attempts per username and per client address in
memory, and refuses a login before it checks the password. Each check takes tens
of milliseconds of Argon2 work, so a flood of logins would slow down the whole
server. One server process doesn't need the counts to survive a restart. The
client address is the last entry of `X-Forwarded-For`, which Caddy adds.

### Visibility

Each cartoon has an owner and a visibility: public, logged-in users, a group or
private. The SQL queries that read cartoons have the visibility check in their
`WHERE` clause, so a list never has a cartoon that the user can't watch. The
changes to a cartoon match the owner in their `WHERE` clause too.

If a user asks for a cartoon that they can't watch, the server answers 404, the
same as for a cartoon that doesn't exist. If they can watch it but try to change
it, the answer is 403.

## Web app

The web app is a React app built with Vite, like the
[cookbook](https://github.com/thaapasa/cookbook) client. It uses
[TanStack Router](https://tanstack.com/router) for the pages and
[TanStack Query](https://tanstack.com/query) for the data from the server, and
checks the responses with the schemas in `packages/api`. The styles are plain
CSS with the colors of the design boards. The translations follow the studio:
one file of texts per language, with keys that TypeScript checks.

In development, the Vite dev server passes `/api/` on to the server, so the web
app and the API share one origin, as in production.

The pages so far are the home page with the cartoons, the login page, the
profile page and the editor. The editor shows its layout, but its tools don't
work yet.

The build writes `version.json` next to `index.html`. When the web app comes
back to the foreground, it compares the build ID in that file to its own and
loads the page again if they differ.

## Hosting

The app runs at https://piirretyt.pomeranssi.fi, on the pomeranssi.fi server
next to the other services. An English host name may come later.
