import type { Clip, RabbitFrame } from '@toonhouse/model';

import { blinkAt } from '../../face.ts';
import { clamp01, deg, easeInOut, lerp, smoothstep } from '../../math.ts';
import {
  EAR_FAR,
  EAR_NEAR,
  HIP_HEIGHT,
  onToes,
  PAW_FAR,
  PAW_NEAR,
  quietFace,
  SIT_FAR,
  SIT_NEAR,
  toeOf,
} from './body.ts';

/** Seconds per hop. */
const PERIOD = 0.62;
const HOPS = 3;
/**
 * How far a hop goes. A loop moves the ground 3 × LENGTH, which is a whole
 * number of the studio's ground marks.
 */
const LENGTH = 81 * 2;
const HEIGHT = 75;
/** The parts of a hop: the crouch on the ground, then the jump. */
const TAKE_OFF = 0.32;
/** The part of the jump when the front paws land, before the hind feet. */
const PAWS_DOWN = 0.82;
/** The part of the jump when the toes leave the ground. */
const TOES_OFF = 0.42;
/** How far the heel lifts on the push-off. */
const TOE_ANGLE = deg(70);

export const RABBIT_HOP_SPEED = LENGTH / PERIOD;

const BLINKS = [0.95];

/** How far the jump of a hop has got, from 0 at the take-off to 1. */
const air = (u: number) => clamp01((u - TAKE_OFF) / (1 - TAKE_OFF));

/**
 * A hind foot through a hop, against the ground under the rabbit. It pushes
 * off from the toes, swings forward in the air and lands where it sits. `s`
 * is how far the jump has got, and the foot is `lag` behind it.
 */
function hindFoot(s: number, lag: number, home: number, height: number) {
  const f = clamp01(s - lag);
  const toe = toeOf(home).x;
  if (f <= 0) return { at: { x: home, y: 0 }, angle: 0 };
  if (f < TOES_OFF) {
    // The toes stay on the ground and the heel lifts as the body goes on.
    const angle = TOE_ANGLE * smoothstep(0, TOES_OFF, f);
    return { at: onToes({ x: toe - LENGTH * s, y: 0 }, angle), angle };
  }
  const start = onToes({ x: toe - LENGTH * (TOES_OFF + lag), y: 0 }, TOE_ANGLE);
  const u = (f - TOES_OFF) / (1 - TOES_OFF);
  const e = easeInOut(u);
  // The feet trail under the body and flatten before they land.
  return {
    at: {
      x: lerp(start.x, home, e),
      y:
        lerp(start.y, 0, e) -
        0.55 * height * smoothstep(0, 0.3, u) -
        10 * Math.sin(Math.PI * u),
    },
    angle: TOE_ANGLE * (1 - smoothstep(0, 0.85, u)),
  };
}

/**
 * A front paw through a hop. It leaves the ground first, reaches forward in
 * the air and lands ahead of the hind feet, then stays put while the body
 * catches up. The paw is `lag` behind the jump.
 */
function frontPaw(s: number, lag: number, home: number, height: number) {
  const f = clamp01(s - lag);
  if (f <= 0) return { x: home, y: 0 };
  if (f >= PAWS_DOWN) return { x: home + LENGTH * (1 - s), y: 0 };
  const u = f / PAWS_DOWN;
  const landAt = home + LENGTH * (1 - PAWS_DOWN - lag);
  return {
    x: lerp(home, landAt, easeInOut(u)) + 30 * Math.sin(Math.PI * u),
    y: -height * (1 - smoothstep(0.6, 1, u)) - 20 * Math.sin(Math.PI * u),
  };
}

/**
 * Hopping along. Each hop starts with a crouch, the hind legs push off, the
 * body stretches out in the air, the front paws land first and the hind feet
 * swing in under the body. The ears trail behind on the jump and flop forward
 * on the landing. The rabbit stays at the origin, and `travel` says how far
 * it would have moved.
 */
export const hop: Clip<RabbitFrame> = {
  id: 'hop',
  kind: 'rabbit',
  duration: PERIOD * HOPS,
  loops: true,
  // The rabbit lands at the end of each hop, so it can stop in a sitting pose.
  step: PERIOD,
  frameAt(t) {
    const k = Math.floor(t / PERIOD);
    const u = t / PERIOD - k;
    const s = air(u);
    const height = HEIGHT * 4 * s * (1 - s);
    // The crouch before the take-off, and the squash after the landing.
    const crouch = smoothstep(0.05, TAKE_OFF, u) * (1 - smoothstep(0, 0.12, s));
    const land = s >= 1 ? 0 : smoothstep(0.85, 1, s);
    const squash = Math.max(crouch, land * 0.6);

    // The body tips nose up on the take-off and nose down to land.
    const bodyAngle =
      deg(-16) * Math.sin(Math.PI * smoothstep(0, 0.5, s)) +
      deg(22) * smoothstep(0.4, 0.85, s) * (1 - smoothstep(0.92, 1, s)) +
      deg(6) * crouch;

    const near = hindFoot(s, 0, SIT_NEAR.x, height);
    const far = hindFoot(s, 0.03, SIT_FAR.x, height);

    // The ears lag: swept back by the jump, then thrown forward.
    const swing =
      deg(-30) * Math.sin(Math.PI * smoothstep(0, 0.6, s)) +
      deg(24) * Math.sin(Math.PI * smoothstep(0.6, 1, s)) +
      deg(-8) * crouch;

    return {
      kind: 'rabbit',
      pose: {
        hip: { x: 0, y: -HIP_HEIGHT + 10 * squash - height },
        bodyAngle,
        headAngle: -bodyAngle * 0.5 + deg(6) * crouch,
        earNearAngle: EAR_NEAR + swing,
        earFarAngle: EAR_FAR + swing * 0.85,
        pawNear: frontPaw(s, 0, PAW_NEAR.x, height),
        pawFar: frontPaw(s, 0.04, PAW_FAR.x, height),
        footNear: near.at,
        footFar: far.at,
        footNearAngle: near.angle,
        footFarAngle: far.angle,
      },
      face: quietFace(blinkAt(t, BLINKS)),
      travel: LENGTH * (k + s),
    };
  },
};
