import type { Background, Scene } from '@toonhouse/model';
import { describe, expect, it } from 'vitest';

import testHills from '../../../assets/fixtures/backgrounds/test-hills/background.json';
import {
  actorScaleAt,
  clampCamera,
  drawScene,
  layerTransform,
  layerView,
  MAX_ZOOM,
  wholeBackground,
} from './background.ts';
import type { DrawNode } from './draw.ts';
import { skyWeatherAt } from './skyDraw.ts';

const bg = testHills as Background;

/** Where a point of a layer at `depth` shows in the picture. */
function seen(depth: number, camera: Parameters<typeof layerView>[1]) {
  const m = layerTransform(bg, camera, depth);
  return (x: number, y: number) => ({
    x: m[0] * x + m[2] * y + m[4],
    y: m[1] * x + m[3] * y + m[5],
  });
}

describe('camera', () => {
  it('shows the whole background by default', () => {
    expect(layerView(bg, wholeBackground(bg), 1)).toEqual({
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
    });
  });

  it("can't zoom out past the whole background or in past the limit", () => {
    expect(clampCamera(bg, { x: 960, y: 540, zoom: 0.5 }).zoom).toBe(1);
    expect(clampCamera(bg, { x: 960, y: 540, zoom: 99 }).zoom).toBe(MAX_ZOOM);
  });

  it("can't pan past the edges", () => {
    expect(clampCamera(bg, { x: -500, y: 5000, zoom: 2 })).toEqual({
      x: 480,
      y: 810,
      zoom: 2,
    });
    expect(clampCamera(bg, { x: 1500, y: 100, zoom: 1 })).toEqual(
      wholeBackground(bg),
    );
    const inside = { x: 1000, y: 500, zoom: 2 };
    expect(clampCamera(bg, inside)).toEqual(inside);
  });

  it('keeps the view of every layer inside the frame', () => {
    for (const zoom of [1, 1.5, 2, 4]) {
      for (const [x, y] of [
        [0, 0],
        [1920, 1080],
        [0, 1080],
        [700, 300],
      ] as const) {
        for (const depth of [0, 0.25, 0.5, 0.75, 1]) {
          const v = layerView(bg, { x, y, zoom }, depth);
          expect(v.x).toBeGreaterThanOrEqual(-1e-9);
          expect(v.y).toBeGreaterThanOrEqual(-1e-9);
          expect(v.x + v.width).toBeLessThanOrEqual(1920 + 1e-9);
          expect(v.y + v.height).toBeLessThanOrEqual(1080 + 1e-9);
        }
      }
    }
  });
});

describe('parallax', () => {
  const camera = { x: 600, y: 400, zoom: 2 };

  it('does not move a layer at depth 0', () => {
    expect(layerTransform(bg, camera, 0)).toEqual([1, 0, 0, 1, 0, 0]);
  });

  it('moves a layer at depth 1 fully with the camera', () => {
    const p = seen(1, camera);
    // The middle of the view is in the middle of the picture, twice as big.
    expect(p(600, 400)).toEqual({ x: 960, y: 540 });
    expect(p(700, 400)).toEqual({ x: 1160, y: 540 });
  });

  it('moves and zooms a layer at depth 0.5 part of the way', () => {
    const v = layerView(bg, camera, 0.5);
    expect(v.width).toBeCloseTo(1920 / Math.SQRT2, 6);
    expect(v.x + v.width / 2).toBeCloseTo(780, 6);
    expect(v.y + v.height / 2).toBeCloseTo(470, 6);
  });

  it('moves the near layers more than the far ones when the camera pans', () => {
    const shift = (depth: number) =>
      seen(depth, { x: 800, y: 540, zoom: 2 })(960, 540).x -
      seen(depth, { x: 900, y: 540, zoom: 2 })(960, 540).x;
    expect(shift(0)).toBe(0);
    expect(shift(0.5)).toBeGreaterThan(0);
    expect(shift(1)).toBeGreaterThan(shift(0.5));
    expect(shift(1)).toBeCloseTo(200, 6);
  });
});

describe('drawScene', () => {
  const scene: Scene = { id: 's', background: 'hills', actors: [] };
  const sky = skyWeatherAt(scene, bg, 0);
  const actor: DrawNode = {
    type: 'part',
    part: 'torso',
    width: 10,
    height: 10,
    transform: [1, 0, 0, 1, 0, 0],
  };

  function order(node: DrawNode): string[] {
    if (node.type === 'part') return [node.part];
    if (node.type === 'group') {
      const inner = node.children.flatMap(order);
      return node.actor ? [`actor:${node.actor}`] : inner;
    }
    return [];
  }

  it('draws the sky and the layers from far to near with the actors on the ground', () => {
    const node = drawScene(
      bg,
      wholeBackground(bg),
      [{ id: 'boy', node: actor, x: 500, y: 900 }],
      sky,
    );
    expect(order(node).filter((p) => !p.startsWith('sky-cloud'))).toEqual([
      'sky-sun',
      'hills',
      'meadow',
      'ground',
      'actor:boy',
      'grass',
    ]);
    // The clouds go between the sun and the far layers.
    const ids = order(node);
    const clouds = ids.flatMap((p, i) =>
      p.startsWith('sky-cloud') ? [i] : [],
    );
    expect(clouds.length).toBeGreaterThan(0);
    expect(Math.min(...clouds)).toBeGreaterThan(ids.indexOf('sky-sun'));
    expect(Math.max(...clouds)).toBeLessThan(ids.indexOf('hills'));
  });

  /** The actors on the ground layer, in the order that they are drawn. */
  function placed(node: DrawNode): { id: string; m: unknown }[] {
    if (node.type !== 'group') return [];
    return node.children.flatMap((c) =>
      c.type === 'group' && c.actor
        ? [{ id: c.actor, m: c.transform }]
        : placed(c),
    );
  }

  it('stands each actor at its own point, at the size of the background', () => {
    const node = drawScene(
      bg,
      wholeBackground(bg),
      [{ id: 'boy', node: actor, x: 500, y: 700, scale: 2 }],
      sky,
    );
    expect(placed(node)[0]?.m).toEqual([0.64, 0, 0, 0.64, 500, 700]);
  });

  it('draws the actors nearer to the bottom in front', () => {
    const node = drawScene(
      bg,
      wholeBackground(bg),
      [
        { id: 'near', node: actor, x: 500, y: 1000 },
        { id: 'far', node: actor, x: 500, y: 600 },
        { id: 'alsoNear', node: actor, x: 800, y: 1000 },
      ],
      sky,
    );
    expect(placed(node).map((a) => a.id)).toEqual(['far', 'near', 'alsoNear']);
  });

  describe('perspective', () => {
    const deep: Background = {
      ...bg,
      ground: { ...bg.ground, perspective: { horizon: 500, y: 900 } },
    };

    it('makes the actors smaller toward the horizon', () => {
      expect(actorScaleAt(deep, 900)).toBeCloseTo(0.32);
      expect(actorScaleAt(deep, 700)).toBeCloseTo(0.16);
      expect(actorScaleAt(deep, 1100)).toBeCloseTo(0.48);
    });

    it('keeps a tenth of the size above the horizon', () => {
      expect(actorScaleAt(deep, 300)).toBeCloseTo(0.032);
    });

    it('keeps the size of an actor with a fixed size', () => {
      expect(actorScaleAt(deep, 700, true)).toBe(0.32);
      const node = drawScene(
        deep,
        wholeBackground(deep),
        [{ id: 'boy', node: actor, x: 500, y: 700, fixedSize: true }],
        sky,
      );
      expect(placed(node)[0]?.m).toEqual([0.32, 0, 0, 0.32, 500, 700]);
    });

    it('has the same size everywhere without a perspective', () => {
      expect(actorScaleAt(bg, 100)).toBe(0.32);
    });
  });
});
