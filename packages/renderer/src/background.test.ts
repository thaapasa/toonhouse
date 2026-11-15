import type { Background, BackgroundFrame } from '@toonhouse/model';
import { describe, expect, it } from 'vitest';

import testHills from '../../../assets/fixtures/backgrounds/test-hills/background.json';
import {
  actorScaleAt,
  arcPoint,
  clampCamera,
  drawScene,
  layerTransform,
  layerView,
  MAX_ZOOM,
  partPosition,
  wholeBackground,
} from './background.ts';
import { backgroundClips, clipById } from './clips/index.ts';
import type { DrawNode } from './draw.ts';

const bg = testHills as Background;
const sun = bg.parts!.sun!;
const cloud = bg.parts!.cloudBig!;
const day = clipById('background', 'day');
const drift = clipById('background', 'drift');
const idle = clipById('background', 'idle');

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

describe('background clips', () => {
  it('moves the sun from the start through the top to the end', () => {
    const at = (t: number) => partPosition(bg, sun, day.frameAt(t));
    expect(at(0)).toEqual(sun.arc!.from);
    expect(at(day.duration / 2)).toEqual(sun.arc!.top);
    expect(at(day.duration)).toEqual(sun.arc!.to);
    const quarter = at(day.duration / 4);
    expect(quarter.x).toBeCloseTo(600, 6);
    expect(quarter.y).toBeCloseTo(307.5, 6);
    // Higher in the middle than near the ends.
    expect(at(10).y).toBeLessThan(at(2).y);
    expect(at(10).y).toBeLessThan(at(18).y);
  });

  it('keeps the sun where it rests in the other clips', () => {
    expect(partPosition(bg, sun, idle.frameAt(3))).toEqual(sun.at);
    expect(partPosition(bg, sun, drift.frameAt(30))).toEqual(sun.at);
  });

  it('puts the arc through its top halfway', () => {
    const arc = {
      from: { x: 0, y: 10 },
      top: { x: 3, y: -4 },
      to: { x: 9, y: 0 },
    };
    expect(arcPoint(arc, 0.5)).toEqual(arc.top);
  });

  it('drifts the clouds slowly and back to the start after a loop', () => {
    const x = (t: number) => partPosition(bg, cloud, drift.frameAt(t)).x;
    expect(x(0)).toBeCloseTo(cloud.at.x, 6);
    expect(x(drift.duration)).toBeCloseTo(cloud.at.x, 6);
    const speed = x(1) - x(0);
    expect(speed).toBeGreaterThan(0);
    expect(speed).toBeLessThan(40);
    // It goes out on the right and comes back on the left.
    const xs = Array.from({ length: 120 }, (_, i) => x(i));
    expect(Math.max(...xs)).toBeGreaterThan(1920);
    expect(Math.min(...xs)).toBeLessThan(0);
  });

  it('lists only the clips that move something', () => {
    expect(backgroundClips(bg).map((c) => c.id)).toEqual([
      'idle',
      'day',
      'drift',
    ]);
    const plain: Background = { ...bg, parts: {} };
    expect(backgroundClips(plain).map((c) => c.id)).toEqual(['idle']);
  });
});

describe('drawScene', () => {
  const frame: BackgroundFrame = idle.frameAt(0);
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

  it('draws the layers from far to near with the parts and actors on them', () => {
    const node = drawScene(bg, frame, wholeBackground(bg), [
      { id: 'boy', node: actor, x: 500, y: 900 },
    ]);
    expect(order(node)).toEqual([
      'sky',
      'sun',
      'cloudBig',
      'cloudSmall',
      'hills',
      'meadow',
      'ground',
      'actor:boy',
      'grass',
    ]);
  });

  /** The actors on the ground layer, in the order that they are drawn. */
  function placed(node: DrawNode, b = bg) {
    const i = b.layers.findIndex((l) => l.id === b.ground.layer);
    const ground = node.type === 'group' ? node.children[i] : undefined;
    if (ground?.type !== 'group') return [];
    return ground.children.flatMap((c) =>
      c.type === 'group' && c.actor ? [{ id: c.actor, m: c.transform }] : [],
    );
  }

  it('stands each actor at its own point, at the size of the background', () => {
    const node = drawScene(bg, frame, wholeBackground(bg), [
      { id: 'boy', node: actor, x: 500, y: 700, scale: 2 },
    ]);
    expect(placed(node)[0]?.m).toEqual([0.64, 0, 0, 0.64, 500, 700]);
  });

  it('draws the actors nearer to the bottom in front', () => {
    const node = drawScene(bg, frame, wholeBackground(bg), [
      { id: 'near', node: actor, x: 500, y: 1000 },
      { id: 'far', node: actor, x: 500, y: 600 },
      { id: 'alsoNear', node: actor, x: 800, y: 1000 },
    ]);
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
      const node = drawScene(deep, frame, wholeBackground(deep), [
        { id: 'boy', node: actor, x: 500, y: 700, fixedSize: true },
      ]);
      expect(placed(node, deep)[0]?.m).toEqual([0.32, 0, 0, 0.32, 500, 700]);
    });

    it('has the same size everywhere without a perspective', () => {
      expect(actorScaleAt(bg, 100)).toBe(0.32);
    });
  });
});
