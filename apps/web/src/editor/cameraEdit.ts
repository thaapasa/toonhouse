// The edits of the camera of a scene. Each view of the camera belongs to one
// time mark: the start of the scene has the start view, and each move and
// jump has the view that it goes to. A move starts from the view before it,
// so dragging the start or the end of a move changes only its speed.
import type {
  Background,
  CameraEntry,
  CameraView,
  Pt,
  Scene,
} from '@toonhouse/model';
import {
  type Bounds,
  cameraAt,
  cameraBounds,
  cameraEntryEnd,
  cameraFromBounds,
  clampCamera,
  groundDepth,
  isJump,
  MAX_ZOOM,
  sortedCameraEntries,
  startView,
} from '@toonhouse/renderer';

import { savedTime } from './sceneEdit.ts';

/** How long a new camera move is, in seconds, if there is room. */
export const NEW_MOVE_LENGTH = 2;
/** The shortest camera move, in seconds. */
export const MIN_MOVE_LENGTH = 0.1;

/**
 * The step of the times that the scene saves. Two rounded times can add up to
 * a float epsilon past a neighbor, and the renderer compares the times
 * exactly. A move that ends that epsilon after the next entry still plays at
 * the time of that entry, so the edits move such a time back by one step.
 */
const TIME_STEP = 1e-4;

/** The part of a camera move that the user drags on the timeline. */
export type CameraDrag = 'block' | 'start' | 'end';

const entriesOf = (scene: Scene) => scene.camera?.entries ?? [];

const withEntries = (scene: Scene, entries: CameraEntry[]): Scene => ({
  ...scene,
  camera: { ...scene.camera, entries },
});

/** A view rounded to what the scene saves. */
export const savedView = (v: CameraView): CameraView => ({
  x: Math.round(v.x * 10) / 10,
  y: Math.round(v.y * 10) / 10,
  zoom: Math.round(v.zoom * 1000) / 1000,
});

const sameView = (a: CameraView, b: CameraView) =>
  a.x === b.x && a.y === b.y && a.zoom === b.zoom;

/**
 * Sets the view of a move or a jump, or the start view with null. If the view
 * doesn't change, the scene stays the same object, so that a drag that the
 * camera can't follow leaves no undo step.
 */
export function setCameraView(
  scene: Scene,
  bg: Background,
  entryId: string | null,
  view: CameraView,
): Scene {
  const to = savedView(view);
  const held =
    entryId === null
      ? startView(scene, bg)
      : entriesOf(scene).find((m) => m.id === entryId)?.to;
  if (held && sameView(savedView(held), to)) return scene;
  if (entryId === null)
    return {
      ...scene,
      camera: { ...scene.camera, entries: entriesOf(scene), start: to },
    };
  return withEntries(
    scene,
    entriesOf(scene).map((m) => (m.id === entryId ? { ...m, to } : m)),
  );
}

/** The scene with the start view of the whole background. */
export function resetStartView(scene: Scene): Scene {
  if (!scene.camera?.start) return scene;
  const camera = { ...scene.camera };
  delete camera.start;
  return { ...scene, camera };
}

/** Where the entries before and after `id`, or around `t`, leave room. */
function room(scene: Scene, t: number, id: string | null) {
  let lo = 0;
  let hi = Infinity;
  for (const m of sortedCameraEntries(scene)) {
    if (m.id === id) continue;
    if (cameraEntryEnd(m) <= t) lo = Math.max(lo, cameraEntryEnd(m));
    else if (m.t >= t) hi = Math.min(hi, m.t);
    else return null;
  }
  return { lo, hi };
}

/**
 * Whether a camera jump sits at `t`. A second jump there would hide the first
 * one in the picture and on the timeline, so the user can't add one. A saved
 * time is rounded to `TIME_STEP` and the playhead to a frame, so the times of
 * the same frame can differ by less than one step.
 */
const jumpAt = (scene: Scene, t: number) =>
  entriesOf(scene).some((m) => isJump(m) && Math.abs(m.t - t) < TIME_STEP);

/**
 * A new camera move or jump at `t`, which starts at the view of the camera
 * there. Null if `t` is inside a move, a jump is already at `t`, or a move is
 * too short to fit before the next entry.
 */
export function newCameraEntry(
  scene: Scene,
  bg: Background,
  id: string,
  t: number,
  jump: boolean,
): CameraEntry | null {
  const r = room(scene, t, null);
  if (!r) return null;
  const to = savedView(cameraAt(scene, bg, t));
  if (jump) return jumpAt(scene, t) ? null : { id, t, to };
  let length = savedTime(Math.min(NEW_MOVE_LENGTH, r.hi - t));
  if (t + length > r.hi) length = savedTime(length - TIME_STEP);
  if (length < MIN_MOVE_LENGTH) return null;
  return { id, t, to, length };
}

export const addCameraEntry = (scene: Scene, entry: CameraEntry): Scene =>
  withEntries(scene, [...entriesOf(scene), entry]);

export const removeCameraEntry = (scene: Scene, id: string): Scene =>
  withEntries(
    scene,
    entriesOf(scene).filter((m) => m.id !== id),
  );

export const updateCameraEntry = (
  scene: Scene,
  id: string,
  fn: (m: CameraEntry) => CameraEntry,
): Scene =>
  withEntries(
    scene,
    entriesOf(scene).map((m) => (m.id === id ? fn(m) : m)),
  );

/**
 * The move or the jump `id` after the user drags one of its parts to `t`.
 * Dragging the block moves the whole move, and dragging the start or the end
 * moves only that end, so that the move gets faster or slower. An entry
 * stops at the entries beside it.
 */
export function dragCameraEntry(
  scene: Scene,
  id: string,
  part: CameraDrag,
  t: number,
): Scene {
  const entry = entriesOf(scene).find((m) => m.id === id);
  if (!entry) return scene;
  const sorted = sortedCameraEntries(scene);
  const i = sorted.indexOf(entry);
  const before = sorted[i - 1];
  const after = sorted[i + 1];
  const lo = before ? cameraEntryEnd(before) : 0;
  const hi = after?.t ?? Infinity;
  const length = entry.length ?? 0;
  const end = entry.t + length;
  const clamp = (v: number, a: number, b: number) =>
    Math.min(Math.max(v, a), b);
  // A start rounded below `lo` steps forward, and an end past `hi` back.
  const from = (v: number) => {
    const start = savedTime(v);
    return start < lo ? savedTime(start + TIME_STEP) : start;
  };
  const upTo = (start: number, v: number) => {
    const l = savedTime(v);
    return start + l > hi ? savedTime(l - TIME_STEP) : l;
  };
  let next: CameraEntry;
  if (part === 'block' || !entry.length) {
    let start = from(clamp(t, lo, hi - length));
    if (start + length > hi) start = savedTime(start - TIME_STEP);
    next = { ...entry, t: start };
  } else if (part === 'start') {
    const start = from(clamp(t, lo, end - MIN_MOVE_LENGTH));
    next = { ...entry, t: start, length: upTo(start, end - start) };
  } else {
    const stop = clamp(t, entry.t + MIN_MOVE_LENGTH, hi);
    next = { ...entry, length: upTo(entry.t, stop - entry.t) };
  }
  return updateCameraEntry(scene, id, () => next);
}

/** The corner of the camera view that the user drags, from the top left clockwise. */
export type Corner = 0 | 1 | 2 | 3;

const CORNERS: readonly Pt[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
];

/** The corners of a box, from the top left clockwise. */
export const cornersOf = (b: Bounds): Pt[] =>
  CORNERS.map((c) => ({ x: b.x + c.x * b.width, y: b.y + c.y * b.height }));

/**
 * The camera moved so that its box on the ground layer moves by `d`, in frame
 * pixels, inside the background. The box moves by the depth of the ground
 * layer times the move of the camera.
 */
export function panCamera(bg: Background, view: CameraView, d: Pt) {
  const k = groundDepth(bg);
  return clampCamera(bg, { ...view, x: view.x + d.x / k, y: view.y + d.y / k });
}

/**
 * The camera after the user drags `corner` of `view` to `p`. The opposite
 * corner stays in place, or with `centered` the middle stays in place. The
 * view keeps the shape of the frame, so it follows the side of the pointer
 * that is further out.
 */
export function zoomCamera(
  bg: Background,
  view: CameraView,
  corner: Corner,
  p: Pt,
  centered: boolean,
): CameraView {
  const b = cameraBounds(bg, view);
  const aspect = bg.width / bg.height;
  const c = CORNERS[corner]!;
  const anchor = centered
    ? { x: b.x + b.width / 2, y: b.y + b.height / 2 }
    : { x: b.x + (1 - c.x) * b.width, y: b.y + (1 - c.y) * b.height };
  const k = centered ? 2 : 1;
  const want = Math.max(
    Math.abs(p.x - anchor.x) * k,
    Math.abs(p.y - anchor.y) * k * aspect,
  );
  const min = cameraBounds(bg, { ...view, zoom: MAX_ZOOM }).width;
  const width = Math.min(Math.max(want, min), bg.width);
  const height = width / aspect;
  const dx = c.x === 0 ? -1 : 1;
  const dy = c.y === 0 ? -1 : 1;
  const box: Bounds = centered
    ? {
        x: anchor.x - width / 2,
        y: anchor.y - height / 2,
        width,
        height,
      }
    : {
        x: dx > 0 ? anchor.x : anchor.x - width,
        y: dy > 0 ? anchor.y : anchor.y - height,
        width,
        height,
      };
  return clampCamera(bg, cameraFromBounds(bg, box));
}

/** The scene with a new background: the start view goes back to the whole background. */
export const withBackground = (scene: Scene, id: string): Scene =>
  resetStartView({ ...scene, background: id });

/** Whether the camera at `t` can get a new move or jump. */
export const canAddCameraEntry = (scene: Scene, t: number, jump: boolean) => {
  const r = room(scene, t, null);
  if (!r) return false;
  return jump ? !jumpAt(scene, t) : r.hi - t >= MIN_MOVE_LENGTH;
};
