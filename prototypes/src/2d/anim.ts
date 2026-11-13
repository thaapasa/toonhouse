// The hand-made walk and wave clips. Everything here is a pure function of `t`.
import {
  directionAt,
  distanceAt,
  PATH_LENGTH,
  pointAt,
  SCENE,
  speedAt,
  type Vec2,
} from '../common/path.ts';
import {
  clamp01,
  deg,
  easeInOut,
  easeOutBack,
  lerp,
  mix,
  type Pt,
  smoothstep,
} from './math.ts';
import type { Pose } from './rig.ts';

export const VIEW_W = 1536;
export const VIEW_H = 896;

// A cartoon perspective: things further back are smaller and higher up, but
// less so than with a real camera, so that the whole walk fits on the screen.
const GROUND_PPM = 200;
const X_CENTER = -0.85;
/** The character is drawn larger than the ground scale, to show it better. */
const CHARACTER_ZOOM = 1.55;
/** Sheet pixels per metre: the character is about 1.2 m tall. */
const SHEET_PX_PER_M = 700;

/** Screen position of a point on the ground, and the character scale there. */
export function project(p: Vec2) {
  const ppm = GROUND_PPM * (1 + 0.07 * p.z);
  return {
    x: VIEW_W / 2 + (p.x - X_CENTER) * ppm,
    y: 770 + 70 * p.z,
    scale: (ppm * CHARACTER_ZOOM) / SHEET_PX_PER_M,
  };
}

// The walk starts and ends a quarter cycle into a step, when one foot is
// planted under the body and the other passes it. Then both feet are close to
// the standing pose, and starting and stopping need little sliding.
const CYCLES = 8;
const PHASE_OFFSET = 0.25;

// The phase of the walk comes from the distance covered on the screen, in
// sheet pixels at the scale of the character at that point. Then a planted
// foot moves back as fast as the ground moves under it, and doesn't slide.
const PHASE_SAMPLES = 400;
const sheetDistance: number[] = [0];
{
  let prev = project(pointAt(0));
  for (let i = 1; i <= PHASE_SAMPLES; i++) {
    const p = project(pointAt((i / PHASE_SAMPLES) * PATH_LENGTH));
    const step =
      Math.hypot(p.x - prev.x, p.y - prev.y) / ((p.scale + prev.scale) / 2);
    sheetDistance.push(sheetDistance[i - 1]! + step);
    prev = p;
  }
}
const STRIDE_PX = sheetDistance[PHASE_SAMPLES]! / CYCLES;
/** How far a foot reaches in front of and behind the hip. */
const REACH = STRIDE_PX / 4;

function walkPhase(dist: number) {
  const f =
    (Math.min(Math.max(dist, 0), PATH_LENGTH) / PATH_LENGTH) * PHASE_SAMPLES;
  const i = Math.min(Math.floor(f), PHASE_SAMPLES - 1);
  return lerp(sheetDistance[i]!, sheetDistance[i + 1]!, f - i) / STRIDE_PX;
}

const HIP_HEIGHT = 246;
const BOB = 12;
const FOOT_LIFT = 46;
const SHOULDER_TO_HAND = 150;

export interface Frame {
  /** Position on the ground, in metres. */
  ground: Vec2;
  /** Direction of travel, used to flip the character if it walks left. */
  facing: number;
  pose: Pose;
}

interface FootPose {
  x: number;
  y: number;
  angle: number;
}

/**
 * One foot through a walk cycle. In the first half the foot is planted and
 * moves back exactly as fast as the body moves forward, so it doesn't slide.
 * In the second half it swings forward with a lift.
 */
function footCycle(q: number): FootPose {
  const u = q - Math.floor(q);
  if (u < 0.5) {
    const s = u / 0.5;
    // Heel strike: the toes come down over the first fifth of the stance.
    // Toe off: the heel rises over the last fifth.
    const heelStrike = deg(-14) * (1 - smoothstep(0, 0.22, s));
    const toeOff = deg(22) * smoothstep(0.72, 1, s);
    // Rolling onto the toes lifts the ankle.
    const lift = Math.sin(toeOff) * 70;
    return { x: lerp(REACH, -REACH, s), y: -lift, angle: heelStrike + toeOff };
  }
  const s = (u - 0.5) / 0.5;
  const e = easeInOut(s);
  return {
    x: lerp(-REACH, REACH, e),
    y:
      -Math.sin(Math.PI * s) * FOOT_LIFT -
      Math.sin(deg(22)) * 70 * (1 - smoothstep(0, 0.25, s)),
    angle: lerp(deg(22), deg(-14), smoothstep(0.1, 0.9, s)),
  };
}

const STAND_NEAR: FootPose = { x: 26, y: 0, angle: 0 };
const STAND_FAR: FootPose = { x: -22, y: 0, angle: 0 };

function mixFoot(a: FootPose, b: FootPose, u: number): FootPose {
  return {
    x: lerp(a.x, b.x, u),
    y: lerp(a.y, b.y, u),
    angle: lerp(a.angle, b.angle, u),
  };
}

/** Damped spring response to a stop at time 0, for follow-through. */
function settle(dt: number, freq: number, damping: number) {
  if (dt <= 0) return 0;
  return Math.exp(-dt * damping) * Math.sin(dt * freq * 2 * Math.PI);
}

export function frameAt(t: number): Frame {
  // Hands are placed relative to the shoulder.
  const shoulder: Pt = { x: 0, y: 0 };
  const dist = distanceAt(t);
  const ground = pointAt(dist);
  const dir = directionAt(dist);
  const vmax = PATH_LENGTH / (SCENE.walkEnd - 0.6);
  const speed = speedAt(t) / vmax;
  // 0 when standing, 1 at full walking speed.
  const walk = smoothstep(0.02, 0.55, speed);

  const q = walkPhase(dist) + PHASE_OFFSET;
  const near = mixFoot(STAND_NEAR, footCycle(q), walk);
  const far = mixFoot(STAND_FAR, footCycle(q + 0.5), walk);

  // The hips are lowest when a foot lands and highest when the legs pass.
  const stepPhase = 4 * Math.PI * q;
  const sinceStop = t - SCENE.walkEnd;
  // Breathing when idle, from t alone.
  const breath = Math.sin(t * 2 * Math.PI * 0.6) * 2.5 * (1 - walk);
  const hipY =
    -HIP_HEIGHT +
    walk * BOB * Math.cos(stepPhase) +
    // The body sinks a little as it stops and springs back.
    10 * settle(sinceStop, 1.4, 5) +
    breath;
  const hipX = walk * 4 * Math.sin(stepPhase);

  // Lean into the walk, and overshoot backwards a little after the stop.
  let torsoAngle =
    walk * (deg(7) + deg(1.5) * Math.cos(stepPhase - 0.6)) -
    deg(4) * settle(sinceStop, 1.1, 4);
  // The head lags behind the body: it bobs a moment later than the hips.
  let headAngle =
    -walk * (deg(5) + deg(3) * Math.cos(stepPhase - 1.3)) +
    deg(6) * settle(sinceStop - 0.08, 1.1, 3.5);

  // Arms swing against the legs, the hands trailing the shoulders a bit.
  const swing = walk * deg(34);
  const armPhase = 2 * Math.PI * (q - 0.06);
  const nearArm = -swing * Math.cos(armPhase);
  const farArm = swing * Math.cos(armPhase);
  const hang = (a: number, rest: number): Pt => ({
    x: shoulder.x + Math.sin(a + rest) * SHOULDER_TO_HAND,
    y: shoulder.y + Math.cos(a + rest) * SHOULDER_TO_HAND,
  });
  let handNear = hang(nearArm, deg(4));
  const handFar = hang(farArm, deg(-2));
  let handNearAngle = 0;
  let handNearOpen = 0;

  // The wave: a small dip back, then the arm shoots up with an overshoot, the
  // hand opens and waves, and the arm comes down again.
  const { waveStart, waveEnd } = SCENE;
  if (t > waveStart - 0.2 && t < waveEnd + 0.4) {
    const raised: Pt = { x: shoulder.x + 165, y: shoulder.y - 125 };
    const anticip =
      smoothstep(waveStart - 0.2, waveStart, t) *
      (1 - smoothstep(waveStart, waveStart + 0.12, t));
    const up = easeOutBack((t - waveStart) / 0.38, 2.2);
    const down = easeInOut((t - (waveEnd - 0.1)) / 0.45);
    const lift = t < waveEnd - 0.1 ? Math.max(0, up) : 1 - down;
    handNear = mix(handNear, raised, lift);
    handNear = { x: handNear.x - 18 * anticip, y: handNear.y + 14 * anticip };
    const waving =
      smoothstep(waveStart + 0.3, waveStart + 0.45, t) *
      (1 - smoothstep(waveEnd - 0.2, waveEnd, t));
    const wag = Math.sin((t - waveStart - 0.3) * 2 * Math.PI * 2.6);
    handNear = {
      x: handNear.x + 16 * wag * waving,
      y: handNear.y + 3 * Math.abs(wag) * waving,
    };
    handNearAngle = (deg(-25) + deg(22) * wag * waving) * lift;
    handNearOpen = clamp01(lift * 2.5 - 1);
    // The body leans back a bit and the head tilts with the wave.
    torsoAngle -= deg(3) * lift;
    headAngle +=
      lift *
      (deg(-6) +
        deg(3) * Math.sin((t - waveStart) * 2 * Math.PI * 1.3) * waving);
  }

  return {
    ground,
    facing: dir.x >= 0 ? 1 : -1,
    pose: {
      hip: { x: hipX, y: hipY },
      torsoAngle,
      headAngle,
      handNear,
      handFar,
      handNearAngle,
      handFarAngle: 0,
      handNearOpen,
      footNear: { x: near.x, y: near.y },
      footFar: { x: far.x, y: far.y },
      footNearAngle: near.angle,
      footFarAngle: far.angle,
    },
  };
}
