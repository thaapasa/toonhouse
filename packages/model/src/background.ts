import type { Pt } from './geometry.ts';

/**
 * A background: layers of SVG drawings from the far to the near, each the
 * size of the whole frame, and parts that the clips move, such as the sun.
 * The frame is 16:9, in the pixels of the background, y down. All points are
 * in these pixels.
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
  /**
   * The parts that clips move, by id. A part is drawn right after its layer,
   * in the order of this record, and it moves with the layer when the camera
   * moves. The ids of the parts and the layers must differ.
   */
  parts?: Record<string, BackgroundPart>;
}

export interface BackgroundLayer {
  /** A camelCase name, unique within the background, such as `hills`. */
  id: string;
  /** The SVG file, the size of the frame, next to the background file. */
  svg: string;
  /**
   * How much the layer moves with the camera. 0 is infinitely far away, such
   * as the sky, and does not move at all. 1 moves as much as the ground layer.
   */
  depth: number;
}

export interface BackgroundGround {
  /**
   * The id of the layer that the actors stand on. Its depth should be 1,
   * since the camera is the view of the ground layer.
   */
  layer: string;
  /** The ground line: the y of the ground points of the actors. */
  y: number;
  /**
   * The size of the actors on this background: the frame pixels for one
   * pixel of a rig, for an actor of the default size.
   */
  actorScale: number;
}

/** A drawing on a layer of a background that clips can move. */
export interface BackgroundPart {
  /**
   * The SVG file, relative to the background file. Parts that several
   * backgrounds use, such as the sun, can come from `../shared/`.
   */
  svg: string;
  width: number;
  height: number;
  /** The point of the part that is placed at `at`. */
  pivot: Pt;
  /** The layer that the part is on. */
  layer: string;
  /** Where the part is when no clip moves it. */
  at: Pt;
  /** The size of the part in the frame. 1 if not set. */
  scale?: number;
  /** The path of the part in the `day` clip, as for the sun. */
  arc?: BackgroundArc;
  /** The motion of the part in the `drift` clip, as for a cloud. */
  drift?: BackgroundDrift;
}

/**
 * A path across the sky. The part rises from `from`, goes through `top` and
 * sets at `to`, on the quadratic curve through the three points. Put `from`
 * and `to` behind a nearer layer, so that the part rises from behind it.
 */
export interface BackgroundArc {
  from: Pt;
  top: Pt;
  to: Pt;
}

/**
 * A part that moves sideways across the whole frame and comes back on the
 * other side. The renderer rounds the speed so that the part goes across a
 * whole number of times in one loop of the clip.
 */
export interface BackgroundDrift {
  /** In frame pixels a second. A negative speed moves to the left. */
  speed: number;
}
