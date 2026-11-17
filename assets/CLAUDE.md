# Assets

This directory holds the graphics of the app. Agents make new graphics by
generating images with AI, redrawing them as SVG and checking the result.

- `examples/`: style references for the art and the UI design. They are not used
  in the app.
- `packs/`: the asset packs, one folder each. See "Asset packs" below.
- `work/`: scratch files from generating and tracing. Git ignores it.

To make an animated 2D character, follow [cutout-toons.md](cutout-toons.md). It
builds on the steps below.

## Asset packs

Every character, prop and background belongs to one asset pack. The folder of a
pack in `packs/` has two files:

- `pack.json` lists the characters, props and backgrounds of the pack by their
  folder names. The assets stay in `characters/`, `props/` and `backgrounds/`,
  so that saved cartoons keep finding them.
- `bubbleFont` in `pack.json` is the default font of the speech bubbles. Pick a
  free font, such as one under the SIL Open Font License, because the app serves
  the font itself.
- `style.txt` is the style prompt of the pack. Put it in every prompt for an
  image of the pack, so that the assets of the pack look alike.

In every pack, keep the art simple: a few large shapes, flat fills and an
outline. Simple art keeps the SVG files small, and fine detail looks wrong when
a part bends or stretches in a clip.

To make a new pack, write its style prompt first and try it on one character
before you make the rest. The style lives only in the style prompt. The rest of
the prompt describes the subject and what the tracing needs.

## Generating images

Images come from [Draw Things](https://drawthings.ai), which runs on the Mac of
the developer. Its HTTP API is on port 7860, and the sandbox reaches it through
a port forward in `airlock.local.toml`.

Check that the API answers before you start. `curl -s localhost:7860/` returns
the current settings of Draw Things as JSON. If the API does not answer, ask the
user to start Draw Things, turn on its HTTP API server, and forward the port.

```sh
pnpm generate-image --prompt-file assets/work/fox.txt --out assets/work/fox.png
```

- The script uses Qwen Image 2.1 Turbo with its recommended settings. Run
  `pnpm generate-image --help` for the options.
- One 640×960 image takes about 50 seconds, and Draw Things makes one image at a
  time. Use `--count` to try several seeds in one run.
- Small images come out plainer and less detailed. Use 640×960 to test a prompt,
  and at least 1024 px on the short side for an image you want to keep.
- The script saves the request next to the image as `<name>.prompt.json`. To
  make the same image again, use the same prompt and seed.
- Write each prompt to a file in `work/`, so that you can change it and run it
  again.
- Look at every generated image before you trace it.

## Writing prompts

These rules come from testing with Qwen Image 2.1 Turbo.

- Make original characters. Don't name existing characters, cartoons or artists.
  Describe the look you want instead.
- Start the prompt with "RGBA image with an alpha channel and a fully
  transparent background". Without it, the image has a white background and a
  ground shadow, and both get traced as shapes.
- For a side view, write "side profile view, facing right, only one eye
  visible". "Three-quarter view" gives a character that faces the front.
- End the prompt with the style prompt of the pack. It should ask for solid
  color fills with no gradients, no texture and no shading, and for an even
  outline around every shape.
- Keep every fill color clearly lighter than the outline. Otherwise a dark fill,
  such as dark green shorts, is hard to tell apart from the outline when the
  image is redrawn.
- For a rig, ask for a "cutout puppet parts sheet" with every piece separate and
  nothing touching. This gives an exploded side view with the head, the torso,
  an arm, the shorts, a leg and a foot as separate pieces. The arm and the leg
  don't come split at the elbow and the knee yet.

## Backgrounds

A background is a stack of layers in `backgrounds/<name>/`, one SVG for each
depth, all with the same 2048×1152 frame. The `LOG.md` of each background lists
its layers, their depths and how they were made. These rules come from making
the meadow, the farm and the village.

- Generate each layer except the sky as a wide strip, such as 2048×768, with the
  transparent background sentence. Ask for a "wide panoramic background layer
  for a side-scrolling 2D cartoon" that "runs across the whole width of the
  image, touches the left, right and bottom edges", and say that the image above
  it is fully transparent, with no sky, no sun and no clouds.
- End the prompt with "Empty scene, no figures, no humans, no animals", and
  don't write that characters walk there. Otherwise the image model can draw a
  person in the layer, especially with a style prompt that names a kind of game.
- Add "with no border" for the ground. Without it, the image model often draws
  an outline around the whole strip.
- The content of a strip comes out shorter than the share you ask for. To make
  trees smaller, use a wider strip, such as 2048×512, instead of asking for
  smaller trees.
- At 2048 px wide, round tree crowns can come with dots or smiles that look like
  faces. Write "plain shapes with no faces, no eyes and no marks".
- A large ground area comes out plain green or beige. Ask for scattered tufts,
  flowers or pebbles to give it some detail.
- Put the strip in the frame at a scale and an offset before tracing, with the
  alpha rounded to fully transparent or fully opaque. A far layer that stops
  above the bottom of the frame should repeat its last full row down to the
  bottom, so that no gap opens behind the ground when the camera moves.
- Make far layers paler by mixing their fill colors with the sky color after
  tracing. The far fields of the farm came out almost as bright as the near
  layers, even though the prompt asked for pale colors.
- Draw the sky as a flat rectangle in the SVG. The sun and the clouds are
  separate pieces in `backgrounds/shared/`.

## Props

A prop that rustles, such as a tree or a bush, is in `props/<name>/`, with its
crown in separate pieces on separate bones. The `LOG.md` of each prop has its
prompt, its seed and how its rig is set up. These rules come from making the
trees and the bushes.

- Generate the pieces as a parts sheet at 1280×1024, as for a character: the
  trunk and two to four leaf clumps, or only the clumps for a bush. The pieces
  come in the same style and at the same scale, so the clumps fit the trunk at a
  scale near 1.
- If the trunk has branches, the image model puts the largest clump on top of
  it. Ask for "a bare leafless tree trunk like a tree in winter … standing alone
  with empty space all around it", and for leaf clumps "floating apart from each
  other and from the trunk".
- A spruce comes out well as a trunk that tapers to a point and three triangular
  tiers with a zigzag lower edge.
- For a bush, ask for clumps "with a flat bottom". Some seeds still draw a
  ground shadow or a darker band under a clump.
- Dark green fills can trace with specks and thin lines along a jagged edge.
  Redraw them with `redraw-image`, which removes both.

In the rig, the clumps overlap each other by a good part of their size, so that
no gap opens when they sway. A clump behind the trunk lets the branches show in
front of the leaves. The pivot of a clump of a tree is in its middle, a little
below the center. The pivot of a clump of a bush is in the middle of its bottom
edge, and the root of a bush sways only about 1°, because a larger angle lifts
the ends of a wide clump off the ground.

## Tools

The graphics tools are in two places:

- `pnpm generate-image`, `pnpm render-svg` and `pnpm trace-image` come with the
  normal `mise install`.
- `redraw-image` is a Python script, and its tools are in the mise environment
  `art`. Run `MISE_ENV=art mise install` once to install Python and uv. The
  first run of the script then installs its Python packages into the uv cache,
  outside the project folder.

If `pnpm` isn't on the `PATH` in your shell, run it through mise:
`mise exec -- pnpm render-svg …`.

## Redrawing

`redraw-image` turns a generated image into an SVG that is easy to edit:

- one path for the silhouette, in the outline color
- one path for each fill color, on top of the silhouette
- with `lines` in the config, one path for each line inside the outline, on top
  of the fills.

A line inside the outline is a mouth, a crease, the gap between two fingers or
the border between two fills, such as around the ear. With `lines`, the fills
close under each line, so that you can move or remove a line by editing one
path. A line path keeps its exact shape, including where it gets thinner at the
ends. Without `lines`, a line is a gap between the fills where the outline shows
through.

A fill also reaches a little under the fills above it, so that no seam shows
between them. The script smooths the edges, removes specks and thin seams, and
fits curves with [Potrace](https://potrace.sourceforge.net/).

Use it for the pieces of characters and props.

### Redrawing an existing asset

To clean up an asset that was traced before, redraw it from its committed SVG.
The SVG already has the layers, the mirroring and the scale that the rig
expects, so the pivots in `rig.json` stay right. Copy the SVGs to
`assets/work/<name>/traced/` first, because the redraw writes over them, and
point `src` at the copies. If the pieces of the parts sheet are still in
`assets/work/` and have the same frames as the parts, you can redraw from them
instead, as for the emo character.

Use the colors of the rig for the layers it also draws: `colors.outline` for the
outline, `colors.skin` for the skin, and the colors in `limbs`, such as the
sleeve. Otherwise the limbs don't match the parts.

Some parts need more than `redraw-image` writes, such as a clip path around a
hair layer, a mirrored hand, or a pattern drawn by hand. Write a script that
makes the final SVG from the redrawn one, and keep it in `redraw/` with the
configs, as the emo character's `finish.py`. Keep the configs in
`<asset>/redraw/`, and write in the `LOG.md` of the asset how to get the sources
back with `git show`. The boy is the example.

A traced SVG sometimes uses one color for two roles, such as a hair color that
also draws the mouth line. Find those paths with `paths`, which lists the paths
of the SVG with their fills, and `--show`, which renders one of them in magenta:

```sh
MISE_ENV=art mise run redraw-image -- paths assets/work/fox/traced/head.svg
MISE_ENV=art mise run redraw-image -- paths assets/work/fox/traced/head.svg --show 12 assets/work/fox/path-12.png
```

Then give them the color of their role with `recolor` in the config, such as
`"recolor": {"12": "#422517"}`. The captain, the grandma and the quartermaster
were redrawn before `recolor` existed, so they do this with prep scripts in
`redraw/`.

### Steps

Run the commands from the repo root.

1. Write a starting config. `init` finds the main colors of the image, takes the
   darkest one as the outline and lists the rest as fills, from the largest area
   down:

   ```sh
   MISE_ENV=art mise run redraw-image -- init assets/work/fox/head.png assets/work/fox/head.json
   ```

   The config writes its SVG next to itself, such as `assets/work/fox/head.svg`.
   Change `out` if the SVG should go somewhere else.

2. Edit the layers in the config. This is the step that decides how the result
   looks:
   - Keep one layer for each color that the part should have, such as the skin,
     the hair, the eye white and the shirt. Give each a `name`, as described in
     "Color roles" below.
   - Put the shades and the leftovers of a color in the `also` list of the layer
     they belong to. The image model often shades a fill even when the prompt
     asks for flat colors.
   - Put dark colors that draw lines in the outline layer. A dark shade along
     the edge of a shape is usually part of the outline.
   - Order the layers from the bottom up. An eye goes above the skin, and
     stripes go above the shirt. If a layer should lie completely under a layer
     above it, such as a shirt under its stripes, list that layer in its
     `covers`.
   - Set `out` to the SVG to write.
   - Add `"lines": {}` to make each line its own path.

3. Redraw the image, and render the result on a colored background:

   ```sh
   MISE_ENV=art mise run redraw-image -- assets/work/fox/head.json
   pnpm render-svg assets/work/fox/head.svg assets/work/fox/head-check.png --background '#50a0dc'
   ```

4. Compare the result with the image. `compare` shows two images side by side,
   each an SVG or a PNG, and `--crop` zooms in on a detail:

   ```sh
   MISE_ENV=art mise run redraw-image -- compare assets/work/fox/head.png assets/work/fox/head.svg assets/work/fox/cmp.png --width 1200 --crop 150,150,300,300
   ```

5. Change the config and run it again until the result matches. `--debug` writes
   an image that shows the layer of every pixel, with the line paths in magenta.
   It helps when a color goes to the wrong layer.

Run `MISE_ENV=art mise run redraw-image -- --help` for the settings, such as how
much to smooth the edges and how thin a seam is.

### Color roles

The name of a layer is its color role, and the path of the layer gets the class
`c-<name>`, such as `c-skin` or `c-shirt-logo`. The line paths have the class of
the outline. The classes let the app recolor a character with the color presets
of that character. See [specs/characters.md](../specs/characters.md).

- Write the names in kebab case.
- Use the same name for the same color in every part of a character. The skin is
  `skin` in the head and in the hands, so a color preset sets both with one
  color.
- Name the role, not the color: `trim` for the white sole, toe cap and laces of
  a shoe, not `white`.
- If two things in a part need different colors in some color preset, give them
  different colors in the image and separate layers, such as a shirt and the
  logo on it. The script can't split one color into two roles.
- Treat the names as part of the asset, like the names of the parts. Saved
  cartoons will refer to them once the app has color presets.

### Limits

- The script can't fix a shape that is wrong in the source. A clean source gives
  a clean result, so fix the prompt first.
- A line that is thinner than `minLine` between two fills counts as a seam and
  disappears. Lower `minLine` for a part with fine lines.
- A patch smaller than `minArea` takes the color around it. This also removes
  small details, such as the rim of a button. Lower `minArea` to keep them.
- A fill that is as dark as the outline, such as black hair, merges with the
  outline and gets no role of its own, so a color preset can't change it. Ask
  for a lighter color in the prompt, or accept it and write it in the `LOG.md`.
- A fine pattern, such as plaid, comes out as blotches. Ask for a plainer
  pattern in the prompt, or redraw the part plain and draw the pattern with a
  finish script.
- If a part is drawn at a small scale in the rig, its lines are thin in the
  pixels of the SVG. Raise `scale` and lower `minLine` and `smooth` for it.
- A line path is a filled shape, not a stroke. To make a line thicker, edit its
  outline.
- Only a line that has fill around most of it becomes its own path. Where a line
  runs into the outline along the edge, it is cut there, and the outline keeps
  the rest. The wedges between the spikes of the boy's hair taper into the
  outline, so they stay part of it.
- The script has not been tried on backgrounds yet. Trace them with
  `trace-image`.

## Tracing

Backgrounds are still traced with VTracer:

```sh
pnpm trace-image assets/work/fox.png assets/work/fox.svg
pnpm render-svg assets/work/fox.svg assets/work/fox-check.png --background '#50a0dc'
```

`trace-image` traces the image with VTracer and minifies the SVG with SVGO.
Check the result with `render-svg`. A colored background shows holes, stray
edges and leftovers of the background.

If two colors merge in the trace, run it again with a fixed palette. Pick the
colors from the image, such as `--palette '#3a2410,#f8c48c,#e01010,#22b010'`.

## What to commit

Commit the final SVG, the `.prompt.json` of the image it came from and the
`redraw-image` config. Don't commit the generated PNG files, because they are
large and can be made again from the prompt.
