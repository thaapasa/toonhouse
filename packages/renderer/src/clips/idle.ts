import type { Clip, CutoutFrame } from '@toonhouse/model';

import { blinkAt } from '../face.ts';
import { deg } from '../math.ts';
import { breath, restingFace, standing } from './body.ts';

const DURATION = 4;
const BLINKS = [1.3, 3.1];

/** Standing and breathing, with a slow sway of the head. */
export const idle: Clip<CutoutFrame> = {
  id: 'idle',
  kind: 'cutout',
  duration: DURATION,
  loops: true,
  frameAt(t) {
    const pose = standing(breath(t, DURATION, 2));
    pose.headAngle = deg(1.5) * Math.sin((t / DURATION) * 2 * Math.PI);
    return {
      kind: 'cutout',
      pose,
      face: restingFace(blinkAt(t, BLINKS)),
      travel: 0,
    };
  },
};
