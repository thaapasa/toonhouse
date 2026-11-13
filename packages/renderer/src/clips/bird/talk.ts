import type { BirdFrame, Clip } from '@toonhouse/model';

import { blinkAt, talking } from '../../face.ts';
import { clamp01, deg, smoothstep } from '../../math.ts';
import { breath, HEAD, standing } from './body.ts';

const DURATION = 3;
const BLINKS = [1.6];
const TALK_START = 0.2;
const TALK_END = 2.7;

/**
 * Clucking: the beak opens and closes, and the head jerks forward a little
 * with each sound, as a hen's does.
 */
export const talk: Clip<BirdFrame> = {
  id: 'talk',
  kind: 'bird',
  duration: DURATION,
  loops: true,
  frameAt(t) {
    const pose = standing(breath(t, DURATION, 2));
    const fade =
      smoothstep(TALK_START, TALK_START + 0.08, t) *
      (1 - smoothstep(TALK_END - 0.08, TALK_END, t));
    const open = clamp01(talking(t) * fade);
    const cycle = (t / DURATION) * 2 * Math.PI;
    pose.head = { x: HEAD.x + 8 * open, y: HEAD.y - 3 * open };
    pose.headAngle = deg(-6) * open + deg(3) * Math.sin(2 * cycle);
    pose.bodyAngle = deg(1.5) * Math.sin(cycle);
    return {
      kind: 'bird',
      pose,
      face: { open, blink: blinkAt(t, BLINKS) },
      travel: 0,
    };
  },
};
