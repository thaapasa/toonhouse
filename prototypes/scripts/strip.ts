// Puts PNG screenshots side by side into one image, to compare frames.
// Usage: node scripts/strip.ts <out.png> <in1.png> [in2.png ...]
import { readFileSync, writeFileSync } from 'node:fs';

import { PNG } from 'pngjs';

const [out, ...inputs] = process.argv.slice(2);
if (!out || inputs.length === 0) {
  console.error('Usage: node scripts/strip.ts <out.png> <in.png...>');
  process.exit(1);
}
const images = inputs.map((f) => PNG.sync.read(readFileSync(f)));
const width = images.reduce((a, i) => a + i.width, 0);
const height = Math.max(...images.map((i) => i.height));
const strip = new PNG({ width, height });
let x = 0;
for (const img of images) {
  PNG.bitblt(img, strip, 0, 0, img.width, img.height, x, 0);
  x += img.width;
}
writeFileSync(out, PNG.sync.write(strip));
console.log(out);
