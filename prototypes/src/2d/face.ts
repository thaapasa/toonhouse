// Facial expressions. The traced head has a wide open grin. A patch drawn by
// hand (public/2d/mouth-patch.svg) covers it with skin and a new profile line,
// and the mouth is drawn on top in code, in the pixels of the head piece.
import { SCENE } from '../common/path.ts';
import { clamp01, lerp, smoothstep } from './math.ts';

export interface Face {
  /** Show the traced grin instead of the drawn mouth. */
  grin: boolean;
  /** 0 is a closed smile, 1 a wide open mouth. */
  open: number;
}

/** A number in [0, 1) that depends only on `n`, for made-up mouth shapes. */
function hash(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
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

/**
 * The expression over the scene: a closed smile while walking, a big grin as
 * the arm goes up, then he says hello while waving, and smiles again.
 */
export function faceAt(t: number): Face {
  const { waveStart, waveEnd } = SCENE;
  const grinStart = waveStart + 0.15;
  const talkStart = waveStart + 0.7;
  const talkEnd = waveEnd - 0.3;
  if (t >= grinStart && t < talkStart) return { grin: true, open: 0 };
  if (t >= talkStart && t < talkEnd) {
    // Ease the talking in and out so the first and last frames are closed.
    const fade =
      smoothstep(talkStart, talkStart + 0.08, t) *
      (1 - smoothstep(talkEnd - 0.08, talkEnd, t));
    return { grin: false, open: clamp01(talking(t) * fade) };
  }
  return { grin: false, open: 0 };
}

// Mouth points in the pixels of the head piece. The front corner is near the
// profile line, the back corner turns up a little into a smile.
const FRONT = { x: 291, y: 293 };
const BACK = { x: 254, y: 290 };

/** The upper edge of the mouth: a slight smile curve. */
export function upperLip() {
  return `M${BACK.x} ${BACK.y}Q272 299 ${FRONT.x} ${FRONT.y}`;
}

/** The whole mouth opening for an opening of `open` (0 to 1). */
export function mouthShape(open: number) {
  const drop = 6 + open * 46;
  return `${upperLip()}Q${272 - open * 4} ${299 + drop} ${BACK.x} ${BACK.y}Z`;
}

/** The tongue, an ellipse at the bottom of the mouth. */
export function tongue(open: number) {
  return { cx: 266, cy: 301 + open * 19, rx: 16, ry: 4 + open * 6 };
}

/** The dimple at the back corner of the smile. */
export const CORNER = 'M249 284Q251 290 257 291';
