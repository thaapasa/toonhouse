# Making a cutout toon

This guide describes how to make a 2D character that walks, waves, talks and
blinks, in the same way as the boy in the 2D motion prototype. Follow it to make
a new character in the style of an asset pack. Read [CLAUDE.md](CLAUDE.md)
first: it covers generating images, writing prompts and redrawing.

The boy is the worked example. His files are in `prototypes/`:

- `public/2d/`: the traced pieces, `rig.json`, the mouth patch, the background,
  and the `.prompt.json` of each generated image
- `src/2d/`: the drawing (`main.ts`), the walk and the wave (`anim.ts`) and the
  face (`face.ts`)
- `scripts/`: the tools named in the steps below
- [LOG.md](../prototypes/LOG.md): every command and setting that made his files

## How the character is built

The character is a few traced pieces with the arms and legs drawn in code:

- Five pieces come from one generated parts sheet: the head with the hair, the
  torso with the clothes on the hips, a relaxed hand, an open hand and a foot.
  The far hand and foot reuse the same pieces, drawn darker.
- The arms and legs are thick curves with an outline, from the shoulder or the
  hip to the wrist or the ankle. The curve keeps about the same length, so the
  limb bends when the hand or the foot comes closer, like a rubber hose.
- The face is drawn over the traced head: lids for blinking, and a mouth that
  can close, smile or open to any size. A patch drawn by hand covers the mouth
  that the image came with.
- All motion is written by hand as functions of the time `t`. There are no
  keyframes and no clock: the picture at `t` depends only on `t`.

Only the side view exists. A character that turns towards the camera needs
another set of pieces for each view.

The app uses a copy of the boy in `packs/sunny/characters/blond-boy/`. Its
`rig.json` has the pivots of the prototype rig, and also the values that the
prototype had in code: the face coordinates, the colors and the sleeve. The
steps below still work in `prototypes/`. When the character is done, add it to
the app as described in "Adding the character to the app" at the end.

## Steps

Run the commands from the repo root unless the step says `prototypes/`. Keep the
work files in `assets/work/<name>/`, which git ignores. Write each step in a log
as you go, as in [LOG.md](../prototypes/LOG.md): the command, the seed, what you
picked and why.

### 1. Generate the parts sheet

Write the prompt to `assets/work/<name>/parts.txt`. This is the prompt that made
the boy, with the style prompt of his pack replaced by `<style prompt>`. Change
the description of the character and the colors, and put the `style.txt` of the
pack in place of `<style prompt>`:

```text
RGBA image with an alpha channel and a fully transparent background. A cutout
puppet parts sheet for a 2D cartoon character, with only five separate pieces
laid out in a row with wide empty space between them, nothing touching or
overlapping. The character is an original cheerful six-year-old boy with wild
spiky messy blond hair, side profile view, facing right, only one eye visible.
The five pieces are: 1) the head with the hair, side profile facing right, one
eye, small nose, big open smile, an ear, no neck; 2) the torso and the shorts as
one piece, a red and black striped t-shirt tucked into bright green shorts, seen
from the side, with no arms and no legs, rounded at the shoulder and the leg
holes; 3) one small relaxed hand seen from the side, a simple mitten shape with
a thumb; 4) one open hand with the palm facing the viewer and the fingers
spread, as for waving; 5) one foot in a red sneaker with a white sole and white
laces, side view, pointing right, with no leg. <style prompt> No text, no
labels, no numbers, no ground shadow.
```

The boy's head came with an open grin, and step 5 covers it with a patch. Asking
for a closed mouth instead might make the patch unnecessary, but this has not
been tried. The drawn mouth would then have to line up with the traced one.

Generate three seeds at 1280×1024. Each takes about two minutes:

```sh
pnpm generate-image --prompt-file assets/work/<name>/parts.txt \
  --out assets/work/<name>/parts.png --width 1280 --height 1024 --seed 11 --count 3
```

Look at every image and pick one where:

- there are exactly five pieces, and none of them touch
- the head faces right, has one eye and has a short neck stub at the bottom
- the torso has no arms and no legs, and is drawn upright
- the hands are hands only, without a forearm
- the thumbs are on the right side of both hands, as on the boy's: at the front
  of the relaxed hand, and on the right of the open palm. If a thumb is on the
  left, mirror that traced hand. Otherwise the relaxed hand's thumb points down,
  and the wave shows a twist that an arm can't make.
- the foot has no leg
- the colors are bright and different from the dark outline

The image model sometimes draws marks on the torso where the arm and the leg
would join, such as a sleeve hole and a leg hole. They help: the shoulder and
the hips go there.

### 2. Split the sheet into pieces

In `prototypes/`:

```sh
node scripts/split-sheet.ts ../assets/work/<name>/parts-<seed>.png ../assets/work/<name>/pieces
```

The script finds the islands in the alpha channel, merges small specks into the
piece next to them, and writes `piece-0.png`, `piece-1.png` and so on, sorted
from the top left. It prints the box of each piece. Check that there are five,
then rename them to `head.png`, `torso.png`, `hand.png`, `hand-open.png` and
`foot.png`.

### 3. Redraw each piece

Redraw each piece as described in "Redrawing" in [CLAUDE.md](CLAUDE.md). Keep
the config of each piece in `assets/work/<name>/pieces/`, next to the piece,
while you work. When you add the character to the app, move the configs to
`assets/packs/<pack>/characters/<name>/redraw/`:

```sh
MISE_ENV=art mise run redraw-image -- init assets/work/<name>/pieces/head.png assets/work/<name>/pieces/head.json
MISE_ENV=art mise run redraw-image -- assets/work/<name>/pieces/head.json
pnpm render-svg assets/work/<name>/pieces/head.svg assets/work/<name>/check/head.png --background '#50a0dc'
```

Use the same outline color in every piece, because the arms and the legs are
drawn in that color too. The boy's pieces use `#422517`, which is
`colors.outline` in his `rig.json`.

### 4. Build the rig

`prototypes/scripts/build-rig-2d.ts` copies the SVGs to `public/2d/`, finds the
pivot points from the alpha mask of each piece and writes `rig.json`. It is
written for the boy, so copy it for a new character and point it at a new output
folder. In `prototypes/`:

```sh
node scripts/build-rig-2d.ts ../assets/work/<name>/pieces
```

The script finds the points with these rules. Check that they fit the new
pieces, and change the fractions where they don't:

| Point               | Rule                                                  |
| ------------------- | ----------------------------------------------------- |
| Neck, on the head   | Middle of the bottom rows, a little up into the neck  |
| Neck, on the torso  | Middle of the top rows                                |
| Shoulder            | 18 % down the torso, where the sleeve hole is         |
| Hips                | 86 % down the torso, inside the bottom of the clothes |
| Wrist, relaxed hand | Middle of the top rows (the hand hangs down)          |
| Wrist, open hand    | Middle of the bottom rows (the fingers point up)      |
| Ankle               | 30 % of the foot width from the heel, below the top   |

These values are set by eye in the same script. Expect to change them for a new
character:

- `outline` and `skin`: take the colors of the outline and the skin layers from
  the configs of the pieces.
- `headScale`, `handScale` and `footScale`: the pieces come off the sheet at
  different sizes. The boy's head is drawn at 0.82 and his hands and foot at
  0.62.
- `armLength` and `legLength`: a limb shorter than the distance it has to reach
  is drawn straight. Make the legs long enough that the knees bend at the hip
  height of the walk.
- `armWidth`, `legWidth` and `outlineWidth`: match the outline width of the
  pieces.

When the character is in the library, tune it in the Fit tab of the character
studio while a clip plays. The tab sets the size of each part, with
`scales.torso` for the torso and `scales.handOpen` for the open hand, the
length, the width and the outline of the limbs, and the `motion` settings of the
rig: the hip height, the feet offset against the hips, and the ground offset
that moves the whole character up or down. Set the ground offset last, so that
the soles touch the ground.

### 5. Prepare the face

The face code is in `prototypes/src/2d/face.ts`. Its coordinates are in the
pixels of the head piece.

`prototypes/scripts/inspect-piece.ts` shows a region of a piece as a character
map, so that you can read where the outline, the skin and the eye are. `--white`
prints the box around the white pixels, which finds the eye. `--zoom` writes an
enlarged crop with a grid every 20 px. In `prototypes/`:

```sh
node scripts/inspect-piece.ts ../assets/work/<name>/pieces/head.png 226 190 290 248 --white
node scripts/inspect-piece.ts ../assets/work/<name>/pieces/head.png 180 200 347 386 --zoom ../assets/work/<name>/mouth-grid.png
```

**Eye.** Set `EYE` to an ellipse a little larger than the eye with its outline,
and `SHUT_Y` to where the lids meet, a little below the middle. Set the times of
the blinks in `BLINKS`, at uneven gaps.

In the app rig, the ellipse is `face.eye`. If an ellipse that covers the eye
also covers a line around it, such as an eyeliner wing next to the lid crease,
set `face.eyeClip` to a path around the eye. The lids are then clipped to the
path, and `face.eye` only sets how far they move.

**Mouth patch.** If the head came with an open mouth, cover it with a patch:

1. Read the character map around the mouth. Find where the mouth ends at the
   back, where the upper lip meets the profile, and where the profile line
   continues below the mouth.
2. Write `public/2d/mouth-patch.svg` with the same `viewBox` as the head. It has
   two paths: a skin-colored shape over the whole mouth, and an outline stroke
   along a new profile line from under the nose to the chin. Use the skin and
   outline colors from the head SVG, and the outline width of the head.
3. Render the patch over the head at 4× zoom and look at the joins. Move the
   points until no old outline shows past the new line. To do this, put the
   paths of the head SVG and the patch into one SVG with a `viewBox` around the
   mouth and run `pnpm render-svg` on it.

**Mouth.** Set `FRONT` and `BACK` to the front and back corners of the mouth,
`CORNER` to the dimple at the back corner, and the numbers in `upperLip`,
`mouthShape` and `tongue` to match. An open mouth is the smile line closed by a
curve below it. The bottom of a quadratic curve reaches only halfway to its
control point, so place the tongue in the upper half of the drop.

`faceAt(t)` picks the expression over the scene: the drawn mouth closed, the
drawn mouth talking, or the traced grin, with the patch hidden. `talking(t)`
opens and closes the mouth from a hash of the frame number, so it looks random
but stays a function of `t`.

### 6. Animate

The motion is in `prototypes/src/2d/anim.ts`. It returns a pose for each `t`:
the hip position, the angles of the torso and the head, the hand and foot
positions and angles, and how open the hand is. `main.ts` turns the pose into
SVG.

**Walk.** The walk moves the feet, and the legs follow:

- In the first half of a cycle, a foot is planted and moves back as fast as the
  ground moves under the character, so it doesn't slide. In the second half it
  swings forward in an arc, with the heel strike and the toe-off as foot angles.
- The phase comes from the distance covered on the screen, divided by the scale
  of the character there. This keeps the feet planted even when the character is
  drawn at another scale than the ground (`CHARACTER_ZOOM`).
- The walk starts and ends a quarter cycle into a step, when the legs pass each
  other. Then the feet are close to the standing pose, and the blend between
  walking and standing needs little sliding. `CYCLES` is a whole number and
  `PHASE_OFFSET` is 0.25.
- The hips bob twice a cycle (`BOB`), the torso leans into the walk, the head
  lags behind the bob, and the arms swing against the legs with a small delay.

**Stop.** `settle()` is a damped spring that starts at the stop. The hips sink
and spring back, the torso overshoots backwards and the head nods.

**Wave.** The arm dips back for a moment, then shoots up with an overshoot
(`easeOutBack`). The hand switches to the open hand halfway up and wags. The
head tilts with the wave, and the arm comes down with an ease.

To make the character feel different, change the numbers: `HIP_HEIGHT`, `BOB`,
`FOOT_LIFT`, `REACH` (from `CYCLES`), the lean and swing angles, and the spring
frequencies. A heavier character bobs less and swings slower; a lively one bobs
more and overshoots more.

**Drawing order.** Far arm, far hand, far leg and far foot first, in a group
drawn 18 % darker. Then the near leg, the torso, the near foot, the head with
the face, and the near arm and hand last. The legs go under the torso, so the
clothes hide the hips.

### 7. Make a background

Ask for a wide empty area where the characters walk. The boy's park came from
this prompt at 1536×896, seed 21, with the style prompt of his pack in place of
`<style prompt>`:

```text
A simple background for a 2D cartoon: a sunny park seen from the side
at eye level. The lower half of the picture is a wide, flat, empty lawn of
bright green grass with nothing on it, where characters can walk. Behind the
lawn, a few round leafy trees with brown trunks, a couple of round bushes, and a
low wooden fence far back. Above, a light blue sky with two or three simple
white puffy clouds. No people, no animals, no path, no benches in the
foreground. <style prompt> No text.
```

A background doesn't need the transparent background line. Trace it with the
default settings and add a `viewBox` to the SVG.

### 8. Check the result

Look at the motion in screenshots, not only in the browser. The dev server runs
on port 10790 (`pnpm dev` in `prototypes/`). In `prototypes/`:

```sh
node scripts/screenshot.ts 2d ../assets/work/shots/walk 1.5 1.6 1.7 1.8
node scripts/strip.ts ../assets/work/shots/walk.png ../assets/work/shots/walk-1_5.png ../assets/work/shots/walk-1_6.png
```

- `SHOT_CLIP=x,y,w,h` takes a close-up of one part of the page, and
  `SHOT_SCALE=3` renders it at three times the pixel density. Use both for the
  face.
- `strip.ts` puts frames side by side, so you can compare them in one image.

Check these frames:

- mid-walk, a few frames 0.1 s apart: do the feet stay planted and the knees
  bend forward?
- the start and the stop: do the feet slide or jump?
- the wave: does the hand clear the face, and does the open hand switch in
  cleanly?
- the face at 3×: do the joins of the mouth patch show? Does the blink cover the
  whole eye?

### 9. Commit

Commit the SVGs, `rig.json`, the mouth patch, the `.prompt.json` of each
generated image you used, the `redraw-image` configs in a `redraw/` folder, the
code and the log. Don't commit the generated PNG files.

## Known limits

- Side view only. Turning needs a front and a three-quarter set of pieces, and
  getting the same character in several views from the image model is the hard
  part.
- The hair is part of the head, so only the whole head can lag. A separate hair
  piece with a spring would look livelier.
- The torso is one stiff piece. It doesn't squash, stretch or twist.
- The sleeve is a plain tube drawn in code, without the pattern of the shirt.
- The open hand faces the viewer while the body is in profile, so the wrist
  looks a little odd in the wave.

## Long clothes

If the clothes reach the ground, such as a long robe or a dress, set
`feetBehindTorso` in the rig. The near foot is then drawn behind the torso, and
the hem covers the top of both feet. Set `limbs.legColor` to the color of the
clothes, so that a leg that shows in a long stride looks like a fold of them.

## Layers of a part

A part can have more layers than its main SVG, such as the back hair and the
front hair of the head. Trace each layer at the size of the part, so that it
lines up with the main layer, and list it in `layers` of the part with an id and
the SVG file. Then open the draw order in the character studio, move the layers
where they belong, such as the back hair behind the torso and the front hair in
front of the near hand, and save the rig. To give a new layer id a name in the
studio, add it to the translation files of the studio.

## Holding a staff

A cutout rig can have a staff in the near hand. The wizard is the example, and
his [log](packs/sunny/characters/wizard/LOG.md) describes how it was set up:

- Ask for the staff as a sixth piece on the parts sheet, and for the relaxed
  hand as a closed fist.
- Add the staff to the parts of the rig, with its pivot at the point that sits
  in the fist, and set `staff` in the rig. The type `StaffHold` in
  `packages/model` describes each field.
- The clips place the hands for the boy, so check that the staff stays clear of
  the face in the walk and the wave. The hand stays a fist in the wave.

## Adding the character to the app

1. Make a folder `assets/packs/<pack>/characters/<name>/` and copy the SVG
   pieces, the mouth patch and the `.prompt.json` of the parts sheet there. See
   "Asset packs" in [CLAUDE.md](CLAUDE.md) for how to pick the name.
2. Write `rig.json` in the same shape as the boy's. The type `CutoutRig` in
   `packages/model` describes each field. Take the pivots from the rig that
   `build-rig-2d.ts` wrote, and the face coordinates from step 5.
3. Add the name of the character in Finnish and English to the translations of
   the web app and the studio, under `character.<pack>/<name>`.
4. Add the color settings of the character to `rig.json`, as "Color settings" in
   [CLAUDE.md](CLAUDE.md) describes, and try them in the Colors tab of the
   studio.

The studio finds the folder by itself. Start it with `pnpm studio` and play each
clip on the new character.

If a piece sits in the wrong place, such as a head that doesn't meet the neck of
the torso, fix the rig in the studio. In the "Rig" panel, an attachment point
moves where a piece or a limb joins its parent, on the posed character. A piece
pivot moves the point on the piece itself, in a view of that piece alone. For
the hands, the view also has a "Turn" mode, which sets `hands.relaxedAngle`,
`hands.openAngle` or the `staff.handAngle` of the fist. Save writes the new
numbers to `rig.json`.
