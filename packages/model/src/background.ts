import type { Pt } from './geometry.ts';
import type { Sky } from './sky.ts';

/**
 * A background: layers of SVG drawings from the far to the near, each the
 * size of the whole frame. The frame is 16:9, in the pixels of the
 * background, y down. All points are in these pixels. The sky and the weather
 * belong to the scene, and the renderer draws them behind and between the
 * layers.
 *
 * A background is not a rig. It has no bones and no ground point of its own,
 * and the camera moves its layers by their depth instead.
 */
export interface Background {
  width: number;
  height: number;
  /** From the far to the near, which is also the draw order. */
  layers: BackgroundLayer[];
  /** Where the other actors stand. */
  ground: BackgroundGround;
  /** The sky of a scene on the background that doesn't pick its own. */
  sky?: Sky;
  /**
   * The path of the sun and the moon across the sky. The sky doesn't move
   * with the camera, so this is in the pixels of the picture. Without it,
   * they rise from the bottom of the frame.
   */
  sun?: BackgroundArc;
  /**
   * A room, which shows the sky and the weather only through its windows.
   * The windows are holes in the layers. Indoors the scene gets less dark at
   * night, as the room has lights.
   */
  indoor?: boolean;
}

export interface BackgroundLayer {
  /** A camelCase name, unique within the background, such as `hills`. */
  id: string;
  /** The SVG file, the size of the frame, next to the background file. */
  svg: string;
  /**
   * How much the layer moves with the camera. 0 is infinitely far away and
   * does not move at all. 1 moves as much as the ground layer.
   */
  depth: number;
}

export interface BackgroundGround {
  /**
   * The id of the layer that the actors stand on. Its depth should be 1,
   * since the camera is the view of the ground layer.
   */
  layer: string;
  /**
   * Where the ground point of an actor goes when the user adds it without
   * picking a place. The actors can stand anywhere on the ground layer.
   */
  start: Pt;
  /**
   * The size of the actors on this background: the frame pixels for one
   * pixel of a rig, for an actor of the default size. With a perspective,
   * this is the size at the y of the perspective.
   */
  actorScale: number;
  /**
   * Makes the actors smaller as they go further from the camera, toward the
   * horizon. Without it, the actors have the same size everywhere.
   */
  perspective?: GroundPerspective;
}

/**
 * The size of an actor grows evenly with the distance of its ground point
 * below the horizon, as on flat ground.
 */
export interface GroundPerspective {
  /** The y of the horizon, where an actor would have no size at all. */
  horizon: number;
  /** The y where an actor has the size `actorScale`. Below the horizon. */
  y: number;
}

/**
 * A path across the sky. The sun rises from `from`, goes through `top` and
 * sets at `to`, on the quadratic curve through the three points, and so does
 * the moon. Put `from` and `to` behind a layer, so that the sun rises from
 * behind it.
 */
export interface BackgroundArc {
  from: Pt;
  top: Pt;
  to: Pt;
}
