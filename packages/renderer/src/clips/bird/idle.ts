import type { BirdFrame, Clip } from '@toonhouse/model';

import { blinkAt } from '../../face.ts';
import { deg } from '../../math.ts';
import {
  breath,
  HEAD,
  type HeadKey,
  jerkyHead,
  quietFace,
  standing,
} from './body.ts';

const DURATION = 4;
const BLINKS = [0.9, 2.45];

/** Where the head looks, in jerks: ahead, up, cocked, down, back again. */
const KEYS: readonly HeadKey[] = [
  { at: 0.6, x: HEAD.x + 10, y: HEAD.y - 6, angle: deg(-10) },
  { at: 1.3, x: HEAD.x + 4, y: HEAD.y - 2, angle: deg(14) },
  { at: 1.75, x: HEAD.x + 6, y: HEAD.y, angle: deg(-4) },
  { at: 2.6, x: HEAD.x + 14, y: HEAD.y + 6, angle: deg(12) },
  { at: 3.3, x: HEAD.x, y: HEAD.y, angle: 0 },
];

/**
 * Standing and looking around. A bird's head moves in quick jerks and holds
 * still in between, and the tail sways a little with the breathing.
 */
export const idle: Clip<BirdFrame> = {
  id: 'idle',
  kind: 'bird',
  duration: DURATION,
  loops: true,
  frameAt(t) {
    const pose = standing(breath(t, DURATION, 3));
    const head = jerkyHead(t, KEYS);
    pose.head = head.at;
    pose.headAngle = head.angle;
    pose.bodyAngle = deg(1.5) * Math.sin((t / DURATION) * 2 * Math.PI);
    return {
      kind: 'bird',
      pose,
      face: quietFace(blinkAt(t, BLINKS)),
      travel: 0,
    };
  },
};
