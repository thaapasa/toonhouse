import type { CameraEasing } from './cartoon.ts';

/** The preset skies. The renderer has their colors for the day, dusk and night. */
export const SKY_PRESET_IDS = ['blue', 'peach', 'pale', 'lilac'] as const;

export type SkyPresetId = (typeof SKY_PRESET_IDS)[number];

/**
 * What a scene shows behind all layers of its background. The colors are CSS
 * hex colors, such as `#94d4f4`. A gradient goes from `top` to `bottom`, and
 * a single color has the same color at both ends.
 */
export type Sky =
  | { kind: 'preset'; id: SkyPresetId }
  | { kind: 'gradient'; top: string; bottom: string }
  | { kind: 'space' };

/**
 * The sky and the time of day of a scene. The time of day is in hours, and
 * it doesn't wrap: 30 is 6 in the morning of the next day.
 */
export interface SceneSky {
  /** The sky, the default sky of the background if not set. */
  look?: Sky;
  /**
   * Whether the scene has the sun, the moon and the stars, and gets darker at
   * night. True if not set.
   */
  sun?: boolean;
  /** The time of day at the start of the scene, 12 if not set. */
  start?: number;
  /** The changes of the time of day. They don't overlap, and the order doesn't matter. */
  changes: TimeChange[];
}

/**
 * A change of the time of day: from the time where the scene is at `t` to
 * `to`, over `length` seconds.
 */
export interface TimeChange {
  /** Unique within the scene. */
  id: string;
  /** When the change starts, in seconds from the start of the scene. */
  t: number;
  length: number;
  /** The time of day at the end, in hours. */
  to: number;
  /** `ease-in-out` if not set. */
  easing?: CameraEasing;
}

/**
 * The weather at one moment. `wind` goes from -1 to 1, and a negative wind
 * blows to the left. The others go from 0 to 1.
 */
export interface WeatherState {
  /** How many clouds there are. */
  clouds: number;
  /** How dark the clouds are, from white to storm gray. */
  cloudDark: number;
  wind: number;
  rain: number;
  snow: number;
  mist: number;
}

/** The weather of a scene. */
export interface SceneWeather {
  /** The weather at the start. Each value that it leaves out is fair weather. */
  start?: Partial<WeatherState>;
  /** The changes of the weather. They don't overlap, and the order doesn't matter. */
  changes: WeatherChange[];
}

/**
 * A change of the weather over `length` seconds from `t`. It eases each value
 * that it names from where the scene is to the value in `to`, and leaves the
 * other values as they are.
 */
export interface WeatherChange {
  /** Unique within the scene. */
  id: string;
  /** When the change starts, in seconds from the start of the scene. */
  t: number;
  length: number;
  to: Partial<WeatherState>;
  /** `ease-in-out` if not set. */
  easing?: CameraEasing;
}
