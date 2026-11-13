import type { BirdFrame, Clip } from '@toonhouse/model';

import { blinkAt } from '../../face.ts';
import { add, deg, easeInOut, rotate, smoothstep } from '../../math.ts';
import { breath, HEAD, quietFace, settle, standing } from './body.ts';

const DURATION = 2.6;
const DOWN = 0.35;
const UP = 1.75;
const PECKS = 3;
const BLINKS = [2.3];

/** How far the body tips forward around the hips. */
const TIP = deg(75);
/** The turn of the head on the ground, against the ground, not the body. */
const HEAD_DOWN = deg(98);
/**
 * The neck stretches from the neck point towards the ground, at this angle
 * below the horizontal and as far as `REACH`, so that the beak touches the
 * ground in front of the feet.
 */
const NECK_ANGLE = deg(80);
const REACH = 28;

/**
 * Pecking at the ground: the body tips forward around the hips and the tail
 * goes up, the neck stretches down and the head stabs at the ground a few
 * times, and the bird stands up again with a little shake.
 */
export const peck: Clip<BirdFrame> = {
  id: 'peck',
  kind: 'bird',
  duration: DURATION,
  loops: true,
  frameAt(t) {
    const pose = standing(breath(t, DURATION, 2));
    const down = easeInOut((t - DOWN) / 0.25) * (1 - easeInOut((t - UP) / 0.3));
    pose.bodyAngle = TIP * down;
    pose.hip.y += 26 * down;
    // Each peck is a quick stab and a slower pull back.
    const pecking =
      smoothstep(DOWN + 0.2, DOWN + 0.3, t) * (1 - smoothstep(UP - 0.1, UP, t));
    const p = ((t - DOWN - 0.25) * PECKS) / (UP - DOWN - 0.35);
    const u = p - Math.floor(p);
    const stab = u < 0.25 ? smoothstep(0, 0.25, u) : 1 - smoothstep(0.25, 1, u);
    const pull = 40 * (1 - stab) * pecking;
    // The reach is along the ground, so turn it into the tipped body.
    const reach = rotate(
      {
        x: (REACH * down - pull) * Math.cos(NECK_ANGLE),
        y: (REACH * down - pull) * Math.sin(NECK_ANGLE),
      },
      -pose.bodyAngle,
    );
    pose.head = add(HEAD, reach);
    pose.headAngle =
      HEAD_DOWN * down - pose.bodyAngle - deg(12) * (1 - stab) * pecking;
    // The wings lift a little as the body tips, for balance.
    pose.wingNearAngle = deg(-6) * down;
    // A shake of the head after standing up.
    pose.headAngle += deg(10) * settle(t, UP + 0.25, DURATION, 5, 6);
    return {
      kind: 'bird',
      pose,
      face: quietFace(blinkAt(t, BLINKS)),
      travel: 0,
    };
  },
};
