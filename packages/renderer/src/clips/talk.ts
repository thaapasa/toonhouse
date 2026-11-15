import type { Clip, CutoutFrame } from '@toonhouse/model';

import { blinkAt, talking } from '../face.ts';
import { clamp01, deg, smoothstep } from '../math.ts';
import { breath, standing } from './body.ts';

const DURATION = 3;
const BLINKS = [1.9];
const TALK_START = 0.2;
const TALK_END = 2.7;

/**
 * Talking while standing. The head nods along and the near hand makes a small
 * gesture.
 */
export const talk: Clip<CutoutFrame> = {
  id: 'talk',
  kind: 'cutout',
  duration: DURATION,
  loops: true,
  frameAt(t) {
    const pose = standing(breath(t, DURATION, 2));
    const cycle = (t / DURATION) * 2 * Math.PI;
    pose.headAngle =
      deg(-2) * Math.sin(2 * cycle) + deg(1.5) * Math.sin(3 * cycle);
    // The near hand comes forward and up a little, once per clip.
    const gesture = (1 - Math.cos(cycle)) / 2;
    pose.handNear = {
      x: pose.handNear.x + 34 * gesture,
      y: pose.handNear.y - 26 * gesture,
    };
    pose.handNearAngle = deg(-20) * gesture;
    const fade =
      smoothstep(TALK_START, TALK_START + 0.08, t) *
      (1 - smoothstep(TALK_END - 0.08, TALK_END, t));
    // Before and after the words, the face rests.
    const speaking = t >= TALK_START && t < TALK_END;
    return {
      kind: 'cutout',
      pose,
      face: {
        talking: speaking,
        open: speaking ? clamp01(talking(t) * fade) : 0,
        blink: blinkAt(t, BLINKS),
      },
      travel: 0,
    };
  },
};
