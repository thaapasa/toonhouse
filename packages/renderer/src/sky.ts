// The time of day and the weather of a scene at a time `t`. Each starts from
// the start values of the scene, and the changes on the timeline ease from
// where the scene is to their targets. The changes of one kind don't overlap,
// as the camera entries don't.
import type {
  Background,
  CameraEasing,
  Scene,
  Sky,
  TimeChange,
  WeatherChange,
  WeatherState,
} from '@toonhouse/model';

import { DEFAULT_EASING, ease, easeIntegral } from './camera.ts';
import { lerp } from './math.ts';
import { hashText } from './random.ts';

/** The time of day of a scene that doesn't set one. */
export const NOON = 12;

/** The weather of a scene that doesn't set one. */
export const FAIR_WEATHER: Readonly<WeatherState> = {
  clouds: 0.3,
  cloudDark: 0,
  wind: 0.2,
  rain: 0,
  snow: 0,
  mist: 0,
};

/** The keys of the weather values, in the order that the editor lists them. */
export const WEATHER_KEYS: readonly (keyof WeatherState)[] = [
  'clouds',
  'cloudDark',
  'wind',
  'rain',
  'snow',
  'mist',
];

/** The sky of a background that doesn't set one. */
export const DEFAULT_SKY: Sky = { kind: 'preset', id: 'blue' };

/**
 * The seed of a scene. A scene without one gets a seed from its id, and not
 * from its place in the cartoon, so that moving the scene keeps its look.
 */
export const sceneSeed = (scene: Scene): number =>
  scene.seed ?? hashText(scene.id);

/** The sky of a scene: its own, or else the default sky of its background. */
export const sceneSky = (scene: Scene, bg: Background | null): Sky =>
  scene.sky?.look ?? bg?.sky ?? DEFAULT_SKY;

/** When a change gets to its target. */
export const changeEnd = (c: { t: number; length: number }) => c.t + c.length;

const sorted = <T extends { t: number }>(list: readonly T[]): T[] =>
  [...list].sort((a, b) => a.t - b.t);

export const sortedTimeChanges = (scene: Scene): TimeChange[] =>
  sorted(scene.sky?.changes ?? []);

export const sortedWeatherChanges = (scene: Scene): WeatherChange[] =>
  sorted(scene.weather?.changes ?? []);

/** How far along a change is at `t`, eased, from 0 to 1. */
function progress(
  c: { t: number; length: number; easing?: CameraEasing },
  t: number,
): number {
  if (c.length <= 0) return 1;
  return ease(c.easing ?? DEFAULT_EASING, (t - c.t) / c.length);
}

/** The time of day and the sun of a scene at `t`. */
export interface SkyState {
  /** The time of day in hours. It doesn't wrap, so 30 is 6 in the morning. */
  hour: number;
  /** Whether the scene has the sun, the moon, the stars and the night. */
  sun: boolean;
}

/** The time of day of a scene at `t`. */
export function skyStateAt(scene: Scene, t: number): SkyState {
  let hour = scene.sky?.start ?? NOON;
  const sun = scene.sky?.sun ?? true;
  for (const c of sortedTimeChanges(scene)) {
    if (t < c.t) break;
    if (t >= changeEnd(c)) {
      hour = c.to;
      continue;
    }
    return { hour: lerp(hour, c.to, progress(c, t)), sun };
  }
  return { hour, sun };
}

/** The weather at the start of a scene. */
export const startWeather = (scene: Scene): WeatherState => ({
  ...FAIR_WEATHER,
  ...definedValues(scene.weather?.start),
});

/** The values that a partial weather sets. */
function definedValues(w: Partial<WeatherState> | undefined) {
  const out: Partial<WeatherState> = {};
  for (const k of WEATHER_KEYS) {
    const v = w?.[k];
    if (v !== undefined) out[k] = v;
  }
  return out;
}

/** `from` eased toward the values of a change, `u` of the way. */
function towards(
  from: WeatherState,
  to: Partial<WeatherState>,
  u: number,
): WeatherState {
  const out = { ...from };
  for (const [k, v] of Object.entries(definedValues(to)) as [
    keyof WeatherState,
    number,
  ][]) {
    out[k] = u >= 1 ? v : lerp(from[k], v, u);
  }
  return out;
}

/** The weather of a scene at `t`. */
export function weatherAt(scene: Scene, t: number): WeatherState {
  let w = startWeather(scene);
  for (const c of sortedWeatherChanges(scene)) {
    if (t < c.t) break;
    if (t >= changeEnd(c)) {
      w = towards(w, c.to, 1);
      continue;
    }
    return towards(w, c.to, progress(c, t));
  }
  return w;
}

/**
 * The wind of a scene added up from the start to `t`, in seconds of full
 * wind. The clouds and the snow move sideways by it, so that they don't jump
 * when the wind changes. Between the changes the wind stays the same, and
 * over a change it has a closed form, so the work grows with the number of
 * changes and not with `t`.
 */
export function windDrift(scene: Scene, t: number): number {
  let wind = startWeather(scene).wind;
  let at = 0;
  let sum = 0;
  for (const c of sortedWeatherChanges(scene)) {
    if (t <= c.t) break;
    if (c.t > at) {
      sum += wind * (c.t - at);
      at = c.t;
    }
    const to = c.to.wind;
    if (to === undefined) continue;
    const end = changeEnd(c);
    if (c.length <= 0) {
      wind = to;
      continue;
    }
    const easing = c.easing ?? DEFAULT_EASING;
    // The wind added up over the change from its start to `u` of the way.
    const over = (u: number) =>
      c.length * (wind * u + (to - wind) * easeIntegral(easing, u));
    const from = over((at - c.t) / c.length);
    if (t < end) return sum + over((t - c.t) / c.length) - from;
    sum += over(1) - from;
    wind = to;
    at = Math.max(at, end);
  }
  return sum + wind * Math.max(0, t - at);
}
