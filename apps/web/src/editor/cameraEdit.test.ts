import type { Background, CameraMove, Scene } from '@toonhouse/model';
import { cameraAt, cameraBounds } from '@toonhouse/renderer';
import { describe, expect, it } from 'vitest';

import testHills from '../../../../assets/fixtures/backgrounds/test-hills/background.json';
import {
  addCameraMove,
  canAddCameraMove,
  dragCameraMove,
  newCameraMove,
  panCamera,
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

  it('keeps a move from getting too short', () => {
    expect(move(dragCameraMove(s, 'b', 'end', 3), 'b').length).toBe(0.1);
  });
});

describe('camera views', () => {
  it('sets the start view or the view of an entry', () => {
    const s = setCameraView(scene([{ id: 'j', t: 1, to: close }]), null, {
      x: 700,
      y: 500,
      zoom: 1.5,
    });
    expect(cameraAt(s, bg, 0)).toEqual({ x: 700, y: 500, zoom: 1.5 });
    const t = setCameraView(s, 'j', { x: 800, y: 450, zoom: 2 });
    expect(cameraAt(t, bg, 2)).toEqual({ x: 800, y: 450, zoom: 2 });
  });

  it('resets the start view with a new background', () => {
    const s = setCameraView(scene([]), null, close);
    expect(withBackground(s, 'x').camera?.start).toBeUndefined();
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
