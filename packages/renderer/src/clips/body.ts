// The standing pose and the pieces of motion that the clips share. All values
// are in sheet pixels, for the proportions of the boy.
import type { Face, Pose, Pt } from '@toonhouse/model';

import { deg, easeInOut, lerp, smoothstep } from '../math.ts';

export const HIP_HEIGHT = 246;
const SHOULDER_TO_HAND = 150;

export interface FootPose {
  x: number;
  y: number;
  angle: number;
  /** How much the foot turns with the shin, see `Pose.footNearFollow`. */
  follow: number;
}

export const STAND_NEAR: FootPose = { x: 26, y: 0, angle: 0, follow: 0 };
export const STAND_FAR: FootPose = { x: -22, y: 0, angle: 0, follow: 0 };

/** A hand hanging from the shoulder, swung forward by `a`. */
export function hang(a: number, rest: number): Pt {
  return {
    x: Math.sin(a + rest) * SHOULDER_TO_HAND,
    y: Math.cos(a + rest) * SHOULDER_TO_HAND,
  };
}

export const NEAR_ARM_REST = deg(4);
export const FAR_ARM_REST = deg(-2);

/**
 * Breathing: a small rise and fall of the hips, `cycles` times over a clip of
 * `duration` seconds, so that a looping clip ends where it starts.
 */
export function breath(t: number, duration: number, cycles: number) {
  return Math.sin((t / duration) * cycles * 2 * Math.PI) * 2.5;
}

/** Standing still, with the hips raised by `lift`. */
export function standing(lift = 0): Pose {
  return {
    hip: { x: 0, y: -HIP_HEIGHT + lift },
    torsoAngle: 0,
    headAngle: 0,
    handNear: hang(0, NEAR_ARM_REST),
    handFar: hang(0, FAR_ARM_REST),
    handNearAngle: 0,
    handFarAngle: 0,
    handNearOpen: 0,
    footNear: { x: STAND_NEAR.x, y: STAND_NEAR.y },
    footFar: { x: STAND_FAR.x, y: STAND_FAR.y },
    footNearAngle: STAND_NEAR.angle,
    footFarAngle: STAND_FAR.angle,
    footNearFollow: STAND_NEAR.follow,
    footFarFollow: STAND_FAR.follow,
  };
}

/** The face with the mouth that the head was traced with. */
export const restingFace = (blink: number): Face => ({
  talking: false,
  open: 0,
  blink,
});

/** How much a swinging foot turns with the shin at most, see `FootPose`. */
const SWING_FOLLOW = 0.6;

/**
 * One foot through a walk cycle with the given reach in front of and behind
 * the hip. In the first half the foot is planted and moves back at an even
 * speed, as fast as the body moves forward, so it doesn't slide. In the second
 * half it swings forward with a lift.
 */
export function footCycle(q: number, reach: number, lift: number): FootPose {
  const u = q - Math.floor(q);
  if (u < 0.5) {
    const s = u / 0.5;
    // Heel strike: the toes come down over the first fifth of the stance.
    // Toe off: the heel rises over the last fifth.
    const heelStrike = deg(-14) * (1 - smoothstep(0, 0.22, s));
    const toeOff = deg(22) * smoothstep(0.72, 1, s);
    // Rolling onto the toes lifts the ankle.
    const roll = Math.sin(toeOff) * 70;
    return {
      x: lerp(reach, -reach, s),
      y: -roll,
      angle: heelStrike + toeOff,
      follow: 0,
    };
  }
  const s = (u - 0.5) / 0.5;
  return {
    x: lerp(-reach, reach, easeInOut(s)),
    y:
      -Math.sin(Math.PI * s) * lift -
      Math.sin(deg(22)) * 70 * (1 - smoothstep(0, 0.25, s)),
    angle: lerp(deg(22), deg(-14), smoothstep(0.1, 0.9, s)),
    // In the air the foot hangs from the shin and tips forward with it, but
    // only partly, and only as fast as it rises, so that the toes stay off the
    // ground. It turns back to its own angle before the heel strikes.
    follow:
      SWING_FOLLOW * smoothstep(0, 0.5, s) * (1 - smoothstep(0.5, 0.9, s)),
  };
}
