import type { Clip, Pt } from '@toonhouse/model';

import { blinkAt } from '../face.ts';
import { deg } from '../math.ts';
import {
  FAR_ARM_REST,
  footCycle,
  hang,
  HIP_HEIGHT,
  NEAR_ARM_REST,
  restingFace,
} from './body.ts';

/** Seconds per walk cycle, that is, two steps. */
const CYCLE = 0.64;
const CYCLES = 4;
/** How far a foot reaches in front of and behind the hip. */
const REACH = 81;
const FOOT_LIFT = 46;
const BOB = 12;
/** A planted foot moves 4 × REACH per cycle, so the body must too. */
export const WALK_SPEED = (4 * REACH) / CYCLE;

const BLINKS = [0.9, 2.1];

/**
 * A walk in place. The body stays at the origin, and `travel` says how far it
 * would have moved, so that the ground can move under the feet instead.
 */
export const walk: Clip = {
  id: 'walk',
  duration: CYCLE * CYCLES,
  loops: true,
  frameAt(t) {
    const q = t / CYCLE;
    const near = footCycle(q, REACH, FOOT_LIFT);
    const far = footCycle(q + 0.5, REACH, FOOT_LIFT);

    // The hips are lowest when a foot lands and highest when the legs pass.
    const stepPhase = 4 * Math.PI * q;
    const hip: Pt = {
      x: 4 * Math.sin(stepPhase),
      y: -HIP_HEIGHT + BOB * Math.cos(stepPhase),
    };
    // Lean into the walk. The head lags behind the body: it bobs a moment
    // later than the hips.
    const torsoAngle = deg(7) + deg(1.5) * Math.cos(stepPhase - 0.6);
    const headAngle = -(deg(5) + deg(3) * Math.cos(stepPhase - 1.3));

    // Arms swing against the legs, the hands trailing the shoulders a bit.
    const swing = deg(34);
    const armPhase = 2 * Math.PI * (q - 0.06);
    return {
      pose: {
        hip,
        torsoAngle,
        headAngle,
        handNear: hang(-swing * Math.cos(armPhase), NEAR_ARM_REST),
        handFar: hang(swing * Math.cos(armPhase), FAR_ARM_REST),
        handNearAngle: 0,
        handFarAngle: 0,
        handNearOpen: 0,
        footNear: { x: near.x, y: near.y },
        footFar: { x: far.x, y: far.y },
        footNearAngle: near.angle,
        footFarAngle: far.angle,
      },
      face: restingFace(blinkAt(t, BLINKS)),
      travel: WALK_SPEED * t,
    };
  },
};
