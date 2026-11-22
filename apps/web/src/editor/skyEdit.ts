// The edits of the sky, the time of day and the weather of a scene. The
// changes of the time of day and of the weather are blocks on their own
// timeline rows, as the camera moves are. A change goes from where the scene
// is at its start to its target, so the user sets only the target.
import { CONTENT_LIMITS } from '@toonhouse/api';
import type {
  CameraEasing,
  Scene,
  SceneSky,
  SceneWeather,
  Sky,
  TimeChange,
  WeatherChange,
  WeatherState,
} from '@toonhouse/model';
import {
  changeEnd,
  clamp,
  dayHour,
  FAIR_WEATHER,
  NOON,
  skyStateAt,
  WEATHER_KEYS,
  weatherAt,
} from '@toonhouse/renderer';

import {
  type BlockDrag,
  blockRoom,
  dragBlock,
  MIN_BLOCK_LENGTH,
  newBlockLength,
} from './blockEdit.ts';
import { newScene } from './sceneEdit.ts';

/** The timeline rows of the sky: the time of day and the weather. */
export type SkyRow = 'time' | 'weather';

type Change = TimeChange | WeatherChange;

const skyOf = (scene: Scene): SceneSky => scene.sky ?? { changes: [] };
const weatherOf = (scene: Scene): SceneWeather =>
  scene.weather ?? { changes: [] };

/** An hour inside the limits that the server saves, to a hundredth of an hour. */
export const savedHour = (h: number) =>
  Math.round(clamp(h, CONTENT_LIMITS.hour.min, CONTENT_LIMITS.hour.max) * 100) /
  100;

/** The lowest and the highest value of a weather setting. */
export const weatherRange = (key: keyof WeatherState) =>
  key === 'wind' ? { min: -1, max: 1 } : { min: 0, max: 1 };

/** A weather value inside its range, to a hundredth. */
export function savedWeather(key: keyof WeatherState, v: number) {
  const r = weatherRange(key);
  return Math.round(clamp(v, r.min, r.max) * 100) / 100;
}

/** The scene with its own sky, or with the default sky of its background with undefined. */
export function setSkyLook(scene: Scene, look: Sky | undefined): Scene {
  const sky = { ...skyOf(scene) };
  if (look) sky.look = look;
  else delete sky.look;
  return { ...scene, sky };
}

export const setSun = (scene: Scene, sun: boolean): Scene => ({
  ...scene,
  sky: { ...skyOf(scene), sun },
});

export const setStartHour = (scene: Scene, hour: number): Scene => ({
  ...scene,
  sky: { ...skyOf(scene), start: savedHour(hour) },
});

export const setStartWeather = (
  scene: Scene,
  key: keyof WeatherState,
  v: number,
): Scene => {
  const weather = weatherOf(scene);
  return {
    ...scene,
    weather: {
      ...weather,
      start: { ...weather.start, [key]: savedWeather(key, v) },
    },
  };
};

export const withSeed = (scene: Scene, seed: number): Scene => ({
  ...scene,
  seed,
});

/** The changes of a row, in the order that the scene saves them. */
export function changesOf(scene: Scene, row: 'time'): TimeChange[];
export function changesOf(scene: Scene, row: 'weather'): WeatherChange[];
export function changesOf(scene: Scene, row: SkyRow): Change[];
export function changesOf(scene: Scene, row: SkyRow): Change[] {
  return row === 'time' ? skyOf(scene).changes : weatherOf(scene).changes;
}

function withChanges(scene: Scene, row: SkyRow, changes: Change[]): Scene {
  return row === 'time'
    ? { ...scene, sky: { ...skyOf(scene), changes: changes as TimeChange[] } }
    : {
        ...scene,
        weather: { ...weatherOf(scene), changes: changes as WeatherChange[] },
      };
}

/**
 * The change whose target the scene holds at `t`, or null for the start
 * values. While a change plays, `moving` is true with it as `change`. At the
 * first moment of a change, the scene still holds the values before it, as
 * the camera holds its view at the start of a move.
 */
export function changeHolder<T extends Change>(
  changes: readonly T[],
  t: number,
): { change: T | null; moving: boolean } {
  let change: T | null = null;
  for (const c of [...changes].sort((a, b) => a.t - b.t)) {
    if (t <= c.t) break;
    if (t < changeEnd(c)) return { change: c, moving: true };
    change = c;
  }
  return { change, moving: false };
}

/**
 * How many hours a new time change moves the sun. A change that went to the
 * time where the scene already is would do nothing until the user set it.
 */
const NEW_TIME_CHANGE_HOURS = 3;

/**
 * A new change of the time of day at `t`, which goes to `NEW_TIME_CHANGE_HOURS`
 * after the time where the scene is there. Null if `t` is inside a change or a
 * change doesn't fit before the next one.
 */
export function newTimeChange(
  scene: Scene,
  id: string,
  t: number,
): TimeChange | null {
  const length = newBlockLength(changesOf(scene, 'time'), t);
  if (length === null) return null;
  return {
    id,
    t,
    length,
    to: savedHour(skyStateAt(scene, t).hour + NEW_TIME_CHANGE_HOURS),
  };
}

/**
 * A new change of the weather at `t`. It sets no values yet, so the user adds
 * the ones to change. Null as for `newTimeChange`.
 */
export function newWeatherChange(
  scene: Scene,
  id: string,
  t: number,
): WeatherChange | null {
  const length = newBlockLength(changesOf(scene, 'weather'), t);
  return length === null ? null : { id, t, length, to: {} };
}

/** Whether the row can get a new change at `t`. */
export function canAddChange(scene: Scene, row: SkyRow, t: number) {
  const r = blockRoom(changesOf(scene, row), t, null);
  return r !== null && r.hi - t >= MIN_BLOCK_LENGTH;
}

export const addChange = (scene: Scene, row: SkyRow, change: Change): Scene =>
  withChanges(scene, row, [...changesOf(scene, row), change]);

export const removeChange = (scene: Scene, row: SkyRow, id: string): Scene =>
  withChanges(
    scene,
    row,
    changesOf(scene, row).filter((c) => c.id !== id),
  );

/** The scene after the user drags one part of the change `id` to `t`. */
export function dragChange(
  scene: Scene,
  row: SkyRow,
  id: string,
  part: BlockDrag,
  t: number,
): Scene {
  const list = changesOf(scene, row);
  if (!list.some((c) => c.id === id)) return scene;
  return withChanges(scene, row, dragBlock<Change>(list, id, part, t));
}

function updateChange<T extends Change>(
  scene: Scene,
  row: SkyRow,
  id: string,
  fn: (c: T) => T,
): Scene {
  return withChanges(
    scene,
    row,
    changesOf(scene, row).map((c) => (c.id === id ? fn(c as T) : c)),
  );
}

export const setChangeEasing = (
  scene: Scene,
  row: SkyRow,
  id: string,
  easing: CameraEasing,
): Scene => updateChange(scene, row, id, (c) => ({ ...c, easing }));

export const setTimeTarget = (scene: Scene, id: string, hour: number): Scene =>
  updateChange<TimeChange>(scene, 'time', id, (c) => ({
    ...c,
    to: savedHour(hour),
  }));

/**
 * Sets a value that the weather change `id` goes to, or with undefined
 * removes the value from the change, so that the change leaves it as it is.
 */
export function setWeatherTarget(
  scene: Scene,
  id: string,
  key: keyof WeatherState,
  v: number | undefined,
): Scene {
  return updateChange<WeatherChange>(scene, 'weather', id, (c) => {
    const to = { ...c.to };
    if (v === undefined) delete to[key];
    else to[key] = savedWeather(key, v);
    return { ...c, to };
  });
}

/**
 * The value that a weather change gets when the user adds `key` to it: the
 * value where the scene is at the start of the change, so that adding it
 * changes nothing until the user sets it.
 */
export const weatherAtChange = (
  scene: Scene,
  change: WeatherChange,
  key: keyof WeatherState,
) => savedWeather(key, weatherAt(scene, change.t)[key]);

/**
 * A new scene after `prev`, which ends at `end`. It starts with the sky, the
 * sun, the time of day and the weather that `prev` has at its end. The time
 * goes back into the first day, as it looks the same. A sky that `prev` takes
 * from its background stays unset, so the new scene gets the sky of its own
 * background.
 */
export function nextScene(prev: Scene | undefined, end: number): Scene {
  const scene = newScene();
  if (!prev) return scene;
  const { hour, sun } = skyStateAt(prev, end);
  const look = prev.sky?.look;
  const start = savedHour(dayHour(hour));
  const sky: SceneSky = {
    ...(look && { look }),
    ...(!sun && { sun }),
    ...(start !== NOON && { start }),
    changes: [],
  };
  const at = weatherAt(prev, end);
  const weather: Partial<WeatherState> = {};
  for (const k of WEATHER_KEYS) {
    const v = savedWeather(k, at[k]);
    if (v !== FAIR_WEATHER[k]) weather[k] = v;
  }
  return {
    ...scene,
    ...(Object.keys(sky).length > 1 && { sky }),
    ...(Object.keys(weather).length > 0 && {
      weather: { start: weather, changes: [] },
    }),
  };
}

/**
 * The clock time of an hour, such as `06:30`, and the day that it is on,
 * from 1 for the first day.
 */
export function clockOf(hour: number) {
  const minutes = Math.round(hour * 60);
  const m = minutes % (24 * 60);
  const pad = (v: number) => String(v).padStart(2, '0');
  return {
    time: `${pad(Math.floor(m / 60))}:${pad(m % 60)}`,
    day: Math.floor(minutes / (24 * 60)) + 1,
  };
}
