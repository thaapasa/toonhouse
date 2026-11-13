import type { BirdFrame, Clip } from '@toonhouse/model';

import { blinkAt } from '../../face.ts';
import { deg, easeInOut, lerp, smoothstep } from '../../math.ts';
import { HEAD, HIP_HEIGHT, quietFace } from './body.ts';

/** Seconds per walk cycle, that is, two steps. */
const CYCLE = 0.5;
const CYCLES = 4;
/**
 * How far a foot reaches in front of and behind the hip. A loop moves the
 * ground 16 × REACH, which is a whole number of the studio's ground marks.
 */
const REACH = (81 * 6) / 16;
const FOOT_LIFT = 34;
const BOB = 4;
/** A planted foot moves 4 × REACH per cycle, so the body must too. */
export const BIRD_WALK_SPEED = (4 * REACH) / CYCLE;
/** Part of a step that the head holds back while the body walks on. */
const HOLD = 0.62;
/**
 * How much of the step the head holds back. A real bird holds its head still
 * for the whole step, but with this big head and short neck that pushed the
 * head far ahead of the body before each thrust.
 */
const BOB_SHARE = 0.4;

const BLINKS = [0.7, 1.55];

/**
 * One foot through a walk cycle. In the first half it is planted flat and
 * moves back as fast as the body moves forward. In the second half it lifts
 * high with the toes curled down, and flattens again before it lands.
 */
function footCycle(q: number) {
  const u = q - Math.floor(q);
  if (u < 0.5) {
    return { x: lerp(REACH, -REACH, u / 0.5), y: 0, angle: 0 };
  }
  const s = (u - 0.5) / 0.5;
  return {
    x: lerp(-REACH, REACH, easeInOut(s)),
    y: -Math.sin(Math.PI * s) * FOOT_LIFT,
    angle: deg(38) * Math.sin(Math.PI * smoothstep(0, 0.85, s)),
  };
}

/**
 * The head-bob of a walking bird. For most of a step the head lags behind as
 * the body walks on, then it thrusts forward to catch up. `s` is the phase in the step, from 0 to 1.
 */
function headBob(s: number) {
  const stepTime = CYCLE / 2;
  const span = BIRD_WALK_SPEED * HOLD * stepTime * BOB_SHARE;
  if (s < HOLD) return { x: span / 2 - (s / HOLD) * span, dip: 0 };
  const u = (s - HOLD) / (1 - HOLD);
  const thrust = 1 - (1 - u) ** 3;
  return { x: -span / 2 + thrust * span, dip: Math.sin(Math.PI * u) * 5 };
}

/**
 * A walk in place with a waddle: the body rocks from foot to foot, and the
 * head bobs. The body stays at the origin, and `travel` says how far it would
 * have moved.
 */
export const walk: Clip<BirdFrame> = {
  id: 'walk',
  kind: 'bird',
  duration: CYCLE * CYCLES,
  loops: true,
  frameAt(t) {
    const q = t / CYCLE;
    const near = footCycle(q);
    const far = footCycle(q + 0.5);

    // The body is lowest when a foot lands and rocks over to it.
    const stepPhase = 4 * Math.PI * q;
    const bob = BOB * Math.cos(stepPhase);
    const bodyAngle = deg(5) + deg(3) * Math.sin(2 * Math.PI * q);

    // The head bobs once a step, starting its hold as a foot lands. It moves
    // against the bob of the body, so that it stays level while it holds.
    const s = (2 * q + 0.15) % 1;
    const head = headBob(s);
    return {
      kind: 'bird',
      pose: {
        hip: { x: 0, y: -HIP_HEIGHT + bob },
        bodyAngle,
        head: { x: HEAD.x + head.x, y: HEAD.y - bob + head.dip },
        headAngle: -bodyAngle + deg(2) * Math.sin(stepPhase),
        wingNearAngle: deg(2) * Math.cos(stepPhase - 0.8),
        wingFarAngle: deg(-4) + deg(2) * Math.cos(stepPhase - 0.8),
        wingNearOpen: 0,
        wingFarOpen: 0,
        footNear: { x: near.x, y: near.y },
        footFar: { x: far.x, y: far.y },
        footNearAngle: near.angle,
        footFarAngle: far.angle,
      },
      face: quietFace(blinkAt(t, BLINKS)),
      travel: BIRD_WALK_SPEED * t,
    };
  },
};
