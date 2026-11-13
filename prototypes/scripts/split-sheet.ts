// Splits a parts sheet into pieces by finding the separate islands in the alpha
// channel. Writes each piece as its own PNG, cropped with some padding, with
// only that island's pixels kept. Prints the bounding boxes as JSON.
//
// Usage: node scripts/split-sheet.ts <sheet.png> <out-dir> [--min-area <px>]
//   [--alpha <0-255>] [--pad <px>]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import { PNG } from 'pngjs';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    'min-area': { type: 'string', default: '400' },
    alpha: { type: 'string', default: '32' },
    pad: { type: 'string', default: '6' },
    // Islands closer than this are merged, so that loose hair spikes or
    // specks stay with their piece.
    merge: { type: 'string', default: '12' },
  },
});
const [input, outDir] = positionals;
if (!input || !outDir) {
  console.error('Usage: node scripts/split-sheet.ts <sheet.png> <out-dir>');
  process.exit(1);
}
const minArea = Number(values['min-area']);
const alphaMin = Number(values.alpha);
const pad = Number(values.pad);
const mergeDist = Number(values.merge);

const png = PNG.sync.read(readFileSync(input));
const { width: W, height: H, data } = png;
const label = new Int32Array(W * H).fill(-1);

interface Island {
  id: number;
  area: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
const islands: Island[] = [];

for (let start = 0; start < W * H; start++) {
  if (label[start] !== -1 || data[start * 4 + 3]! < alphaMin) continue;
  const id = islands.length;
  const isl: Island = { id, area: 0, x0: W, y0: H, x1: 0, y1: 0 };
  const stack = [start];
  label[start] = id;
  while (stack.length) {
    const p = stack.pop()!;
    const x = p % W;
    const y = (p / W) | 0;
    isl.area++;
    isl.x0 = Math.min(isl.x0, x);
    isl.y0 = Math.min(isl.y0, y);
    isl.x1 = Math.max(isl.x1, x);
    isl.y1 = Math.max(isl.y1, y);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const q = ny * W + nx;
        if (label[q] === -1 && data[q * 4 + 3]! >= alphaMin) {
          label[q] = id;
          stack.push(q);
        }
      }
    }
  }
  islands.push(isl);
}

// Union islands whose boxes come within `mergeDist` of each other.
const parent = islands.map((_, i) => i);
const find = (i: number): number =>
  parent[i] === i ? i : (parent[i] = find(parent[i]!));
const near = (a: Island, b: Island) =>
  a.x0 - mergeDist <= b.x1 &&
  b.x0 - mergeDist <= a.x1 &&
  a.y0 - mergeDist <= b.y1 &&
  b.y0 - mergeDist <= a.y1;
for (let i = 0; i < islands.length; i++) {
  for (let j = i + 1; j < islands.length; j++) {
    // Only small islands join others; two big pieces stay apart.
    const a = islands[i]!;
    const b = islands[j]!;
    if (Math.min(a.area, b.area) < minArea * 4 && near(a, b)) {
      parent[find(i)] = find(j);
    }
  }
}
const groups = new Map<number, Island>();
for (const isl of islands) {
  const root = find(isl.id);
  const g = groups.get(root);
  if (!g) groups.set(root, { ...isl, id: root });
  else {
    g.area += isl.area;
    g.x0 = Math.min(g.x0, isl.x0);
    g.y0 = Math.min(g.y0, isl.y0);
    g.x1 = Math.max(g.x1, isl.x1);
    g.y1 = Math.max(g.y1, isl.y1);
  }
}

const pieces = [...groups.values()]
  .filter((g) => g.area >= minArea)
  .sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);

mkdirSync(outDir, { recursive: true });
const out: Record<string, unknown>[] = [];
pieces.forEach((g, n) => {
  const x0 = Math.max(0, g.x0 - pad);
  const y0 = Math.max(0, g.y0 - pad);
  const x1 = Math.min(W - 1, g.x1 + pad);
  const y1 = Math.min(H - 1, g.y1 + pad);
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const crop = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = (y + y0) * W + (x + x0);
      const o = (y * w + x) * 4;
      const l = label[p]!;
      // Keep the island's own pixels and the faint edge pixels around it.
      const keep =
        (l !== -1 && find(l) === g.id) || (l === -1 && data[p * 4 + 3]! > 0);
      for (let c = 0; c < 4; c++)
        crop.data[o + c] = keep ? data[p * 4 + c]! : 0;
    }
  }
  const file = join(outDir, `piece-${n}.png`);
  writeFileSync(file, PNG.sync.write(crop));
  out.push({ file, x: x0, y: y0, width: w, height: h, area: g.area });
});
console.log(JSON.stringify(out, null, 2));
