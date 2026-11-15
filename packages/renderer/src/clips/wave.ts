import type { Clip, CutoutFrame, Face, Pt } from '@toonhouse/model';

import { blinkAt, talking } from '../face.ts';
import {
  clamp01,
  deg,
  easeInOut,
  easeOutBack,
  mix,
  smoothstep,
} from '../math.ts';
import { breath, restingFace, standing } from './body.ts';

const DURATION = 3.2;
const START = 0.5;
const END = 2.4;
const BLINKS = [2.85];

/**
 * The wave: a small dip back, then the arm shoots up with an overshoot, the
 * hand opens and waves, and the arm comes down again. He says hello while
 * waving.
 */
export const wave: Clip<CutoutFrame> = {
  id: 'wave',
  kind: 'cutout',
  duration: DURATION,
  loops: true,
  frameAt(t) {
    const pose = standing(breath(t, DURATION, 2));
    const raised: Pt = { x: 165, y: -125 };
    const anticip =
      smoothstep(START - 0.2, START, t) *
      (1 - smoothstep(START, START + 0.12, t));
    const up = easeOutBack((t - START) / 0.38, 2.2);
    const down = easeInOut((t - (END - 0.1)) / 0.45);
    const lift = t < END - 0.1 ? Math.max(0, up) : 1 - down;
    let hand = mix(pose.handNear, raised, lift);
    hand = { x: hand.x - 18 * anticip, y: hand.y + 14 * anticip };
    const waving =
      smoothstep(START + 0.3, START + 0.45, t) *
      (1 - smoothstep(END - 0.2, END, t));
    const wag = Math.sin((t - START - 0.3) * 2 * Math.PI * 2.6);
    pose.handNear = {
      x: hand.x + 16 * wag * waving,
      y: hand.y + 3 * Math.abs(wag) * waving,
    };
    pose.handNearAngle = (deg(-25) + deg(22) * wag * waving) * lift;
    pose.handNearOpen = clamp01(lift * 2.5 - 1);
    // The body leans back a bit and the head tilts with the wave.
    pose.torsoAngle -= deg(3) * lift;
    pose.headAngle +=
      lift *
      (deg(-6) + deg(3) * Math.sin((t - START) * 2 * Math.PI * 1.3) * waving);
    return {
      kind: 'cutout',
      pose,
      face: faceAt(t),
      travel: 0,
    };
  },
};

function faceAt(t: number): Face {
  const talkStart = START + 0.7;
  const talkEnd = END - 0.3;
  const blink = blinkAt(t, BLINKS);
  if (t >= talkStart && t < talkEnd) {
    // Ease the talking in and out so the first and last frames are closed.
    const fade =
      smoothstep(talkStart, talkStart + 0.08, t) *
      (1 - smoothstep(talkEnd - 0.08, talkEnd, t));
    return { talking: true, open: clamp01(talking(t) * fade), blink };
  }
  return restingFace(blink);
}
