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
