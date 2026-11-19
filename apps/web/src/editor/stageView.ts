// The part of the stage that the editor shows. The stage is the frame of the
// scene with a band around it, and the user zooms and pans across it. This
// view is only for editing: it doesn't change the scene or the camera.
//
// The band fits the largest actor, which can be as large as the frame itself,
// so a view of the whole stage would show the frame small. The editor opens
// at the home view instead: the frame with a thin margin. The user can zoom
// out from it to see the whole band.
import type { Background, Pt } from '@toonhouse/model';
import {
  type Bounds,
  clamp,
  drawRig,
  partBounds,
  restClip,
} from '@toonhouse/renderer';

import type { RigAsset } from '../library/index.ts';

/** How far the user can zoom in from the home view. */
export const MAX_ZOOM = 8;
/**
 * How far the home view shows past each edge of the frame, as parts of the
 * width and the height of the frame.
 */
const MARGIN = { x: 0.12, y: 0.08 };

/** Where the view is, with the stage that it moves on. */
export interface StageArea {
  /** The frame and the band around it, in the pixels of the frame. */
  stage: Bounds;
  /** What the view shows at zoom 1. The stage element has its shape. */
  home: Bounds;
}

/**
 * The zoom and the top left corner of the view, in the pixels of the frame.
 * At zoom 1 the view has the size of the home view.
 */
export interface StageView {
  zoom: number;
  x: number;
  y: number;
}

/** The box of a character or a prop in its first clip, in its own pixels. */
function rigBox(asset: RigAsset): Bounds | null {
  const kind = asset.rig.kind;
  const { node } = drawRig(asset.rig, restClip(kind).frameAt(0), {
    facing: 1,
  });
  return partBounds(node);
}

/**
 * How wide the band is on each side of the frame: the largest box of the
 * characters and props, at the size that the background gives the actors. So
 * the largest actor fits in the band whole, outside the frame. The band is
 * never narrower than the margin of the home view.
 */
export function bandSize(bg: Background, rigs: readonly RigAsset[]): Pt {
  const s = bg.ground.actorScale;
  let x = bg.width * MARGIN.x;
  let y = bg.height * MARGIN.y;
  for (const r of rigs) {
    const b = rigBox(r);
    if (!b) continue;
    x = Math.max(x, b.width * s);
    y = Math.max(y, b.height * s);
  }
  return { x: Math.ceil(x), y: Math.ceil(y) };
}

export const stageArea = (bg: Background, band: Pt): StageArea => ({
  stage: {
    x: -band.x,
    y: -band.y,
    width: bg.width + 2 * band.x,
    height: bg.height + 2 * band.y,
  },
  home: {
    x: -bg.width * MARGIN.x,
    y: -bg.height * MARGIN.y,
    width: bg.width * (1 + 2 * MARGIN.x),
    height: bg.height * (1 + 2 * MARGIN.y),
  },
});

export const homeView = ({ home }: StageArea): StageView => ({
  zoom: 1,
  x: home.x,
  y: home.y,
});

/**
 * The view of `box` with the same thin margin as the home view, such as the
 * view of the camera. `box` has the shape of the frame.
 */
export const fitView = ({ home }: StageArea, box: Bounds): StageView => {
  const width = box.width * (1 + 2 * MARGIN.x);
  return {
    zoom: home.width / width,
    x: box.x - box.width * MARGIN.x,
    y: box.y - box.height * MARGIN.y,
  };
};

/** The zoom at which the whole stage shows. */
export const minZoom = ({ stage, home }: StageArea) =>
  Math.min(1, home.width / stage.width, home.height / stage.height);

/** The part of the frame coordinates that the view shows. */
export const viewRect = ({ home }: StageArea, v: StageView): Bounds => ({
  x: v.x,
  y: v.y,
  width: home.width / v.zoom,
  height: home.height / v.zoom,
});

/**
 * Where `start` can go on one axis for a view of `size` on a stage from `lo`
 * to `hi`. A view smaller than the stage stays inside it, and a larger view
 * has the stage in its middle.
 */
function clampAxis(start: number, size: number, lo: number, hi: number) {
  if (size >= hi - lo) return (lo + hi - size) / 2;
  return clamp(start, lo, hi - size);
}

/** The view zoomed between `minZoom` and `MAX_ZOOM`, without leaving the stage. */
export function clampView(area: StageArea, v: StageView): StageView {
  const zoom = clamp(v.zoom, minZoom(area), MAX_ZOOM);
  const r = viewRect(area, { ...v, zoom });
  const { stage } = area;
  return {
    zoom,
    x: clampAxis(v.x, r.width, stage.x, stage.x + stage.width),
    y: clampAxis(v.y, r.height, stage.y, stage.y + stage.height),
  };
}

/**
 * The view after the point `from` on the screen moved to `to` and the zoom
 * grew by `ratio`, so that the point of the frame under `from` is now under
 * `to`. The points are in CSS pixels from the top left corner of the stage
 * element, which is `width` CSS pixels wide. A pinch, a drag and the wheel all
 * move the view this way.
 */
export function moveView(
  area: StageArea,
  v: StageView,
  from: Pt,
  to: Pt,
  ratio: number,
  width: number,
): StageView {
  if (width <= 0) return v;
  const zoom = clamp(v.zoom * ratio, minZoom(area), MAX_ZOOM);
  // Frame pixels for one CSS pixel, before and after.
  const k0 = area.home.width / v.zoom / width;
  const k1 = area.home.width / zoom / width;
  return clampView(area, {
    zoom,
    x: v.x + from.x * k0 - to.x * k1,
    y: v.y + from.y * k0 - to.y * k1,
  });
}

/**
 * The point inside the stage. A point that is already outside it, such as in
 * an old scene, can stay where it is but not go further out, so `from` sets
 * how far out it may be.
 */
export function insideStage(stage: Bounds, p: Pt, from?: Pt): Pt {
  const right = stage.x + stage.width;
  const bottom = stage.y + stage.height;
  const f = from ?? { x: stage.x, y: stage.y };
  return {
    x: clamp(p.x, Math.min(stage.x, f.x), Math.max(right, f.x)),
    y: clamp(p.y, Math.min(stage.y, f.y), Math.max(bottom, f.y)),
  };
}

/**
 * What a wheel event does. A pinch on a trackpad comes as a wheel with Ctrl,
 * and a swipe with two fingers as a wheel without it, just as a mouse wheel
 * does. A mouse wheel moves in lines in Firefox, and in steps of 120 in the
 * old `wheelDeltaY` of the other browsers, where a trackpad gives three times
 * its `deltaY`.
 */
export function wheelAction(e: {
  ctrlKey: boolean;
  metaKey: boolean;
  deltaMode: number;
  deltaX: number;
  deltaY: number;
  wheelDeltaY?: number | undefined;
}): 'zoom' | 'pinch' | 'pan' {
  if (e.ctrlKey || e.metaKey) return 'pinch';
  if (e.deltaMode !== 0) return 'zoom';
  if (e.deltaX !== 0) return 'pan';
  if (e.wheelDeltaY !== undefined && e.wheelDeltaY === -3 * e.deltaY)
    return 'pan';
  return 'zoom';
}
