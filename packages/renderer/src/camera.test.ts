import type {
  Background,
  CameraEasing,
  CameraEntry,
  Scene,
} from '@toonhouse/model';
import { describe, expect, it } from 'vitest';

import testHills from '../../../assets/fixtures/backgrounds/test-hills/background.json';
import { MAX_ZOOM, wholeBackground } from './background.ts';
import {
  cameraAt,
  cameraBetween,
  cameraBounds,
  cameraHolder,
  ease,
  pictureToGround,
} from './camera.ts';
import { minSceneLength, sceneLength } from './scene.ts';

const bg = testHills as Background;
const whole = wholeBackground(bg);
const close = { x: 600, y: 400, zoom: 2 };
const corner = { x: bg.width / 4, y: bg.height / 4, zoom: 2 };

const scene = (entries: CameraEntry[], start?: Scene['camera']): Scene => ({
  id: 's',
  background: 'test-hills',
  backgroundActions: [],
  actors: [],
  camera: { ...start, entries },
});

const near = (a: { x: number; y: number; zoom: number }) => ({
  x: expect.closeTo(a.x, 6),
  y: expect.closeTo(a.y, 6),
  zoom: expect.closeTo(a.zoom, 6),
});

describe('cameraAt', () => {
  it('shows the whole background without a camera', () => {
    const s: Scene = {
      id: 's',
      background: 'test-hills',
      backgroundActions: [],
      actors: [],
    };
    expect(cameraAt(s, bg, 3)).toEqual(whole);
  });

  it('holds the start view until the first entry', () => {
    const s = scene([{ id: 'j', t: 2, to: close }], {
      start: corner,
      entries: [],
    });
    expect(cameraAt(s, bg, 0)).toEqual(corner);
    expect(cameraAt(s, bg, 1.99)).toEqual(corner);
  });

  it('jumps to the view of a jump at its time', () => {
    const s = scene([{ id: 'j', t: 2, to: close }]);
    expect(cameraAt(s, bg, 2)).toEqual(close);
    expect(cameraAt(s, bg, 9)).toEqual(close);
  });

  it('moves from the view before it to its view', () => {
    const s = scene([
      { id: 'j', t: 1, to: corner },
      { id: 'm', t: 2, length: 2, to: close, easing: 'linear' },
    ]);
    expect(cameraAt(s, bg, 2)).toEqual(near(corner));
    expect(cameraAt(s, bg, 4)).toEqual(close);
    const mid = cameraAt(s, bg, 3);
    expect(mid.x).toBeGreaterThan(corner.x);
    expect(mid.x).toBeLessThan(close.x);
  });

  it('keeps the camera inside the background', () => {
    const s = scene([
      { id: 'j', t: 0, to: { x: -500, y: 0, zoom: 9 } },
      { id: 'k', t: 1, to: { x: 9000, y: 9000, zoom: 2 } },
    ]);
    const c = cameraAt(s, bg, 0.5);
    expect(c.zoom).toBe(MAX_ZOOM);
    const b = cameraBounds(bg, c);
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.y).toBeGreaterThanOrEqual(0);
    const far = cameraBounds(bg, cameraAt(s, bg, 2));
    expect(far.x + far.width).toBeCloseTo(bg.width);
    expect(far.y + far.height).toBeCloseTo(bg.height);
  });

  it('gives the same views when the entries are out of order', () => {
    const entries: CameraEntry[] = [
      { id: 'j', t: 1, to: corner },
      { id: 'm', t: 2, length: 2, to: close, easing: 'linear' },
      { id: 'k', t: 5, to: whole },
    ];
    const sorted = scene(entries);
    const shuffled = scene([entries[2]!, entries[0]!, entries[1]!]);
    for (const t of [0, 1, 2.5, 4, 6]) {
      expect(cameraAt(shuffled, bg, t)).toEqual(cameraAt(sorted, bg, t));
      expect(cameraHolder(shuffled, t)).toEqual(cameraHolder(sorted, t));
    }
  });

  it('starts a move from the view of a jump at the same time', () => {
    const s = scene([
      { id: 'm', t: 2, length: 2, to: close, easing: 'linear' },
      { id: 'j', t: 2, to: corner },
    ]);
    expect(cameraAt(s, bg, 2)).toEqual(near(corner));
    expect(cameraAt(s, bg, 4)).toEqual(close);
    expect(cameraHolder(s, 2).entry?.id).toBe('j');
  });

  it('eases a move', () => {
    const s = (easing: CameraEasing) =>
      scene([{ id: 'm', t: 0, length: 2, to: close, easing }]);
    const early = (e: CameraEasing) => cameraAt(s(e), bg, 0.5).zoom;
    expect(early('ease-in')).toBeLessThan(early('linear'));
    expect(early('ease-out')).toBeGreaterThan(early('linear'));
  });
});

describe('cameraBetween', () => {
  it('zooms by the same factor in each step', () => {
    const a = { x: 960, y: 540, zoom: 1 };
    const b = { x: 960, y: 540, zoom: 4 };
    expect(cameraBetween(a, b, 0.5).zoom).toBeCloseTo(2);
  });

  it('keeps the corner still in a zoom into a corner', () => {
    const a = wholeBackground(bg);
    const b = { x: bg.width / 4, y: bg.height / 4, zoom: 2 };
    for (const u of [0.25, 0.5, 0.75]) {
      const v = cameraBounds(bg, cameraBetween(a, b, u));
      expect(v.x).toBeCloseTo(0);
      expect(v.y).toBeCloseTo(0);
    }
  });

  it('pans in a straight line at the same zoom', () => {
    const a = { x: 500, y: 300, zoom: 2 };
    const b = { x: 900, y: 500, zoom: 2 };
    expect(cameraBetween(a, b, 0.25)).toEqual(
      near({ x: 600, y: 350, zoom: 2 }),
    );
  });
});

describe('ease', () => {
  it('starts at 0 and ends at 1', () => {
    for (const e of ['linear', 'ease-in', 'ease-out', 'ease-in-out'] as const) {
      expect(ease(e, 0)).toBe(0);
      expect(ease(e, 1)).toBe(1);
    }
  });
});

describe('cameraHolder', () => {
  const s = scene([
    { id: 'j', t: 1, to: corner },
    { id: 'm', t: 2, length: 2, to: close },
  ]);
  it('gives the entry whose view holds', () => {
    expect(cameraHolder(s, 0.5)).toEqual({ entry: null, moving: false });
    expect(cameraHolder(s, 1).entry?.id).toBe('j');
    expect(cameraHolder(s, 2)).toMatchObject({ moving: false });
    expect(cameraHolder(s, 2).entry?.id).toBe('j');
    expect(cameraHolder(s, 1.5).entry?.id).toBe('j');
    expect(cameraHolder(s, 3)).toMatchObject({ moving: true });
    expect(cameraHolder(s, 4)).toMatchObject({ moving: false });
    expect(cameraHolder(s, 4).entry?.id).toBe('m');
  });
});

describe('pictureToGround', () => {
  it('maps the picture onto the view of the camera', () => {
    const m = pictureToGround(bg, close);
    const b = cameraBounds(bg, close);
    expect(m[4]).toBeCloseTo(b.x);
    expect(m[5]).toBeCloseTo(b.y);
    expect(m[0] * bg.width).toBeCloseTo(b.width);
  });
});

describe('scene length', () => {
  it('lasts past the end of the last camera move', () => {
    const s = scene([{ id: 'm', t: 8, length: 6, to: close }]);
    expect(sceneLength(s, bg, () => null)).toBeGreaterThanOrEqual(14);
    expect(minSceneLength(s)).toBeGreaterThan(8);
  });
});
