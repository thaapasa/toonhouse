// The sitting pose of a rabbit and the pieces of motion that its clips share.
// All values are in sheet pixels, for the proportions of the bunny.
import type { Pt, RabbitFace, RabbitPose } from '@toonhouse/model';

import { deg, rotate, smoothstep } from '../../math.ts';

/** Height of the body pivot, the hip, above the ground when sitting. */
export const HIP_HEIGHT = 78;

/** Where the heels and the bottoms of the paws are when sitting. */
export const SIT_NEAR: Pt = { x: 12, y: 0 };
export const SIT_FAR: Pt = { x: -8, y: 0 };
export const PAW_NEAR: Pt = { x: 128, y: 0 };
export const PAW_FAR: Pt = { x: 106, y: 0 };

/**
 * The near shoulder against the hip, for clips that move the paws with the
 * body.
 */
export const SHOULDER: Pt = { x: 120, y: -35 };

/** The ears lean back a little at rest. */
export const EAR_NEAR = deg(-10);
export const EAR_FAR = deg(8);

/**
 * The tip of the sole in front of the heel, and the height of the heel above
 * the sole, in sheet pixels: the foot pixels of the rig times its scale.
 */
const TOE_X = 100;
const HEEL_HEIGHT = 45 * 0.45;

/**
 * A hind foot that stands on its toes with the heel lifted by `angle`, with
 * the toe tip at `toe` on the ground. Returns the ground point under the heel
 * that the pose takes.
 */
export function onToes(toe: Pt, angle: number): Pt {
  // The tip against the heel, which is HEEL_HEIGHT above the ground point.
  const tip = rotate({ x: TOE_X, y: HEEL_HEIGHT }, angle);
  return { x: toe.x - tip.x, y: toe.y - tip.y + HEEL_HEIGHT };
}

/** The toe tip of a foot flat on the ground with its heel at `x`. */
export const toeOf = (x: number): Pt => ({ x: x + TOE_X, y: 0 });

/**
 * Breathing: a small rise and fall of the body, `cycles` times over a clip of
 * `duration` seconds, so that a looping clip ends where it starts.
 */
export function breath(t: number, duration: number, cycles: number) {
  return Math.sin((t / duration) * cycles * 2 * Math.PI) * 1.5;
}

/** Sitting still, with the body raised by `lift`. */
export function sitting(lift = 0): RabbitPose {
  return {
    hip: { x: 0, y: -HIP_HEIGHT + lift },
    bodyAngle: 0,
    headAngle: 0,
    earNearAngle: EAR_NEAR,
    earFarAngle: EAR_FAR,
    pawNear: { ...PAW_NEAR },
    pawFar: { ...PAW_FAR },
    footNear: { ...SIT_NEAR },
    footFar: { ...SIT_FAR },
    footNearAngle: 0,
    footFarAngle: 0,
  };
}

export const quietFace = (blink: number): RabbitFace => ({ open: 0, blink });

/**
 * A quick flick of an ear that starts at `at`: it snaps back and swings in
 * again with a wobble. Returns the extra angle. What is left of it fades out
 * before `end`, so that a looping clip ends where it starts.
 */
export function earFlick(t: number, at: number, end: number, size = deg(-22)) {
  const s = t - at;
  if (s < 0) return 0;
  const snap = smoothstep(0, 0.06, s);
  const fade = 1 - smoothstep(end - 0.25, end, t);
  return size * snap * Math.exp(-5 * s) * Math.cos(2 * Math.PI * 4 * s) * fade;
}

/**
 * A damped spring that starts at `start` and settles to zero: the bounce after
 * a landing. What is left of it fades out before `end`, so that a looping clip
 * ends where it starts.
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
