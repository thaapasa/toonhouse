# Assets

This directory holds the graphics of the app. Agents make new graphics by
generating images with AI, tracing them to SVG and checking the result.

- `examples/`: style references for the art and the UI design. They are not used
  in the app.
- `work/`: scratch files from generating and tracing. Git ignores it.

To make an animated 2D character, follow [cutout-toons.md](cutout-toons.md). It
builds on the steps below.

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
- Ask for a flat style: solid color fills, no gradients, no texture, no shading,
  and a bold, even dark brown outline around every shape.
- Use bright colors for everything except the outline. When tracing reduces the
  colors, it merges dark colors, such as dark green shorts, with the outline.
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
  Trace them again with a fixed palette of the outline and the fill.

In the rig, the clumps overlap each other by a good part of their size, so that
no gap opens when they sway. A clump behind the trunk lets the branches show in
front of the leaves. The pivot of a clump of a tree is in its middle, a little
below the center. The pivot of a clump of a bush is in the middle of its bottom
edge, and the root of a bush sways only about 1°, because a larger angle lifts
the ends of a wide clump off the ground.

## Tracing

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

Commit the final SVG and the `.prompt.json` of the image it came from. Don't
commit the generated PNG files, because they are large and can be made again
from the prompt.
