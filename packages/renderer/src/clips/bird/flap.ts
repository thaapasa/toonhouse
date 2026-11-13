import type { BirdFrame, Clip } from '@toonhouse/model';

import { blinkAt, talking } from '../../face.ts';
import { clamp01, deg, smoothstep } from '../../math.ts';
import { breath, HEAD, settle, standing } from './body.ts';

const DURATION = 2.8;
/** The crouch before the hop, the take-off and the landing. */
const CROUCH = 0.3;
const TAKE_OFF = 0.55;
const LAND = 1.55;
const FLAP_RATE = 4;
/** Part of a beat that the downstroke takes. */
const DOWNSTROKE = 0.35;
const HOP = 70;
const BLINKS = [2.4];

/**
 * The position of a wing in a beat, from 1 at the top to -1 at the bottom.
 * The wing pushes down fast and comes up slower. `p` counts the beats.
 */
function wingBeat(p: number) {
  const u = p - Math.floor(p);
  if (u < DOWNSTROKE) return Math.cos((Math.PI * u) / DOWNSTROKE);
  return -Math.cos((Math.PI * (u - DOWNSTROKE)) / (1 - DOWNSTROKE));
}

/**
 * A flap and a hop: the bird crouches, jumps with the wings flapping and the
 * beak open in a squawk, and lands with a bounce.
 */
export const flap: Clip<BirdFrame> = {
  id: 'flap',
  kind: 'bird',
  duration: DURATION,
  loops: true,
  frameAt(t) {
    const pose = standing(breath(t, DURATION, 2));
    const crouch =
      smoothstep(CROUCH, TAKE_OFF, t) *
      (1 - smoothstep(TAKE_OFF, TAKE_OFF + 0.06, t));
    // The hop is a parabola from the take-off to the landing.
    const air = clamp01((t - TAKE_OFF) / (LAND - TAKE_OFF));
    const height = HOP * 4 * air * (1 - air);
    const bounce = settle(t, LAND, DURATION, 3, 7);
    pose.hip.y += 22 * crouch - height + 14 * bounce;
    // In the air the legs tuck up under the body.
    const tuck = Math.sin(Math.PI * air) * 30;
    pose.footNear = {
      x: pose.footNear.x - 4 * Math.sin(Math.PI * air),
      y: -height - tuck,
    };
    pose.footFar = {
      x: pose.footFar.x - 4 * Math.sin(Math.PI * air),
      y: -height - tuck,
    };
    pose.footNearAngle = deg(30) * Math.sin(Math.PI * air);
    pose.footFarAngle = deg(30) * Math.sin(Math.PI * air);

    // The wings open just before the take-off and fold after the landing.
    const open =
      smoothstep(TAKE_OFF - 0.15, TAKE_OFF - 0.05, t) *
      (1 - smoothstep(LAND + 0.1, LAND + 0.2, t));
    // The first downstroke starts just before the take-off, and the far wing
    // trails the near one a little.
    const beat = wingBeat((t - TAKE_OFF + 0.05) * FLAP_RATE);
    const farBeat = wingBeat((t - TAKE_OFF + 0.02) * FLAP_RATE);
    pose.wingNearOpen = open;
    pose.wingFarOpen = open;
    // The open wing points up and back. A turn to negative angles takes it
    // down and back, so a beat swings between the two.
    pose.wingNearAngle = open * (deg(-35) + deg(35) * beat);
    pose.wingFarAngle = deg(-4) + open * (deg(-30) + deg(35) * farBeat);

    // The body tips back in the air and the head stretches up.
    pose.bodyAngle =
      deg(-12) * Math.sin(Math.PI * air) + deg(6) * crouch + deg(4) * bounce;
    pose.head = {
      x: HEAD.x - 4 * crouch + 6 * Math.sin(Math.PI * air),
      y: HEAD.y + 10 * crouch - 12 * Math.sin(Math.PI * air),
    };
    pose.headAngle = deg(-14) * Math.sin(Math.PI * air) + deg(6) * bounce;

    const squawk =
      smoothstep(TAKE_OFF, TAKE_OFF + 0.1, t) *
      (1 - smoothstep(LAND - 0.1, LAND, t));
    return {
      kind: 'bird',
      pose,
      face: {
        open: clamp01(squawk * (0.55 + 0.45 * talking(t))),
        blink: blinkAt(t, BLINKS),
      },
      travel: 0,
    };
  },
};
