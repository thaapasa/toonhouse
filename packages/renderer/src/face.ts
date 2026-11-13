// Blinking and talking. Both are functions of the time alone.
import type { CutoutFace, EyeFace } from '@toonhouse/model';

import type { DrawNode } from './draw.ts';
import { hash, lerp, smoothstep } from './math.ts';

/**
 * How closed the eye is at `t`, for blinks that start at the given times. A
 * blink shuts fast, stays shut for a frame and opens a bit slower.
 */
export function blinkAt(t: number, starts: readonly number[]) {
  let b = 0;
  for (const start of starts) {
    const close = smoothstep(start, start + 0.06, t);
    const reopen = smoothstep(start + 0.1, start + 0.2, t);
    b = Math.max(b, close * (1 - reopen));
  }
  return b;
}

/**
 * Talking: the mouth opens and closes at random, a new target about ten times
 * a second, with some frames fully closed so the words seem to break.
 */
export function talking(t: number) {
  const rate = 10;
  const k = Math.floor(t * rate);
  const u = smoothstep(0, 1, t * rate - k);
  const target = (i: number) => {
    const h = hash(i);
    return h < 0.25 ? 0 : 0.25 + 0.75 * hash(i + 1000);
  };
  return lerp(target(k), target(k + 1), u);
}

const fmt = (n: number) => Math.round(n * 100) / 100;

/** The upper edge of the mouth: a slight smile curve. */
export function upperLip(face: CutoutFace) {
  const { back, front, control } = face.mouth;
  return `M${back.x} ${back.y}Q${control.x} ${control.y} ${front.x} ${front.y}`;
}

/** The whole mouth opening for an opening of `open` (0 to 1). */
export function mouthShape(face: CutoutFace, open: number) {
  const { back, control, openDepth } = face.mouth;
  const drop = 6 + open * openDepth;
  return `${upperLip(face)}Q${fmt(control.x - open * 4)} ${fmt(control.y + drop)} ${back.x} ${back.y}Z`;
}

/** The tongue, an ellipse at the bottom of the mouth. */
export function tongue(face: CutoutFace, open: number) {
  const tg = face.mouth.tongue;
  return {
    cx: tg.cx,
    cy: tg.cy + open * tg.drop,
    rx: tg.rx,
    ry: tg.ry + open * tg.grow,
  };
}

/** Lid edges for a blink amount: the upper lid does most of the moving. */
export function lids(face: EyeFace, blink: number) {
  const { eye, shutY } = face;
  return {
    upper: lerp(eye.cy - eye.ry, shutY, blink),
    lower: lerp(eye.cy + eye.ry, shutY, blink),
  };
}

/** The lash line along the edge of the upper lid, curving down when shut. */
export function lashLine(face: EyeFace, y: number, blink: number) {
  const { cx, rx } = face.eye;
  // The line stops just inside the eye ellipse.
  const half = rx - 1;
  const sag = 3 + blink * 5;
  return `M${fmt(cx - half)} ${fmt(y - 1)}Q${fmt(cx)} ${fmt(y + sag)} ${fmt(cx + half)} ${fmt(y - 1)}`;
}

/**
 * Lids over the eye for a blink amount, with the lash line along the upper
 * lid. An open eye has none.
 */
export function eyeLids(
  face: EyeFace,
  blink: number,
  colors: { lid: string; line: string },
): DrawNode[] {
  if (blink <= 0.02) return [];
  const { upper, lower } = lids(face, blink);
  const { eye } = face;
  const top = eye.cy - eye.ry - 2;
  const bottom = eye.cy + eye.ry + 2;
  // The lids reach 10 px past the eye on each side; the clip trims them.
  const x = eye.cx - eye.rx - 10;
  const width = 2 * eye.rx + 20;
  return [
    {
      type: 'group',
      clip: face.eyeClip
        ? { type: 'path', d: face.eyeClip }
        : { type: 'ellipse', ...eye },
      children: [
        {
          type: 'rect',
          x,
          y: top,
          width,
          height: upper - top,
          fill: colors.lid,
        },
        {
          type: 'rect',
          x,
          y: lower,
          width,
          height: bottom - lower,
          fill: colors.lid,
        },
        {
          type: 'path',
          d: lashLine(face, upper, blink),
          stroke: colors.line,
          strokeWidth: 5,
          lineCap: 'round',
        },
      ],
    },
  ];
}
