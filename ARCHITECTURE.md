# Architecture

Toonhouse is a TypeScript monorepo with pnpm workspaces. This page describes the
planned structure. So far, the character studio, the packages it uses, the first
parts of the server, the first version of the scene editor and the player exist.
The export client doesn't.

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
- The **ground layer** is the layer that the actors stand on. Each actor has its
  own place on it, so actors can stand nearer to the camera or further from it.
  The background sets the size of the actors, as frame pixels for one pixel of a
  rig. The renderer draws the actors right after the ground layer, so the layers
  after it, such as grass at the bottom edge, are in front of them. The renderer
  draws the actors from the top of the frame to the bottom, so that the nearer
  actors are in front. The background also sets the start point, where an actor
  goes if the user doesn't pick a place.
- A background can have a **perspective**: the y of the horizon, and the y where
  an actor has the size of the background. The size of an actor grows evenly
  with its distance below the horizon, as on flat ground. Above the horizon, an
  actor keeps a tenth of its size, so that the user can still see and select it.
  An actor with a fixed size ignores the perspective. The user gives an actor a
  fixed size by turning off "follow the background".
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

### Speech bubbles

The renderer draws the speech bubbles too, on top of the actors. It wraps the
text of a bubble into lines itself, with the widths of the letters of each font
saved in the renderer by `pnpm font-metrics`, because it can't measure text
without a DOM. So a line breaks in the same place in the editor, the player and
the exported video. The stage draws the text with kerning and ligatures off,
since the saved widths leave them out. It keeps the contextual alternates on,
because a font whose letters join needs them for the joins. They can make a line
a few percent wider than measured, and the padding of the bubble takes that.

An attached bubble keeps its place as an offset from the ground point of its
actor, in the pixels of the actor at size 1. The offset grows and shrinks with
the actor, so that the bubble stays as near to the head, but the bubble itself
keeps its size.

### Files

The graphics are generated with AI and traced to SVG, as described in
[assets/CLAUDE.md](assets/CLAUDE.md). Rigs and backgrounds are JSON files. The
built-in characters, props, clips and backgrounds live in `assets/` and are
committed to the repo. `assets/packs/` lists which asset pack each of them
belongs to. The test art in `assets/fixtures/`, a background and two props made
of simple shapes, is not part of the library. Only the tests use it. The server
stores the cartoons that users make.

## Server

The server is a [Hono](https://hono.dev) app on Node. Node runs the `.ts` files
directly, so the server has no build step. It stores its data in PostgreSQL and
uses hand-written SQL with [`postgres`](https://github.com/porsager/postgres).
The migrations are numbered `.sql` files in `apps/server/migrations`, and the
server applies the new ones at startup. The server follows the server of the
[cookbook](https://github.com/thaapasa/cookbook), so that the two work the same
way.

### Cartoon format versions

The server stores the content of a cartoon, its scenes with their actors and
actions, as JSON in the `content` column of the cartoon. `packages/model` has
its types, and `packages/api` the schema that checks a save, with the limits of
the content. The editor keeps the content inside the same limits, so that a save
doesn't fail on them.

Each saved cartoon has the version number of its data format. A change that
keeps the old cartoons valid, such as a new optional field, keeps the version as
it is. Each object in the schema keeps the fields that it doesn't know, so a web
app that is older than the server keeps the new fields when it saves, and the
server stores them.

The app is not deployed yet, so until the first deploy the format can change in
ways that break the saved cartoons, without a new version or a converter. The
tests in `apps/web/src/format` keep a saved cartoon of version 1 that uses every
field, and a list of the library ids that saved cartoons refer to. They fail
when a change could break the saved cartoons. Before the first deploy, update
them to match. After it, the change needs a new version.

Every save from the web app includes the version that the web app knows. If the
version is older than the latest, the server refuses the save with 409, and the
web app loads the new version. The unsaved edits can be lost, which is rare
enough to accept: the web app checks for a new version each time it comes back
to the foreground, and saves the edits before it loads the new version.

Each save also names the revision of the content that it edited, and the
revision goes up by one with each save. If someone has saved the cartoon after
that revision, in another window or on another device, the server refuses the
save with 409 too. The editor then lets the user keep their version, which it
saves over the other one, or load the saved version.

A 409 can also come from a save of the same editor whose answer was lost. So
each time the editor opens, it makes a random editor ID, and each save sends it.
The server stores the ID of the latest save with the content. On a 409, the
editor loads the content, and if the ID is its own, it goes on from that
revision. The edits that an editor keeps in the browser have its ID too, so the
next editor counts the saves of that editor as its own.

#### Planned upgrades

After the first deploy, a change that breaks the old cartoons gets a new version
and an upgrade. None of this is built yet.

When the format changes so that old cartoons no longer fit it, the version goes
up by one, and `packages/model` gets a converter from the previous version to
the new one. The converters are pure functions, and they run in a chain, so a
cartoon at version 1 goes through every converter up to the latest version. The
tests keep a saved cartoon of each old version and check that it upgrades to the
latest one.

A change to the library can also need a new version. If a character, a prop, a
clip or a background is renamed, removed or changes its structure, such as the
bones of a rig, the converter updates the cartoons that refer to it.

At startup, the server upgrades every cartoon that has an older version and
saves the result. If a converter fails on a cartoon, the server marks that
cartoon as broken and goes on with the startup. The web app can't open a broken
cartoon, so that the developer can fix it by hand. Because of this, the server
reads and sends only cartoons in the latest format. The export client sends its
version too, and the server tells an old export client to update.

The web app calls the API under `/api/app`. The server serves the build of the
web app from `apps/web/dist`, and every other path gets its `index.html`.

Every response has a Content-Security-Policy that allows only files from the app
itself, plus `data:` and `blob:` URLs for images and fonts, which the preview
image needs. The policy has no `unsafe-eval`, so the web app runs Zod without
its compiled parsers. API answers have `Cache-Control: no-store`, because they
depend on the session. The built files in `assets/` have a content hash in their
names, so browsers keep them for a year. `index.html` and `version.json` must
always come from the server.

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

A session lasts 90 days from the last use. The server extends it at most once a
day, and then sends the cookie again with the new expiry, because the browser
drops the cookie at the expiry that it got last.

The server counts the login attempts per client address, and per username from
each address, in memory, and refuses a login before it checks the password.
Counting the username with the address means that failed logins from elsewhere
can't lock a user out. Each check takes tens of milliseconds of Argon2 work, so
a flood of logins would slow down the whole server. One server process doesn't
need the counts to survive a restart. The client address is the last entry of
`X-Forwarded-For`, which Caddy adds.

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
profile page, the player and the editor. A tap on a cartoon on the home page
opens it in the player, and the owner gets a separate button to edit it.

The player draws the scenes with the same renderer as the editor. Until the
cartoon has shots, it plays each scene with a background from the start to the
end, one after another.

### Editor

The editor edits the scenes of one cartoon. It keeps the whole content of the
cartoon in memory, with a history of the edits for undo and redo, and saves the
content to the server a moment after each edit, and at once when the page goes
to the background. A drag on the stage or on the timeline is one step in the
history: each move of the drag redoes that step from where the drag started.

The editor loads the content from the server each time it opens, because a save
of an old revision fails. The saver in `apps/web/src/editor` does the saving,
apart from React. One save runs at a time. A save that the editor asks for while
another one runs, such as when the page goes to the background, goes right after
that one. If a save fails without an answer or with a server error, the editor
tries again after a while. If the server refuses the content, the editor tells
the user and tries again only after the next edit. If the cartoon is gone, or
the user is no longer its owner, the editor tells the user and stops.

When the editor can't save for now, it keeps the edits in the `localStorage` of
the browser, and the next editor of the cartoon starts from them and saves them.
This happens when the login has ended, after a conflict, and when the page goes
to the background or the editor closes before its edits are saved. While the
editor can't save, it writes them at most once a second, so that a drag doesn't
write the whole cartoon on each move. A closed editor sends its edits once more,
but doesn't try again, so that it can't race the next editor.

The library assets come from `assets/` through `import.meta.glob`, so the build
bundles them into the web app, as in the studio.

The stage asks the renderer where each actor is at the current time. The
renderer goes through the actions of the actor in the order of their times: an
action plays its clip until the next action starts, and a walk moves the actor
along its path as far as the `travel` of the walk clip says, so that the feet
don't slide. The travel doesn't have to be even: a hop stays in place while the
rabbit crouches. When a hop gets to the last point in the air, the rabbit
finishes the hop in place and sits when it lands. The clip's `step` sets when it
can stop. With a perspective, the actor gets smaller further away, so the same
travel covers fewer frame pixels there. The size is linear in y, so the renderer
can work out the distance along a line of the path exactly.

The stage shows the frame and a band around it, wide enough for the largest
character or prop of the library at the size that the background gives the
actors. The trees make the band almost as large as the frame, so the stage opens
at a home view, the frame with a thin margin, and the user zooms out from it to
see the whole band. Zooming and panning the stage scales the drawing of the
frame as a whole, so it shows what the cartoon shows, larger. It isn't the
camera, so the layers don't move against each other.

If the user has set the length of a scene, the scene lasts that long, but it
never ends before its last action starts. Otherwise it lasts a few seconds past
the end of its last action, and at least 10 seconds.

The timeline goes on a few seconds past the end of the scene, so that the user
sees where the scene ends and can start actions after it. The playhead can move
there too, and playing from there starts the scene from the beginning. While the
user drags an action or a time mark, the timeline keeps its scale, so that the
dragged thing stays under the finger when the scene gets longer or shorter.

### Preview images

When the user sets the preview image in the editor, the web app draws the frame
as the player shows it, turns that SVG into a WebP image in the browser and
uploads it. A browser that can't make WebP, such as Safari, makes a PNG, and the
server accepts both. The server checks the type from the first bytes of the
image, because it sends the image to other users with that type. The server
stores the image in PostgreSQL and serves it with the same visibility check as
the cartoon. The server does no rendering, and the home page shows one small
image per cartoon instead of drawing each scene.

The app never makes the image again by itself, so the home page shows the old
frame after the scene changes. The user sets it again when they want a new one.
The URL of the image has the time when it was set, so that the browser can keep
an image and still gets the new one.

An SVG drawn as an image can't use the fonts of the page, so the web app puts
the fonts of the speech bubbles into the SVG before it turns the SVG into an
image. This needs to work only in Chrome.

When export is built, it draws the renderer output on a canvas. The preview
images can then use the same canvas drawing instead of turning the SVG into an
image.

The build writes `version.json` next to `index.html`. When the web app comes
back to the foreground, it compares the build ID in that file to its own and
loads the page again if they differ. If the editor has edits that are not saved,
the web app saves them first. If the save fails, the web app doesn't load the
page and checks again the next time.

## Hosting

The app runs at https://piirretyt.pomeranssi.fi, on the pomeranssi.fi server
next to the other services. An English host name may come later.
