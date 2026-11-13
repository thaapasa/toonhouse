// The standing pose of a bird and the pieces of motion that its clips share.
// All values are in sheet pixels, for the proportions of the hen.
import type { BirdFace, BirdPose, Pt } from '@toonhouse/model';

import { deg, smoothstep } from '../../math.ts';

/** Height of the body pivot, between the hips, above the ground. */
export const HIP_HEIGHT = 128;
/** The base of the head against the neck point, along the body. */
export const HEAD: Pt = { x: 4, y: -4 };

export const STAND_NEAR: Pt = { x: 12, y: 0 };
export const STAND_FAR: Pt = { x: -10, y: 0 };

/**
 * Breathing: a small rise and fall of the body, `cycles` times over a clip of
 * `duration` seconds, so that a looping clip ends where it starts.
 */
export function breath(t: number, duration: number, cycles: number) {
  return Math.sin((t / duration) * cycles * 2 * Math.PI) * 1.5;
}

/** Standing still, with the body raised by `lift`. */
export function standing(lift = 0): BirdPose {
  return {
    hip: { x: 0, y: -HIP_HEIGHT + lift },
    bodyAngle: 0,
    head: { ...HEAD },
    headAngle: 0,
    wingNearAngle: 0,
    wingFarAngle: deg(-4),
    wingNearOpen: 0,
    wingFarOpen: 0,
    footNear: { ...STAND_NEAR },
    footFar: { ...STAND_FAR },
    footNearAngle: 0,
    footFarAngle: 0,
  };
}

export const quietFace = (blink: number): BirdFace => ({ open: 0, blink });

export interface HeadKey {
  /** When the head starts moving to this pose. */
  at: number;
  x: number;
  y: number;
  angle: number;
}

/**
 * A head that moves in quick jerks and holds still between them, as a bird
 * looks around. Each move takes `snap` seconds. Before the first key the head
 * is at the last one, so a loop that ends with a move back joins up.
 */
export function jerkyHead(
  t: number,
  keys: readonly HeadKey[],
  snap = 0.07,
): { at: Pt; angle: number } {
  let prev = keys.at(-1)!;
  let x = prev.x;
  let y = prev.y;
  let angle = prev.angle;
  for (const k of keys) {
    const u = smoothstep(k.at, k.at + snap, t);
    x += (k.x - prev.x) * u;
    y += (k.y - prev.y) * u;
    angle += (k.angle - prev.angle) * u;
    prev = k;
  }
  return { at: { x, y }, angle };
}

/**
 * A damped spring that starts at `start` and settles to zero: the bounce after
 * a landing or a stop. What is left of it fades out before `end`, so that a
 * looping clip ends where it starts.
 */
export function settle(
  t: number,
  start: number,
  end: number,
  freq: number,
  damp: number,
) {
  const s = t - start;
  if (s < 0) return 0;
  const fade = 1 - smoothstep(end - 0.25, end, t);
  return Math.exp(-damp * s) * Math.sin(2 * Math.PI * freq * s) * fade;
}
