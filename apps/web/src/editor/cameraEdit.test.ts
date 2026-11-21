import type { Background, CameraMove, Scene } from '@toonhouse/model';
import { cameraAt, cameraBounds, cameraHolder } from '@toonhouse/renderer';
import { describe, expect, it } from 'vitest';

import testHills from '../../../../assets/fixtures/backgrounds/test-hills/background.json';
import {
  addCameraMove,
  canAddCameraMove,
  dragCameraMove,
  newCameraMove,
  panCamera,
  resetStartView,
  setCameraView,
  withBackground,
  zoomCamera,
} from './cameraEdit.ts';

const bg = testHills as Background;
const close = { x: 600, y: 400, zoom: 2 };

const scene = (moves: CameraMove[]): Scene => ({
  id: 's',
  background: 'test-hills',
  backgroundActions: [],
  actors: [],
  camera: { moves },
});
const move = (s: Scene, id: string) =>
  s.camera!.moves.find((m) => m.id === id)!;

describe('newCameraMove', () => {
  it('starts at the view of the camera', () => {
    const s = scene([{ id: 'j', t: 1, to: close }]);
    const m = newCameraMove(s, bg, 'm', 3, false)!;
    expect(m).toMatchObject({ t: 3, length: 2, to: close });
  });

  it('fits before the next entry', () => {
    const s = scene([{ id: 'j', t: 4, to: close }]);
    expect(newCameraMove(s, bg, 'm', 3, false)!.length).toBe(1);
  });

  it('is not possible inside a move', () => {
    const s = scene([{ id: 'm', t: 1, length: 3, to: close }]);
    expect(newCameraMove(s, bg, 'x', 2, true)).toBeNull();
    expect(canAddCameraMove(s, 2, true)).toBe(false);
    expect(canAddCameraMove(s, 4, false)).toBe(true);
  });

  it('is not possible as a jump on top of a jump', () => {
    const s = scene([{ id: 'j', t: 2, to: close }]);
    expect(newCameraMove(s, bg, 'x', 2, true)).toBeNull();
    expect(canAddCameraMove(s, 2, true)).toBe(false);
    expect(canAddCameraMove(s, 2, false)).toBe(true);
  });

  it('ends before the next entry when it fits flush', () => {
    const s = scene([{ id: 'j', t: 0.3, to: close }]);
    const m = newCameraMove(s, bg, 'm', 0.1, false)!;
    expect(m.t + m.length!).toBeLessThanOrEqual(0.3);
  });
});

describe('dragCameraMove', () => {
  const s = scene([
    { id: 'a', t: 1, length: 1, to: close },
    { id: 'b', t: 4, length: 2, to: close },
    { id: 'c', t: 8, to: close },
  ]);

  it('changes only the length when the end moves', () => {
    expect(move(dragCameraMove(s, 'b', 'end', 7), 'b')).toMatchObject({
      t: 4,
      length: 3,
    });
  });

  it('keeps the end when the start moves', () => {
    expect(move(dragCameraMove(s, 'b', 'start', 3), 'b')).toMatchObject({
      t: 3,
      length: 3,
    });
  });

  it('stops at the entries beside it', () => {
    expect(move(dragCameraMove(s, 'b', 'end', 20), 'b').length).toBe(4);
    expect(move(dragCameraMove(s, 'b', 'start', 0), 'b').t).toBe(2);
    expect(move(dragCameraMove(s, 'b', 'block', 9), 'b').t).toBe(6);
    expect(move(dragCameraMove(s, 'c', 'block', 1), 'c').t).toBe(6);
  });

  it('ends before the next entry when it stops flush against it', () => {
    // 0.2 + 0.1 is a float epsilon more than 0.3.
    const holds = (s: Scene, id: string) =>
      expect(cameraHolder(s, move(s, id).t)).toEqual({
        move: move(s, id),
        moving: false,
      });
    const block = scene([
      { id: 'm', t: 0, length: 0.1, to: close },
      { id: 'j', t: 0.3, to: close },
    ]);
    holds(dragCameraMove(block, 'm', 'block', 1), 'j');
    const end = scene([
      { id: 'm', t: 0.2, length: 0.05, to: close },
      { id: 'j', t: 0.3, to: close },
    ]);
    holds(dragCameraMove(end, 'm', 'end', 1), 'j');
    const start = scene([
      { id: 'm', t: 0.1, length: 0.2, to: close },
      { id: 'j', t: 1, to: close },
    ]);
    holds(dragCameraMove(start, 'j', 'block', 0), 'j');
  });

  it('keeps a move from getting too short', () => {
    expect(move(dragCameraMove(s, 'b', 'end', 3), 'b').length).toBe(0.1);
  });
});

describe('camera views', () => {
  it('sets the start view or the view of an entry', () => {
    const s = setCameraView(scene([{ id: 'j', t: 1, to: close }]), bg, null, {
      x: 700,
      y: 500,
      zoom: 1.5,
    });
    expect(cameraAt(s, bg, 0)).toEqual({ x: 700, y: 500, zoom: 1.5 });
    const t = setCameraView(s, bg, 'j', { x: 800, y: 450, zoom: 2 });
    expect(cameraAt(t, bg, 2)).toEqual({ x: 800, y: 450, zoom: 2 });
  });

  it('resets the start view with a new background', () => {
    const s = setCameraView(scene([]), bg, null, close);
    expect(withBackground(s, 'x').camera?.start).toBeUndefined();
  });

  it('keeps the scene when the view stays', () => {
    const s = scene([{ id: 'j', t: 1, to: close }]);
    expect(setCameraView(s, bg, 'j', close)).toBe(s);
    expect(setCameraView(s, bg, null, cameraAt(s, bg, 0))).toBe(s);
  });

  it('keeps the other fields of the camera', () => {
    const s: Scene = {
      ...scene([]),
      camera: { moves: [], extra: 1 } as NonNullable<Scene['camera']>,
    };
    const set = setCameraView(s, bg, null, close);
    expect(set.camera).toMatchObject({ extra: 1, start: close });
    expect(resetStartView(set).camera).toEqual({ moves: [], extra: 1 });
  });

  it('adds a move', () => {
    const s = addCameraMove(scene([]), { id: 'j', t: 1, to: close });
    expect(s.camera!.moves).toHaveLength(1);
  });
});

describe('panCamera', () => {
  it('stays inside the background', () => {
    const v = panCamera(bg, close, { x: -5000, y: 0 });
    expect(cameraBounds(bg, v).x).toBe(0);
  });

  it('moves the box with the pointer on a far ground layer', () => {
    const far: Background = {
      ...bg,
      layers: bg.layers.map((l) =>
        l.id === bg.ground.layer ? { ...l, depth: 0.5 } : l,
      ),
    };
    const v = panCamera(far, close, { x: 20, y: 0 });
    expect(cameraBounds(far, v).x - cameraBounds(far, close).x).toBeCloseTo(20);
  });
});

describe('zoomCamera', () => {
  const view = { x: bg.width / 2, y: bg.height / 2, zoom: 2 };
  const b = cameraBounds(bg, view);

  it('keeps the opposite corner in place', () => {
    const v = zoomCamera(bg, view, 2, { x: b.x + b.width / 2, y: 0 }, false);
    const nb = cameraBounds(bg, v);
    expect(nb.x).toBeCloseTo(b.x);
    expect(nb.y).toBeCloseTo(b.y);
    expect(v.zoom).toBeCloseTo(4);
  });

  it('keeps the middle in place when centered', () => {
    const v = zoomCamera(bg, view, 0, { x: b.x - b.width / 4, y: b.y }, true);
    expect(v.x).toBeCloseTo(view.x);
    expect(v.y).toBeCloseTo(view.y);
    expect(v.zoom).toBeCloseTo(4 / 3);
  });

  it("can't zoom out past the whole background", () => {
    const v = zoomCamera(bg, view, 2, { x: 99_999, y: 99_999 }, false);
    expect(v.zoom).toBe(1);
  });
});
