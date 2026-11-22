import type { CameraEasing, Scene } from '@toonhouse/model';
import { describe, expect, it } from 'vitest';

import { random } from './random.ts';
import {
  FAIR_WEATHER,
  NOON,
  sceneSeed,
  skyStateAt,
  weatherAt,
  windDrift,
} from './sky.ts';

const scene = (more: Partial<Scene> = {}): Scene => ({
  id: 'scene-1',
  background: 'hills',
  actors: [],
  ...more,
});

describe('time of day', () => {
  it('is noon with the sun when the scene sets nothing', () => {
    expect(skyStateAt(scene(), 5)).toEqual({ hour: NOON, sun: true });
  });

  it('holds the start until a change, and eases to the target over it', () => {
    const s = scene({
      sky: {
        start: 8,
        sun: false,
        changes: [{ id: 'a', t: 2, length: 4, to: 16, easing: 'linear' }],
      },
    });
    expect(skyStateAt(s, 1)).toEqual({ hour: 8, sun: false });
    expect(skyStateAt(s, 3).hour).toBeCloseTo(10);
    expect(skyStateAt(s, 6).hour).toBe(16);
    expect(skyStateAt(s, 60).hour).toBe(16);
  });

  it('starts each change from where the one before it ended', () => {
    const s = scene({
      sky: {
        changes: [
          { id: 'b', t: 10, length: 2, to: 30, easing: 'linear' },
          { id: 'a', t: 0, length: 2, to: 20 },
        ],
      },
    });
    expect(skyStateAt(s, 5).hour).toBe(20);
    expect(skyStateAt(s, 11).hour).toBeCloseTo(25);
    // Past midnight the hours go on, to the morning of the next day.
    expect(skyStateAt(s, 12).hour).toBe(30);
  });

  it('jumps at once with a change of no length', () => {
    const s = scene({
      sky: { changes: [{ id: 'a', t: 1, length: 0, to: 3 }] },
    });
    expect(skyStateAt(s, 1).hour).toBe(3);
  });
});

describe('weather', () => {
  it('is fair weather when the scene sets nothing', () => {
    expect(weatherAt(scene(), 0)).toEqual(FAIR_WEATHER);
  });

  it('changes only the values that a change names', () => {
    const s = scene({
      weather: {
        start: { clouds: 0.5 },
        changes: [
          { id: 'a', t: 2, length: 2, to: { rain: 1 }, easing: 'linear' },
          { id: 'b', t: 6, length: 2, to: { clouds: 1, rain: 0.2 } },
        ],
      },
    });
    expect(weatherAt(s, 3)).toEqual({
      ...FAIR_WEATHER,
      clouds: 0.5,
      rain: 0.5,
    });
    expect(weatherAt(s, 5)).toEqual({ ...FAIR_WEATHER, clouds: 0.5, rain: 1 });
    const mid = weatherAt(s, 7);
    expect(mid.clouds).toBeCloseTo(0.75);
    expect(mid.rain).toBeCloseTo(0.6);
    expect(weatherAt(s, 9)).toEqual({
      ...FAIR_WEATHER,
      clouds: 1,
      rain: 0.2,
    });
  });
});

describe('wind drift', () => {
  /** The wind added up in small steps, to check the closed form against. */
  function summed(s: Scene, t: number) {
    const n = 20_000;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += weatherAt(s, ((i + 0.5) / n) * t).wind * (t / n);
    }
    return sum;
  }

  it('grows evenly with a steady wind', () => {
    expect(windDrift(scene(), 10)).toBeCloseTo(FAIR_WEATHER.wind * 10);
    expect(windDrift(scene(), 0)).toBe(0);
  });

  it('adds up the wind over the changes with each easing', () => {
    for (const easing of [
      'linear',
      'ease-in',
      'ease-out',
      'ease-in-out',
    ] as CameraEasing[]) {
      const s = scene({
        weather: {
          start: { wind: -0.5 },
          changes: [
            { id: 'a', t: 2, length: 3, to: { wind: 1 }, easing },
            { id: 'b', t: 6, length: 1, to: { clouds: 1 } },
            { id: 'c', t: 8, length: 4, to: { wind: 0 }, easing },
          ],
        },
      });
      for (const t of [1, 3, 5, 7, 9.5, 12, 20]) {
        expect(windDrift(s, t)).toBeCloseTo(summed(s, t), 4);
      }
    }
  });

  it('never goes back while the wind blows one way', () => {
    const s = scene({
      weather: {
        changes: [{ id: 'a', t: 1, length: 5, to: { wind: 1 } }],
      },
    });
    let last = -Infinity;
    for (let t = 0; t < 10; t += 0.1) {
      const d = windDrift(s, t);
      expect(d).toBeGreaterThanOrEqual(last);
      last = d;
    }
  });
});

describe('seed', () => {
  it('uses the seed of the scene, or else one from its id', () => {
    expect(sceneSeed(scene({ seed: 42 }))).toBe(42);
    const a = sceneSeed(scene({ id: 'a' }));
    expect(sceneSeed(scene({ id: 'a' }))).toBe(a);
    expect(sceneSeed(scene({ id: 'b' }))).not.toBe(a);
    expect(Number.isInteger(a)).toBe(true);
  });

  it('gives numbers in [0, 1) that differ by item and by channel', () => {
    const xs = Array.from({ length: 1000 }, (_, i) => random(7, i, 0));
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThan(1);
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(mean).toBeGreaterThan(0.45);
    expect(mean).toBeLessThan(0.55);
    expect(random(7, 3, 0)).not.toBe(random(7, 3, 1));
    expect(random(7, 3, 0)).not.toBe(random(8, 3, 0));
    expect(random(7, 3, 0)).toBe(random(7, 3, 0));
  });
});
