import { describe, expect, it } from 'vitest';

import { BACKGROUNDS, CHARACTERS, PROPS } from '../library/index.ts';
import {
  bandSize,
  clampView,
  homeView,
  insideStage,
  MAX_ZOOM,
  minZoom,
  moveView,
  stageArea,
  type StageView,
  viewRect,
  wheelAction,
} from './stageView.ts';

const bg = { ...BACKGROUNDS[0]!.background, width: 1000, height: 500 };
const area = stageArea(bg, { x: 500, y: 250 });
const { stage } = area;

describe('bandSize', () => {
  it('fits the largest character or prop outside the frame', () => {
    const real = BACKGROUNDS[0]!.background;
    const band = bandSize(real, [...CHARACTERS, ...PROPS]);
    const characters = bandSize(real, CHARACTERS);
    expect(band.x).toBeGreaterThanOrEqual(characters.x);
    expect(band.y).toBeGreaterThanOrEqual(characters.y);
    expect(characters.y).toBeGreaterThan(real.height * 0.08);
  });

  it('is never narrower than the margin of the home view', () => {
    expect(bandSize(bg, [])).toEqual({ x: 120, y: 40 });
  });
});

describe('stageArea', () => {
  it('puts the band on every side of the frame', () => {
    expect(stage).toEqual({ x: -500, y: -250, width: 2000, height: 1000 });
  });

  it('shows the frame with a margin at home', () => {
    expect(viewRect(area, homeView(area))).toEqual({
      x: -120,
      y: -40,
      width: 1240,
      height: 580,
    });
  });
});

describe('clampView', () => {
  it('zooms out until the whole stage shows', () => {
    const v = clampView(area, { zoom: 0.01, x: 0, y: 0 });
    expect(v.zoom).toBe(minZoom(area));
    const r = viewRect(area, v);
    expect(r.width).toBeGreaterThanOrEqual(stage.width);
    expect(r.height).toBeCloseTo(stage.height);
  });

  it('puts the stage in the middle when zoomed out', () => {
    const v = clampView(area, { zoom: 0.01, x: 5000, y: 5000 });
    const r = viewRect(area, v);
    expect(r.x - stage.x).toBeCloseTo(stage.x + stage.width - r.x - r.width);
    expect(r.y).toBeCloseTo(stage.y);
  });

  it('keeps the view inside the stage when zoomed in', () => {
    const v = clampView(area, { zoom: 100, x: 5000, y: -5000 });
    expect(v.zoom).toBe(MAX_ZOOM);
    const r = viewRect(area, v);
    expect(r.x + r.width).toBe(stage.x + stage.width);
    expect(r.y).toBe(stage.y);
  });
});

describe('moveView', () => {
  const width = 620;
  /** The frame point under a point of the screen. */
  const frameAt = (v: StageView, p: { x: number; y: number }) => {
    const k = area.home.width / v.zoom / width;
    return { x: v.x + p.x * k, y: v.y + p.y * k };
  };

  it('zooms around the point under the pointer', () => {
    const v0 = homeView(area);
    const p = { x: 200, y: 100 };
    const v = moveView(area, v0, p, p, 2, width);
    expect(v.zoom).toBe(2);
    expect(frameAt(v, p)).toEqual(frameAt(v0, p));
  });

  it('pans with the finger', () => {
    const v0 = { zoom: 4, x: 200, y: 100 };
    const from = { x: 100, y: 100 };
    const to = { x: 150, y: 80 };
    const v = moveView(area, v0, from, to, 1, width);
    expect(frameAt(v, to)).toEqual(frameAt(v0, from));
  });

  it("doesn't pan the whole stage out of the view", () => {
    const v0 = clampView(area, { zoom: 0, x: 0, y: 0 });
    const v = moveView(area, v0, { x: 0, y: 0 }, { x: 0, y: 300 }, 1, width);
    expect(v.x).toBeCloseTo(v0.x);
    expect(v.y).toBeCloseTo(v0.y);
  });
});

describe('insideStage', () => {
  it('keeps a point inside the stage', () => {
    expect(insideStage(stage, { x: -900, y: 900 })).toEqual({
      x: -500,
      y: 750,
    });
  });

  it('lets a point that is already outside stay there', () => {
    const from = { x: -700, y: 0 };
    expect(insideStage(stage, { x: -650, y: 0 }, from)).toEqual({
      x: -650,
      y: 0,
    });
    expect(insideStage(stage, { x: -800, y: 0 }, from)).toEqual(from);
  });
});

describe('wheelAction', () => {
  const wheel = { ctrlKey: false, metaKey: false, deltaMode: 0, deltaX: 0 };

  it('zooms with a pinch and a mouse wheel', () => {
    expect(wheelAction({ ...wheel, ctrlKey: true, deltaY: 3 })).toBe('pinch');
    expect(wheelAction({ ...wheel, deltaY: 100, wheelDeltaY: -120 })).toBe(
      'zoom',
    );
    expect(wheelAction({ ...wheel, deltaMode: 1, deltaY: 3 })).toBe('zoom');
  });

  it('pans with a swipe on a trackpad', () => {
    expect(wheelAction({ ...wheel, deltaY: 12, wheelDeltaY: -36 })).toBe('pan');
    expect(wheelAction({ ...wheel, deltaX: 4, deltaY: 0 })).toBe('pan');
  });
});
