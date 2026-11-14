# Shared background pieces: work log

The sun and the clouds are pieces that every background can use. Work files are
in `assets/work/bg/`.

## Sun

1. The prompt asks for one round yellow sun with an orange ring and twelve short
   triangular rays with rounded tips, with no face.
2. Generated at 1024×1024. Seed 2 came with heart-shaped rays, so I added "with
   rounded tips" to the prompt and generated seeds 3 and 4. I picked seed 3, and
   `sun.prompt.json` is its request.
3. Cropped the image to the box of its opaque pixels, traced it with the default
   settings and set the `viewBox` to the crop, 956×954. The center of the sun is
   the center of the `viewBox`.

## Clouds

1. The prompt asks for a sheet of four separate fluffy white clouds with flat
   bottoms and a light blue-gray underside, in a two by two grid.
2. Generated seed 1 at 1536×1024. It came out flat, with four clean clouds.
   `clouds.prompt.json` is its request.
3. Split the sheet with `prototypes/scripts/split-sheet.ts` and traced each
   piece with the default settings to `cloud-1.svg` to `cloud-4.svg`.

The backgrounds use these clouds as parts on the sky layer, so that the `drift`
clip can move them. Each cloud has its own size and speed. The speeds are 20, 40
and 60 px/s, because the renderer rounds a speed so that the cloud crosses the
frame a whole number of times in the 120 s loop of the clip, and slower speeds
all round to one crossing.
