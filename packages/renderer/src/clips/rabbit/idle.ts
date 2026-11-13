import type { Clip, RabbitFrame } from '@toonhouse/model';

import { blinkAt } from '../../face.ts';
import { deg, smoothstep } from '../../math.ts';
import { breath, earFlick, quietFace, sitting } from './body.ts';

const DURATION = 4;
const BLINKS = [1.1, 3.2];
/** Three quick sniffs, a nod of the head each. */
const SNIFFS = [0.4, 0.55, 0.7, 2.3, 2.45, 2.6];

/**
 * Sitting and sniffing the air: the head nods in quick little sniffs, an ear
 * flicks now and then, and the head turns to look up for a moment.
 */
export const idle: Clip<RabbitFrame> = {
  id: 'idle',
  kind: 'rabbit',
  duration: DURATION,
  loops: true,
  frameAt(t) {
    const pose = sitting(breath(t, DURATION, 3));
    let sniff = 0;
    for (const at of SNIFFS) {
      sniff +=
        smoothstep(at, at + 0.05, t) *
        (1 - smoothstep(at + 0.05, at + 0.13, t));
    }
    // A look up between the sniffs, and back.
    const look = smoothstep(1.3, 1.5, t) * (1 - smoothstep(2.0, 2.25, t));
    pose.headAngle = deg(-3) * sniff + deg(-12) * look;
    pose.bodyAngle = deg(-3) * look;
    pose.earNearAngle += earFlick(t, 0.9, DURATION) + deg(-6) * look;
    pose.earFarAngle += earFlick(t, 3.0, DURATION, deg(18)) + deg(-4) * look;
    return {
      kind: 'rabbit',
      pose,
      face: quietFace(blinkAt(t, BLINKS)),
      travel: 0,
    };
  },
};
