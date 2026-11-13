// Builds the 2D rig from the split and traced pieces: copies the SVGs to
// public/2d and finds the pivot points from the alpha mask of each piece.
// Writes public/2d/rig.json.
//
// Usage: node scripts/build-rig-2d.ts <pieces-dir>
// The pieces dir holds head, torso, hand, hand-open and foot, each as .png
// (from split-sheet.ts) and .svg (from pnpm trace-image).
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { PNG } from 'pngjs';

const dir = process.argv[2];
if (!dir) {
  console.error('Usage: node scripts/build-rig-2d.ts <pieces-dir>');
  process.exit(1);
}
const outDir = join(import.meta.dirname, '../public/2d');

interface Mask {
  w: number;
  h: number;
  on(x: number, y: number): boolean;
  rgb(x: number, y: number): [number, number, number];
}

function mask(name: string): Mask {
  const png = PNG.sync.read(readFileSync(join(dir!, `${name}.png`)));
  const { width: w, height: h, data } = png;
  return {
    w,
    h,
    on: (x, y) => data[(y * w + x) * 4 + 3]! > 128,
    rgb: (x, y) => {
      const o = (y * w + x) * 4;
      return [data[o]!, data[o + 1]!, data[o + 2]!];
    },
  };
}

/** Rows of the mask from `y0` to `y1` (fractions of the height). */
function rows(m: Mask, f0: number, f1: number) {
  let top = m.h;
  let bottom = 0;
  for (let y = 0; y < m.h; y++) {
    for (let x = 0; x < m.w; x++) {
      if (m.on(x, y)) {
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
  }
  const span = bottom - top;
  const y0 = Math.round(top + span * f0);
  const y1 = Math.round(top + span * f1);
  let sx = 0;
  let n = 0;
  for (let y = y0; y <= y1; y++) {
    for (let x = 0; x < m.w; x++) {
      if (m.on(x, y)) {
        sx += x;
        n++;
      }
    }
  }
  return { cx: n ? sx / n : m.w / 2, y0, y1, top, bottom };
}

function topIn(m: Mask, x: number) {
  for (let y = 0; y < m.h; y++) if (m.on(Math.round(x), y)) return y;
  return 0;
}

const r = (v: number) => Math.round(v * 10) / 10;
const pt = (x: number, y: number) => ({ x: r(x), y: r(y) });

function copySvg(name: string) {
  const svg = readFileSync(join(dir!, `${name}.svg`), 'utf8');
  const m = /width="(\d+)" height="(\d+)"/.exec(svg);
  if (!m) throw new Error(`${name}.svg has no size`);
  // Add a viewBox so that the piece can be placed with <use> and <symbol>.
  const out = svg.replace('<svg ', `<svg viewBox="0 0 ${m[1]} ${m[2]}" `);
  writeFileSync(join(outDir, `${name}.svg`), out);
  return { svg: `${name}.svg`, width: Number(m[1]), height: Number(m[2]) };
}

// Head: the neck is the middle of the bottom rows, a little above the edge so
// that the cut hides inside the shirt collar.
const head = mask('head');
const neckRows = rows(head, 0.95, 1);
const headData = {
  ...copySvg('head'),
  pivot: pt(neckRows.cx, neckRows.bottom - 18),
};

// Torso: the hip is the middle of the bottom of the shorts, the neck the
// middle of the top. The sleeve hole on the shirt sits at about a fifth of the
// height, so the shoulder goes there.
const torso = mask('torso');
const hipRows = rows(torso, 0.86, 0.94);
const topRows = rows(torso, 0, 0.04);
const shoulderRows = rows(torso, 0.15, 0.25);
const torsoHeight = hipRows.bottom - topRows.top;
const torsoData = {
  ...copySvg('torso'),
  pivot: pt(hipRows.cx, hipRows.top + torsoHeight * 0.86),
  neck: pt(topRows.cx + 6, topRows.top + 10),
  shoulder: pt(shoulderRows.cx - 4, topRows.top + torsoHeight * 0.18),
  hipNear: pt(hipRows.cx + 8, hipRows.top + torsoHeight * 0.86),
  hipFar: pt(hipRows.cx - 14, hipRows.top + torsoHeight * 0.86),
};

// Closed hand: it hangs down, so the wrist is the middle of the top rows.
const hand = mask('hand');
const wrist = rows(hand, 0, 0.06);
const handData = { ...copySvg('hand'), pivot: pt(wrist.cx, wrist.top + 6) };

// Open hand: the fingers point up, so the wrist is the middle of the bottom.
const handOpen = mask('hand-open');
const wristOpen = rows(handOpen, 0.94, 1);
const handOpenData = {
  ...copySvg('hand-open'),
  pivot: pt(wristOpen.cx, wristOpen.bottom - 6),
};

// Foot: the ankle is in the opening of the shoe, about a third from the heel,
// just below the top edge there.
const foot = mask('foot');
const ankleX = foot.w * 0.3;
const footData = {
  ...copySvg('foot'),
  pivot: pt(ankleX, topIn(foot, ankleX) + 14),
};

const outline = '#422517';
const rig = {
  head: headData,
  torso: torsoData,
  hand: handData,
  handOpen: handOpenData,
  foot: footData,
  outline,
  skin: '#fbc688',
  armLength: 175,
  legLength: 205,
  armWidth: 26,
  legWidth: 30,
  outlineWidth: 8,
  headScale: 0.82,
  footScale: 0.62,
  handScale: 0.62,
};
writeFileSync(join(outDir, 'rig.json'), JSON.stringify(rig, null, 2) + '\n');
console.log(JSON.stringify(rig, null, 2));
