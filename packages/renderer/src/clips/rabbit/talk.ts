import type { Clip, RabbitFrame } from '@toonhouse/model';

import { blinkAt, talking } from '../../face.ts';
import { clamp01, deg, smoothstep } from '../../math.ts';
import { breath, earFlick, sitting } from './body.ts';

const DURATION = 3;
const BLINKS = [1.4];
const TALK_START = 0.2;
const TALK_END = 2.7;

/**
 * Talking while sitting: the mouth opens and closes and shows the front
 * teeth, the head bobs with the words and an ear flicks.
 */
export const talk: Clip<RabbitFrame> = {
  id: 'talk',
  kind: 'rabbit',
  duration: DURATION,
  loops: true,
  frameAt(t) {
    const pose = sitting(breath(t, DURATION, 2));
    const fade =
      smoothstep(TALK_START, TALK_START + 0.08, t) *
      (1 - smoothstep(TALK_END - 0.08, TALK_END, t));
    const open = clamp01(talking(t) * fade);
    const cycle = (t / DURATION) * 2 * Math.PI;
    pose.headAngle = deg(-5) * open + deg(3) * Math.sin(2 * cycle);
    pose.bodyAngle = deg(-1.5) * Math.sin(cycle);
    pose.earNearAngle += deg(-3) * open + earFlick(t, 1.9, DURATION);
    pose.earFarAngle += deg(-2) * open;
    return {
      kind: 'rabbit',
      pose,
      face: { open, blink: blinkAt(t, BLINKS) },
      travel: 0,
    };
  },
};
