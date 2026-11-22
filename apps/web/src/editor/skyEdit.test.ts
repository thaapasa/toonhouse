import type { Scene, TimeChange, WeatherChange } from '@toonhouse/model';
import { skyStateAt, weatherAt } from '@toonhouse/renderer';
import { describe, expect, it } from 'vitest';

import { newScene } from './sceneEdit.ts';
import {
  addChange,
  canAddChange,
  changeHolder,
  clockOf,
  dragChange,
  newTimeChange,
  newWeatherChange,
  nextScene,
  removeChange,
  setSkyLook,
  setStartHour,
  setStartWeather,
  setTimeTarget,
  setWeatherTarget,
  weatherAtChange,
} from './skyEdit.ts';

const scene = (
  time: TimeChange[] = [],
  weather: WeatherChange[] = [],
): Scene => ({
  id: 's',
  background: 'test-hills',
  actors: [],
  sky: { start: 10, changes: time },
  weather: { changes: weather },
});

describe('new changes', () => {
  it('starts a time change at the playhead, 3 hours after the time of the scene there', () => {
    const s = scene([{ id: 'a', t: 1, length: 2, to: 22 }]);
    expect(newTimeChange(s, 'b', 4)).toEqual({
      id: 'b',
      t: 4,
      length: 2,
      to: 25,
    });
    expect(newTimeChange(scene(), 'b', 0)).toMatchObject({ to: 13 });
  });

  it('keeps the target of a new time change inside the saved hours', () => {
    const s: Scene = { ...scene(), sky: { start: 99_999, changes: [] } };
    expect(newTimeChange(s, 'b', 0)).toMatchObject({ to: 100_000 });
  });

  it('starts a weather change that sets nothing yet', () => {
    expect(newWeatherChange(scene(), 'w', 3)).toEqual({
      id: 'w',
      t: 3,
      length: 2,
      to: {},
    });
  });

  it('fits before the next change and not inside one', () => {
    const s = scene([{ id: 'a', t: 4, length: 2, to: 20 }]);
    expect(newTimeChange(s, 'b', 3)!.length).toBe(1);
    expect(newTimeChange(s, 'b', 5)).toBeNull();
    expect(canAddChange(s, 'time', 5)).toBe(false);
    expect(canAddChange(s, 'time', 3.95)).toBe(false);
    expect(canAddChange(s, 'time', 6)).toBe(true);
    // The rows don't share their room.
    expect(canAddChange(s, 'weather', 5)).toBe(true);
  });

  it('adds and removes a change', () => {
    const c = newWeatherChange(scene(), 'w', 1)!;
    const s = addChange(scene(), 'weather', c);
    expect(s.weather!.changes).toEqual([c]);
    expect(removeChange(s, 'weather', 'w').weather!.changes).toEqual([]);
  });
});

describe('dragging a change', () => {
  const s = scene([
    { id: 'a', t: 1, length: 2, to: 20 },
    { id: 'b', t: 5, length: 2, to: 30 },
  ]);
  const change = (x: Scene, id: string) =>
    x.sky!.changes.find((c) => c.id === id)!;

  it('stops at the change beside it', () => {
    expect(change(dragChange(s, 'time', 'a', 'block', 4.5), 'a')).toMatchObject(
      { t: 3, length: 2 },
    );
    expect(change(dragChange(s, 'time', 'b', 'start', 0), 'b')).toMatchObject({
      t: 3,
      length: 4,
    });
    expect(change(dragChange(s, 'time', 'a', 'end', 9), 'a')).toMatchObject({
      t: 1,
      length: 4,
    });
  });

  it('leaves the scene as it is for a change that is gone', () => {
    expect(dragChange(s, 'time', 'x', 'block', 2)).toBe(s);
  });
});

describe('the change at the playhead', () => {
  const changes: TimeChange[] = [
    { id: 'a', t: 1, length: 2, to: 20 },
    { id: 'b', t: 5, length: 2, to: 30 },
  ];

  it('holds the start values before the first change and at its start', () => {
    expect(changeHolder(changes, 0.5).change).toBeNull();
    expect(changeHolder(changes, 1).change).toBeNull();
  });

  it('holds a change while it plays and after it', () => {
    expect(changeHolder(changes, 2)).toMatchObject({
      change: { id: 'a' },
      moving: true,
    });
    expect(changeHolder(changes, 4)).toMatchObject({
      change: { id: 'a' },
      moving: false,
    });
    expect(changeHolder(changes, 9).change?.id).toBe('b');
  });
});

describe('the start values and the targets', () => {
  it('keeps the values inside their ranges', () => {
    let s = setStartWeather(scene(), 'wind', -3);
    s = setStartWeather(s, 'rain', 0.456);
    expect(s.weather!.start).toEqual({ wind: -1, rain: 0.46 });
    expect(setStartHour(scene(), -2).sky!.start).toBe(0);
  });

  it('sets the time of a change, past midnight too', () => {
    const s = scene([{ id: 'a', t: 1, length: 2, to: 20 }]);
    expect(setTimeTarget(s, 'a', 30).sky!.changes[0]!.to).toBe(30);
  });

  it('adds a weather value at where the scene is, and removes it', () => {
    const c: WeatherChange = { id: 'w', t: 4, length: 2, to: {} };
    let s = scene([], [{ id: 'v', t: 0, length: 2, to: { rain: 0.8 } }, c]);
    const v = weatherAtChange(s, c, 'rain');
    expect(v).toBe(0.8);
    s = setWeatherTarget(s, 'w', 'rain', v);
    s = setWeatherTarget(s, 'w', 'snow', 0.5);
    expect(s.weather!.changes[1]!.to).toEqual({ rain: 0.8, snow: 0.5 });
    s = setWeatherTarget(s, 'w', 'rain', undefined);
    expect(s.weather!.changes[1]!.to).toEqual({ snow: 0.5 });
  });

  it('goes back to the sky of the background', () => {
    const s = setSkyLook(scene(), { kind: 'space' });
    expect(s.sky!.look).toEqual({ kind: 'space' });
    expect(setSkyLook(s, undefined).sky).not.toHaveProperty('look');
  });
});

describe('a new scene', () => {
  it('gets a random seed', () => {
    const a = newScene();
    const b = newScene();
    expect(Number.isInteger(a.seed)).toBe(true);
    expect(a.seed).toBeGreaterThanOrEqual(0);
    expect(a.seed).toBeLessThanOrEqual(0xffff_ffff);
    expect(a.seed).not.toBe(b.seed);
    expect(nextScene(undefined, 0).seed).toBeTypeOf('number');
  });

  it('starts as the scene before it ends', () => {
    const prev: Scene = {
      ...scene(
        [{ id: 'a', t: 1, length: 2, to: 30 }],
        [{ id: 'w', t: 0, length: 2, to: { rain: 0.7, clouds: 0.9 } }],
      ),
      sky: {
        look: { kind: 'preset', id: 'lilac' },
        sun: false,
        start: 10,
        changes: [{ id: 'a', t: 1, length: 2, to: 30 }],
      },
    };
    const next = nextScene(prev, 5);
    expect(next.id).not.toBe(prev.id);
    expect(next.sky).toEqual({
      look: { kind: 'preset', id: 'lilac' },
      sun: false,
      start: 6,
      changes: [],
    });
    expect(next.weather).toEqual({
      start: { rain: 0.7, clouds: 0.9 },
      changes: [],
    });
    expect(weatherAt(next, 0)).toEqual(weatherAt(prev, 5));
    expect(skyStateAt(next, 0).hour).toBe(skyStateAt(prev, 5).hour - 24);
  });

  it('sets nothing after a scene with the defaults', () => {
    const next = nextScene({ id: 'p', background: null, actors: [] }, 3);
    expect(next).not.toHaveProperty('sky');
    expect(next).not.toHaveProperty('weather');
  });
});

describe('clockOf', () => {
  it('shows the time and the day', () => {
    expect(clockOf(6.5)).toEqual({ time: '06:30', day: 1 });
    expect(clockOf(30)).toEqual({ time: '06:00', day: 2 });
    expect(clockOf(23.999)).toEqual({ time: '00:00', day: 2 });
  });
});
