import { SCENE, speedAt } from '../common/path.ts';

export function clamp01(x: number) {
  return Math.min(Math.max(x, 0), 1);
}

export function smoothstep(a: number, b: number, x: number) {
  const u = clamp01((x - a) / (b - a));
  return u * u * (3 - 2 * u);
}

/** Top speed on the path, in path metres per second. */
export const MAX_SPEED = speedAt(SCENE.walkEnd / 2);

/** Walk speed as a fraction of the top speed. */
export function speedFraction(t: number) {
  return clamp01(speedAt(t) / MAX_SPEED);
}

/**
 * Weight of the walk clip. When the character slows down, the walk blends
 * towards idle, which shortens the stride. Real people slow down the same way:
 * shorter steps at almost the same cadence.
 */
export function walkWeight(t: number) {
  const s = speedFraction(t);
  return Math.sqrt(s) * smoothstep(0, 0.12, s);
}

/**
 * Playback rate of the walk clip. A blended stride is about `walkWeight` times
 * as long as the full one, so the cadence has to make up the rest for the feet
 * to stay planted.
 */
export function walkRate(t: number) {
  const w = walkWeight(t);
  return w > 1e-4 ? clamp01(speedFraction(t) / w) : 0;
}

const TABLE_STEP = 1 / 240;
const rateIntegral: number[] = [0];
{
  // Trapezoid sums of walkRate from 0 to walkEnd.
  const n = Math.ceil(SCENE.walkEnd / TABLE_STEP);
  for (let i = 1; i <= n; i++) {
    const a = walkRate((i - 1) * TABLE_STEP);
    const b = walkRate(i * TABLE_STEP);
    rateIntegral.push(rateIntegral[i - 1]! + ((a + b) / 2) * TABLE_STEP);
  }
}

/** Seconds of walk clip played from the start of the scene until `t`. */
export function walkClipSeconds(t: number) {
  const x = Math.min(Math.max(t, 0), SCENE.walkEnd) / TABLE_STEP;
  const i = Math.min(Math.floor(x), rateIntegral.length - 2);
  const f = x - i;
  return rateIntegral[i]! * (1 - f) + rateIntegral[i + 1]! * f;
}

/** Weight of the wave clip: in after the settle, out after `waveEnd`. */
export function waveWeight(t: number) {
  return (
    smoothstep(SCENE.waveStart - 0.15, SCENE.waveStart + 0.25, t) *
    (1 - smoothstep(SCENE.waveEnd - 0.1, SCENE.waveEnd + 0.35, t))
  );
}

/** Shortest signed difference between two angles. */
export function angleDelta(from: number, to: number) {
  let d = (to - from) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

/**
 * Maps between the phase of a walk cycle (0…1 of the clip) and the fraction of
 * the cycle's distance walked (0…1). `advance` is how far the body moves in
 * each of n equal slices of the clip. `blend` mixes the measured distances with
 * an even spread; values below 1 smooth out noise in the measurement.
 */
export function makePhaseMap(advance: number[], blend: number) {
  const n = advance.length;
  const total = advance.reduce((a, b) => a + b, 0);
  const cum = [0];
  for (let i = 0; i < n; i++) {
    cum.push(cum[i]! + (blend * advance[i]!) / total + (1 - blend) / n);
  }
  return {
    toDistance(phase: number) {
      const x = phase * n;
      const i = Math.min(Math.floor(x), n - 1);
      return cum[i]! + (cum[i + 1]! - cum[i]!) * (x - i);
    },
    toPhase(distance: number) {
      let lo = 0;
      let hi = n;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (cum[mid]! <= distance) lo = mid;
        else hi = mid;
      }
      const span = cum[lo + 1]! - cum[lo]!;
      return (lo + (distance - cum[lo]!) / span) / n;
    },
  };
}
