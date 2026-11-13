import type { Clip, RabbitFrame } from '@toonhouse/model';

import { blinkAt } from '../../face.ts';
import { add, deg, easeInOut, easeOutBack, rotate } from '../../math.ts';
import {
  breath,
  earFlick,
  quietFace,
  settle,
  SHOULDER,
  sitting,
} from './body.ts';

const DURATION = 4.2;
const RISE = 0.5;
const UP = 0.85;
const DROP = 3.1;
const DOWN = 3.45;
/** How far the body tips back to sit up. */
const TIP = deg(-52);
const BLINKS = [2.05];

/** Where the head looks while up, in jerks: up, ahead, down, ahead again. */
const LOOKS: readonly [number, number][] = [
  [1.15, deg(-14)],
  [1.7, deg(4)],
  [2.25, deg(12)],
  [2.7, 0],
];

function look(t: number) {
  let a = 0;
  let prev = 0;
  for (const [at, angle] of LOOKS) {
    a += (angle - prev) * easeInOut((t - at) / 0.15);
    prev = angle;
  }
  return a;
}

/**
 * Sitting up on the hind legs to look around: the body rises with an
 * overshoot, the front paws hang in front of the chest, the ears stand up and
 * turn to listen, and the rabbit drops back down with a bounce.
 */
export const lookout: Clip<RabbitFrame> = {
  id: 'lookout',
  kind: 'rabbit',
  duration: DURATION,
  loops: true,
  frameAt(t) {
    const pose = sitting(breath(t, DURATION, 3));
    const up =
      easeOutBack((t - RISE) / (UP - RISE)) *
      (1 - easeInOut((t - DROP) / (DOWN - DROP)));
    const bounce = settle(t, DOWN, DURATION, 3, 6);
    pose.bodyAngle = TIP * up + deg(4) * bounce;
    pose.hip.y += -30 * up + 6 * bounce;
    // The head stays near level, and looks around while up.
    pose.headAngle = -pose.bodyAngle * 0.75 + look(t) * up;
    // The paws hang from the shoulders, tucked in against the chest.
    const shoulder = add(pose.hip, rotate(SHOULDER, pose.bodyAngle));
    const hang = { x: 18, y: 62 };
    pose.pawNear = {
      x: pose.pawNear.x + (shoulder.x + hang.x - pose.pawNear.x) * up,
      y: (shoulder.y + hang.y) * up,
    };
    pose.pawFar = {
      x: pose.pawFar.x + (shoulder.x + hang.x - 14 - pose.pawFar.x) * up,
      y: (shoulder.y + hang.y + 4) * up,
    };
    // The ears stand up straight against the ground, and one turns to listen.
    const head = pose.bodyAngle + pose.headAngle;
    pose.earNearAngle +=
      (-head + deg(8)) * up + earFlick(t, 1.9, DURATION, deg(-30));
    pose.earFarAngle +=
      (-head - deg(4)) * up + earFlick(t, 2.4, DURATION, deg(20));
    return {
      kind: 'rabbit',
      pose,
      face: quietFace(blinkAt(t, BLINKS)),
      travel: 0,
    };
  },
};
