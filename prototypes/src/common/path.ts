/**
 * The walk path shared by both prototypes, in metres on the ground. x runs to
 * the right of the screen and z towards the camera. The 2D prototype uses z for
 * depth (scale and vertical offset), the 3D prototype places the character on
 * the ground plane.
 */

export const SCENE = {
  duration: 8,
  fps: 30,
  /** The character walks until this time, then stops. */
  walkEnd: 5.2,
  /** Waving starts after a short settle. */
  waveStart: 5.6,
  waveEnd: 7.4,
} as const;

export interface Vec2 {
  x: number;
  z: number;
}

// A cubic Bézier: starts at the back left, swings towards the camera and ends
// in the middle front.
const P0: Vec2 = { x: -4.2, z: -1.2 };
const P1: Vec2 = { x: -1.8, z: -1.6 };
const P2: Vec2 = { x: -0.8, z: 1.8 };
const P3: Vec2 = { x: 1.6, z: 0.8 };

function bezier(u: number): Vec2 {
  const a = (1 - u) ** 3;
  const b = 3 * (1 - u) ** 2 * u;
  const c = 3 * (1 - u) * u ** 2;
  const d = u ** 3;
  return {
    x: a * P0.x + b * P1.x + c * P2.x + d * P3.x,
    z: a * P0.z + b * P1.z + c * P2.z + d * P3.z,
  };
}

// Arc-length table so that the character walks at an even speed.
const SAMPLES = 200;
const lengths: number[] = [0];
{
  let prev = bezier(0);
  for (let i = 1; i <= SAMPLES; i++) {
    const p = bezier(i / SAMPLES);
    lengths.push(lengths[i - 1]! + Math.hypot(p.x - prev.x, p.z - prev.z));
    prev = p;
  }
}

export const PATH_LENGTH = lengths[SAMPLES]!;

function uAtDistance(s: number): number {
  const target = Math.min(Math.max(s, 0), PATH_LENGTH);
  let lo = 0;
  let hi = SAMPLES;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (lengths[mid]! < target) lo = mid;
    else hi = mid;
  }
  const span = lengths[hi]! - lengths[lo]! || 1;
  return (lo + (target - lengths[lo]!) / span) / SAMPLES;
}

/** Point on the path at distance `s` from the start. */
export function pointAt(s: number): Vec2 {
  return bezier(uAtDistance(s));
}

/** Unit direction of travel at distance `s`. */
export function directionAt(s: number): Vec2 {
  const a = pointAt(s - 0.01);
  const b = pointAt(s + 0.01);
  const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  return { x: (b.x - a.x) / len, z: (b.z - a.z) / len };
}

/**
 * Distance walked at time `t`: ease in over the first steps, constant speed,
 * then ease out into the stop at `walkEnd`.
 */
export function distanceAt(t: number): number {
  const T = SCENE.walkEnd;
  const ramp = 0.6;
  // Velocity profile: linear ramp up, flat, linear ramp down. Integrate it.
  const vmax = PATH_LENGTH / (T - ramp);
  const tc = Math.min(Math.max(t, 0), T);
  if (tc < ramp) return (vmax * tc * tc) / (2 * ramp);
  if (tc < T - ramp) return (vmax * ramp) / 2 + vmax * (tc - ramp);
  const r = T - tc;
  return PATH_LENGTH - (vmax * r * r) / (2 * ramp);
}

/** Walking speed at time `t`, in path units per second. */
export function speedAt(t: number): number {
  const h = 1 / 240;
  return (distanceAt(t + h) - distanceAt(t - h)) / (2 * h);
}
