// Draws a background with the actors on it, as the camera sees it. The
// camera moves the layers of the background by their depth, so that the far
// layers move less than the near ones.
import type { Background, CameraView, Matrix } from '@toonhouse/model';

import type { Bounds, DrawNode } from './draw.ts';
import {
  clamp,
  clamp01,
  IDENTITY,
  lerp,
  multiply,
  scaling,
  translation,
} from './math.ts';
import {
  drawClouds,
  drawFalling,
  drawSky,
  mistVeil,
  nightTint,
  type SkyWeather,
} from './skyDraw.ts';

/**
 * The view of the camera on the ground layer. The view has the shape of the
 * frame, so the zoom and the middle point set it.
 */
export type Camera = CameraView;

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
  const zoom = clamp(camera.zoom, 1, MAX_ZOOM);
  const halfW = bg.width / zoom / 2;
  const halfH = bg.height / zoom / 2;
  return {
    x: clamp(camera.x, halfW, bg.width - halfW),
    y: clamp(camera.y, halfH, bg.height - halfH),
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

/** An actor to draw on the ground layer. */
export interface SceneActor {
  /** Names the parts of the actor apart from the others. See `DrawNode`. */
  id: string;
  /** The drawing of the actor, with its ground point at the origin. */
  node: DrawNode;
  /** Where the ground point is on the ground layer, in frame pixels. */
  x: number;
  y: number;
  /** The size of the actor against the default size. 1 if not set. */
  scale?: number;
  /**
   * If true, the actor keeps its size at any height, even if the background
   * has a perspective.
   */
  fixedSize?: boolean;
}

/**
 * An actor above the horizon would have no size, so that the user could
 * no longer see or select it. It keeps this part of its size instead.
 */
const MIN_PERSPECTIVE = 0.1;

/**
 * The frame pixels for one pixel of a rig, for an actor of the default size
 * whose ground point is at `y`.
 */
export function actorScaleAt(
  bg: Background,
  y: number,
  fixedSize = false,
): number {
  const { actorScale, perspective } = bg.ground;
  if (!perspective || fixedSize) return actorScale;
  const f = (y - perspective.horizon) / (perspective.y - perspective.horizon);
  return actorScale * Math.max(f, MIN_PERSPECTIVE);
}

/**
 * The height of the frame where `actorScaleAt` stops making actors smaller.
 * Between it and the bottom of the frame, the size is linear in y. Null if
 * the size is the same at every height.
 */
export function minScaleY(bg: Background): number | null {
  const { perspective } = bg.ground;
  if (!perspective) return null;
  return (
    perspective.horizon +
    MIN_PERSPECTIVE * (perspective.y - perspective.horizon)
  );
}

/**
 * The background and the actors as the camera sees them, with the sky and
 * the weather of the scene, in the pixels of the picture, which has the size
 * of the frame. The actors stand on the ground layer and are drawn right
 * after it, so the layers after the ground layer are in front of them. The
 * actors are drawn from the top of the frame to the bottom, so that an actor
 * nearer to the camera is in front of one further away. Actors at the same y
 * keep their order.
 *
 * The sky is behind all layers. Outdoors, a veil of mist goes after each
 * layer before the ground layer, so the far layers get hazier, and the rain
 * and the snow fall both right before the ground layer and in front of
 * everything. Indoors, they all go before the first layer, so that they show
 * only through the windows. The night tints everything but the sky, and the
 * bubbles, which the frame draws apart.
 */
export function drawScene(
  bg: Background,
  camera: Camera,
  actors: readonly SceneActor[],
  sky: SkyWeather,
): DrawNode {
  const { ground } = bg;
  const indoor = bg.indoor ?? false;
  // The sky and the weather are at depth 0, which the camera doesn't move.
  const atSky = layerTransform(bg, camera, 0);
  const inSky = (node: DrawNode | null): DrawNode[] =>
    node ? [{ type: 'group', transform: atSky, children: [node] }] : [];
  const groundAt = bg.layers.findIndex((l) => l.id === ground.layer);
  const tinted: DrawNode[] = inSky(drawClouds(bg, sky));
  if (indoor) {
    tinted.push(...inSky(mistVeil(bg, sky)));
    tinted.push(...inSky(drawFalling(bg, sky, 'far')));
  }
  bg.layers.forEach((layer, i) => {
    if (!indoor && i === groundAt) {
      tinted.push(...inSky(drawFalling(bg, sky, 'far')));
    }
    const nodes: DrawNode[] = [
      {
        type: 'part',
        part: layer.id,
        width: bg.width,
        height: bg.height,
        transform: IDENTITY,
      },
    ];
    if (i === groundAt) {
      const byDepth = [...actors].sort((a, b) => a.y - b.y);
      for (const a of byDepth) {
        nodes.push({
          type: 'group',
          actor: a.id,
          transform: multiply(
            translation(a.x, a.y),
            scaling(actorScaleAt(bg, a.y, a.fixedSize) * (a.scale ?? 1)),
          ),
          children: [a.node],
        });
      }
    }
    tinted.push({
      type: 'group',
      transform: layerTransform(bg, camera, layer.depth),
      children: nodes,
    });
    if (!indoor && i < groundAt) tinted.push(...inSky(mistVeil(bg, sky)));
  });
  if (!indoor) tinted.push(...inSky(drawFalling(bg, sky, 'near')));
  const tint = nightTint(sky, indoor);
  return {
    type: 'group',
    children: [
      ...inSky(drawSky(bg, sky)),
      { type: 'group', ...(tint && { tint }), children: tinted },
    ],
  };
}

/** The depth of the ground layer, which the actors move with. */
export function groundDepth(bg: Background): number {
  return bg.layers.find((l) => l.id === bg.ground.layer)?.depth ?? 1;
}
