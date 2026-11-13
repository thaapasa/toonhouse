// Blinking and talking. Both are functions of the time alone.
import type { CutoutFace } from '@toonhouse/model';

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
export function lids(face: CutoutFace, blink: number) {
  const { eye, shutY } = face;
  return {
    upper: lerp(eye.cy - eye.ry, shutY, blink),
    lower: lerp(eye.cy + eye.ry, shutY, blink),
  };
}

/** The lash line along the edge of the upper lid, curving down when shut. */
export function lashLine(face: CutoutFace, y: number, blink: number) {
  const { cx } = face.eye;
  const sag = 3 + blink * 5;
  return `M${fmt(cx - 19)} ${fmt(y - 1)}Q${fmt(cx)} ${fmt(y + sag)} ${fmt(cx + 19)} ${fmt(y - 1)}`;
}
