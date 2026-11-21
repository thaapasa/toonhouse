// Where the camera of a scene is at a time `t`. The camera holds the start
// view until the first camera move or jump. A jump shows its view at once,
// and a move goes from where the camera was to its view over its length.
// After a move, the camera holds its view until the next entry.
import type {
  Background,
  CameraEasing,
  CameraEntry,
  Matrix,
  Scene,
} from '@toonhouse/model';

import {
  type Camera,
  clampCamera,
  groundDepth,
  layerTransform,
  layerView,
  wholeBackground,
} from './background.ts';
import type { Bounds } from './draw.ts';
import { clamp01 } from './math.ts';

export const DEFAULT_EASING: CameraEasing = 'ease-in-out';

/** The easings in the order that the editor lists them. */
export const CAMERA_EASINGS: readonly CameraEasing[] = [
  'linear',
  'ease-in',
  'ease-out',
  'ease-in-out',
];

/** How far along a move is with the easing, at `u` from 0 to 1. */
export function ease(easing: CameraEasing, u: number): number {
  const c = clamp01(u);
  switch (easing) {
    case 'linear':
      return c;
    case 'ease-in':
      return c * c * c;
    case 'ease-out':
      return 1 - (1 - c) ** 3;
    case 'ease-in-out':
      return c < 0.5 ? 4 * c * c * c : 1 - (-2 * c + 2) ** 3 / 2;
  }
}

/** Whether an entry is a jump, which has no length. */
export const isJump = (m: CameraEntry) => !m.length;

/** When an entry gets to its view. A jump gets there when it starts. */
export const cameraEntryEnd = (m: CameraEntry) => m.t + (m.length ?? 0);

/**
 * The moves and the jumps in the order of their times. A jump that starts
 * with a move goes first, so that the move starts from the view of the jump.
 */
export const sortedCameraEntries = (scene: Scene): CameraEntry[] =>
  [...(scene.camera?.entries ?? [])].sort(
    (a, b) => a.t - b.t || (a.length ?? 0) - (b.length ?? 0),
  );

/** The view at the start of the scene. */
export const startView = (scene: Scene, bg: Background): Camera =>
  clampCamera(bg, scene.camera?.start ?? wholeBackground(bg));

/**
 * The view `u` of the way from `a` to `b`, from 0 to 1. The zoom grows by the
 * same factor in each step, so that a zoom from 1 to 4 doesn't seem to speed
 * up at the end. The view moves around the one point that stays in place on
 * the screen, so that a zoom into a corner keeps that corner still. Both ends
 * are inside the background, and then so is every view between them.
 */
export function cameraBetween(a: Camera, b: Camera, u: number): Camera {
  const s = b.zoom / a.zoom;
  // The views are a/zoom wide, so the view shrinks by `1 / s`.
  const k = (1 / s) ** u;
  if (Math.abs(1 - 1 / s) < 1e-6) {
    return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, zoom: a.zoom };
  }
  // The point that maps to itself from view `a` to view `b`.
  const px = (b.x - a.x / s) / (1 - 1 / s);
  const py = (b.y - a.y / s) / (1 - 1 / s);
  return {
    x: px + (a.x - px) * k,
    y: py + (a.y - py) * k,
    zoom: a.zoom * s ** u,
  };
}

/** Where the camera is at `t`. */
export function cameraAt(scene: Scene, bg: Background, t: number): Camera {
  let view = startView(scene, bg);
  for (const m of sortedCameraEntries(scene)) {
    if (t < m.t) break;
    const to = clampCamera(bg, m.to);
    const end = cameraEntryEnd(m);
    if (t >= end) {
      view = to;
      continue;
    }
    const u = ease(m.easing ?? DEFAULT_EASING, (t - m.t) / (end - m.t));
    return clampCamera(bg, cameraBetween(view, to, u));
  }
  return view;
}

/**
 * The camera entry whose view the camera holds at `t`, or null for the start
 * view. While a move plays, the camera holds no view, and `moving` is true
 * with the move as `entry`. At the first moment of a move, the camera still holds the view that
 * the move starts from.
 */
export function cameraHolder(
  scene: Scene,
  t: number,
): { entry: CameraEntry | null; moving: boolean } {
  let entry: CameraEntry | null = null;
  for (const m of sortedCameraEntries(scene)) {
    if (t < m.t || (t === m.t && !isJump(m))) break;
    if (t < cameraEntryEnd(m)) return { entry: m, moving: true };
    entry = m;
  }
  return { entry, moving: false };
}

/** The part of the ground layer that the camera shows, in frame pixels. */
export const cameraBounds = (bg: Background, camera: Camera): Bounds =>
  layerView(bg, camera, groundDepth(bg));

/** The camera that shows `bounds` on the ground layer, from `cameraBounds`. */
export function cameraFromBounds(bg: Background, bounds: Bounds): Camera {
  const d = groundDepth(bg);
  const mid = (v: number, size: number, full: number) =>
    (v + size / 2 - (1 - d) * (full / 2)) / d;
  return {
    x: mid(bounds.x, bounds.width, bg.width),
    y: mid(bounds.y, bounds.height, bg.height),
    zoom: (bg.width / bounds.width) ** (1 / d),
  };
}

/**
 * Maps the picture of the camera back onto the ground layer. The editor draws
 * the scene with it, so that the ground layer and the actors stay in place
 * while the far layers move with the camera.
 */
export function pictureToGround(bg: Background, camera: Camera): Matrix {
  const [a, b, c, d, e, f] = layerTransform(bg, camera, groundDepth(bg));
  const det = a * d - b * c;
  return [
    d / det,
    -b / det,
    -c / det,
    a / det,
    (c * f - d * e) / det,
    (b * e - a * f) / det,
  ];
}
