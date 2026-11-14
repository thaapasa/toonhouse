// Draws a background with the actors on it, as the camera sees it. The
// camera moves the layers of the background by their depth, so that the far
// layers move less than the near ones.
import type {
  Background,
  BackgroundFrame,
  BackgroundPart,
  Matrix,
  Pt,
} from '@toonhouse/model';

import type { Bounds, DrawNode } from './draw.ts';
import {
  clamp01,
  IDENTITY,
  lerp,
  multiply,
  scaling,
  translation,
} from './math.ts';

/**
 * The view of the camera on the ground layer. The view has the shape of the
 * frame, so the zoom and the middle point set it.
 */
export interface Camera {
  /** The middle of the view, in the pixels of the frame. */
  x: number;
  y: number;
  /** 1 shows the whole background, 2 a view half as wide. */
  zoom: number;
}

/** How far the camera can zoom in. */
export const MAX_ZOOM = 4;

/** The camera that shows the whole background. */
export const wholeBackground = (bg: Background): Camera => ({
  x: bg.width / 2,
  y: bg.height / 2,
  zoom: 1,
});

/**
 * The camera moved to stay inside the background: it can't zoom out further
 * than the whole background or show anything past its edges.
 */
export function clampCamera(bg: Background, camera: Camera): Camera {
  const zoom = Math.min(Math.max(camera.zoom, 1), MAX_ZOOM);
  const halfW = bg.width / zoom / 2;
  const halfH = bg.height / zoom / 2;
  return {
    x: Math.min(Math.max(camera.x, halfW), bg.width - halfW),
    y: Math.min(Math.max(camera.y, halfH), bg.height - halfH),
    zoom,
  };
}

/**
 * The part of a layer at `depth` that the camera shows, in the pixels of the
 * frame. The ground layer, at depth 1, shows the view of the camera, and a
 * layer at depth 0 always shows the whole frame.
 *
 * The zoom of a layer is `zoom ** depth`, so that each step in depth zooms
 * by the same factor, and the middle of its view moves from the middle of
 * the frame by `depth` times as much as the camera. With these, the view of
 * every layer stays inside the frame when the view of the ground layer does,
 * so only the camera needs clamping.
 */
export function layerView(
  bg: Background,
  camera: Camera,
  depth: number,
): Bounds {
  const c = clampCamera(bg, camera);
  const d = clamp01(depth);
  const zoom = c.zoom ** d;
  const width = bg.width / zoom;
  const height = bg.height / zoom;
  const x = lerp(bg.width / 2, c.x, d);
  const y = lerp(bg.height / 2, c.y, d);
  return { x: x - width / 2, y: y - height / 2, width, height };
}

/**
 * Maps the pixels of a layer at `depth` to the picture of the camera, which
 * has the size of the frame.
 */
export function layerTransform(
  bg: Background,
  camera: Camera,
  depth: number,
): Matrix {
  const v = layerView(bg, camera, depth);
  const k = bg.width / v.width;
  return multiply(scaling(k), translation(-v.x, -v.y));
}

/**
 * The point on the quadratic curve from `from` through `top` to `to`, from
 * 0 at the start to 1 at the end. The curve is at `top` halfway.
 */
export function arcPoint(arc: { from: Pt; top: Pt; to: Pt }, u: number): Pt {
  const { from, top, to } = arc;
  const c = {
    x: 2 * top.x - (from.x + to.x) / 2,
    y: 2 * top.y - (from.y + to.y) / 2,
  };
  const a = (1 - u) * (1 - u);
  const b = 2 * u * (1 - u);
  const e = u * u;
  return {
    x: a * from.x + b * c.x + e * to.x,
    y: a * from.y + b * c.y + e * to.y,
  };
}

/**
 * The x of a drifting part. It leaves the frame on one side and comes back
 * on the other, and the speed is rounded so that it goes across a whole
 * number of times in `loop` seconds.
 */
export function driftX(
  bg: Background,
  part: BackgroundPart,
  t: number,
  loop: number,
): number {
  const speed = part.drift?.speed ?? 0;
  if (speed === 0) return part.at.x;
  const scale = part.scale ?? 1;
  // How far the part reaches past its pivot, so that it goes out of sight
  // before it comes back.
  const reach = Math.max(part.pivot.x, part.width - part.pivot.x) * scale;
  const span = bg.width + 2 * reach;
  const laps = Math.round((speed * loop) / span) || Math.sign(speed);
  const x = part.at.x + reach + ((laps * span) / loop) * t;
  return (((x % span) + span) % span) - reach;
}

/** Where a part of the background is at one frame of a clip. */
export function partPosition(
  bg: Background,
  part: BackgroundPart,
  frame: BackgroundFrame,
): Pt {
  if (part.arc && frame.arc !== null) return arcPoint(part.arc, frame.arc);
  if (part.drift && frame.drift) {
    return {
      x: driftX(bg, part, frame.drift.t, frame.drift.loop),
      y: part.at.y,
    };
  }
  return part.at;
}

/** An actor to draw on the ground layer. */
export interface SceneActor {
  /** Names the parts of the actor apart from the others. See `DrawNode`. */
  id: string;
  /** The drawing of the actor, with its ground point at the origin. */
  node: DrawNode;
  /** Where the ground point is on the ground line, in frame pixels. */
  x: number;
  /** The size of the actor against the default size. 1 if not set. */
  scale?: number;
}

/**
 * The background and the actors as the camera sees them, in the pixels of
 * the picture, which has the size of the frame. The actors stand on the
 * ground line of the ground layer and are drawn right after it, so the
 * layers after the ground layer are in front of them.
 */
export function drawScene(
  bg: Background,
  frame: BackgroundFrame,
  camera: Camera,
  actors: readonly SceneActor[] = [],
): DrawNode {
  const parts = Object.entries(bg.parts ?? {});
  const { ground } = bg;
  const children = bg.layers.map((layer): DrawNode => {
    const nodes: DrawNode[] = [
      {
        type: 'part',
        part: layer.id,
        width: bg.width,
        height: bg.height,
        transform: IDENTITY,
      },
    ];
    for (const [id, p] of parts) {
      if (p.layer !== layer.id) continue;
      const at = partPosition(bg, p, frame);
      nodes.push({
        type: 'part',
        part: id,
        width: p.width,
        height: p.height,
        transform: multiply(
          translation(at.x, at.y),
          multiply(scaling(p.scale ?? 1), translation(-p.pivot.x, -p.pivot.y)),
        ),
      });
    }
    if (layer.id === ground.layer) {
      for (const a of actors) {
        nodes.push({
          type: 'group',
          actor: a.id,
          transform: multiply(
            translation(a.x, ground.y),
            scaling(ground.actorScale * (a.scale ?? 1)),
          ),
          children: [a.node],
        });
      }
    }
    return {
      type: 'group',
      transform: layerTransform(bg, camera, layer.depth),
      children: nodes,
    };
  });
  return { type: 'group', children };
}

/** The depth of the ground layer, which the actors move with. */
export function groundDepth(bg: Background): number {
  return bg.layers.find((l) => l.id === bg.ground.layer)?.depth ?? 1;
}
