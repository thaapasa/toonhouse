// Shows a region of a piece PNG, to place face patches and find features such
// as the eye. Prints a character map of the region and can write a zoomed crop
// with a grid every 20 px.
//
// Usage: node scripts/inspect-piece.ts <piece.png> <x0> <y0> <x1> <y1>
//   [--step <px>] [--zoom <out.png>] [--white]
//
// Map characters: ' ' transparent, 'W' white, '#' dark (outline, pupil),
// '.' skin, 'r' any other color. The first column is y, and column i of the
// map is x0 + i * step. --white also prints the box around the white pixels in
// the region, which finds an eye.
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

import { PNG } from 'pngjs';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    step: { type: 'string', default: '3' },
    zoom: { type: 'string' },
    white: { type: 'boolean' },
  },
});
const [file, ...box] = positionals;
const [x0, y0, x1, y1] = box.map(Number);
if (!file || [x0, y0, x1, y1].some((v) => v === undefined || Number.isNaN(v))) {
  console.error(
    'Usage: node scripts/inspect-piece.ts <piece.png> <x0> <y0> <x1> <y1>',
  );
  process.exit(1);
}
const step = Number(values.step);
const png = PNG.sync.read(readFileSync(file));
const px = (x: number, y: number) => {
  const i = (y * png.width + x) * 4;
  return [png.data[i]!, png.data[i + 1]!, png.data[i + 2]!, png.data[i + 3]!];
};
const isWhite = (r: number, g: number, b: number) =>
  r > 225 && g > 225 && b > 220;

function cell(x: number, y: number) {
  const [r, g, b, a] = px(x, y) as [number, number, number, number];
  if (a < 128) return ' ';
  if (isWhite(r, g, b)) return 'W';
  if (r < 120) return '#';
  if (r > 200 && g > 150 && b > 100 && r - b < 130) return '.';
  return 'r';
}

console.log(`x from ${x0} in steps of ${step}`);
for (let y = y0!; y <= y1!; y += step) {
  let row = '';
  for (let x = x0!; x <= x1!; x += step) row += cell(x, y);
  console.log(`${String(y).padStart(4)} ${row}`);
}

if (values.white) {
  let bx0 = Infinity;
  let by0 = Infinity;
  let bx1 = -Infinity;
  let by1 = -Infinity;
  for (let y = y0!; y <= y1!; y++) {
    for (let x = x0!; x <= x1!; x++) {
      const [r, g, b, a] = px(x, y) as [number, number, number, number];
      if (a > 128 && isWhite(r, g, b)) {
        bx0 = Math.min(bx0, x);
        by0 = Math.min(by0, y);
        bx1 = Math.max(bx1, x);
        by1 = Math.max(by1, y);
      }
    }
  }
  console.log(`white pixels: x ${bx0}…${bx1}, y ${by0}…${by1}`);
}

if (values.zoom) {
  const k = 3;
  const w = x1! - x0! + 1;
  const h = y1! - y0! + 1;
  const out = new PNG({ width: w * k, height: h * k });
  for (let y = 0; y < h * k; y++) {
    for (let x = 0; x < w * k; x++) {
      const sx = x0! + Math.floor(x / k);
      const sy = y0! + Math.floor(y / k);
      const [r, g, b, a] = px(sx, sy) as [number, number, number, number];
      const al = a / 255;
      // Grey behind transparent pixels, a blue grid line every 20 source px.
      let c = [r, g, b].map((v) => Math.round(v * al + 80 * (1 - al)));
      if ((sx % 20 === 0 && x % k === 0) || (sy % 20 === 0 && y % k === 0))
        c = [0, 160, 255];
      const j = (y * w * k + x) * 4;
      out.data[j] = c[0]!;
      out.data[j + 1] = c[1]!;
      out.data[j + 2] = c[2]!;
      out.data[j + 3] = 255;
    }
  }
  writeFileSync(values.zoom, PNG.sync.write(out));
  console.log(values.zoom);
}
