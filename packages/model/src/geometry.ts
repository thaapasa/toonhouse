/** A point or a vector in 2D, y down. */
export interface Pt {
  x: number;
  y: number;
}

/**
 * A 2D affine transform, as in SVG and canvas: `[a, b, c, d, e, f]` maps
 * (x, y) to (a x + c y + e, b x + d y + f).
 */
export type Matrix = readonly [number, number, number, number, number, number];
