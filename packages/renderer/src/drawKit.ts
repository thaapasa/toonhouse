// The small helpers that the drawing of each rig kind uses.
import type { Matrix, PartId, Pt, RigPart } from '@toonhouse/model';

import type { DrawNode, PathStyle, RigOutline } from './draw.ts';
import { scaling } from './math.ts';
import { layered, type SlotDrawing } from './order.ts';

/** A number for an SVG path, rounded to keep the paths short. */
export const fmt = (n: number) => Math.round(n * 100) / 100;

/** A path of straight lines through the points. */
export const line = (...pts: Pt[]) =>
  pts.map((p, i) => `${i ? 'L' : 'M'}${fmt(p.x)} ${fmt(p.y)}`).join('');

/** A path of the quadratic curve from `a` to `b` with the control point `c`. */
export const curve = (a: Pt, c: Pt, b: Pt) =>
  `M${fmt(a.x)} ${fmt(a.y)}Q${fmt(c.x)} ${fmt(c.y)} ${fmt(b.x)} ${fmt(b.y)}`;

/** One layer of a part, or its main layer without `layer`. */
export const partNode = (
  id: PartId,
  part: RigPart,
  transform: Matrix,
  layer?: string,
): DrawNode => ({
  type: 'part',
  part: id,
  ...(layer === undefined ? {} : { layer }),
  width: part.width,
  height: part.height,
  transform,
});

/** A part with all its layers, placed with one transform. */
export const partSlot = (
  id: PartId,
  part: RigPart,
  transform: Matrix,
): SlotDrawing =>
  layered(part, (layer) => [partNode(id, part, transform, layer)]);

/** A thick line with an outline: a round stroke under a narrower one. */
export const outlinedStroke = (
  d: string,
  width: number,
  color: string,
  outline: { color: string; width: number },
  style: Pick<PathStyle, 'lineJoin' | 'dash'> = {},
): DrawNode[] => [
  {
    type: 'path',
    d,
    stroke: outline.color,
    strokeWidth: width + 2 * outline.width,
    lineCap: 'round',
    ...style,
  },
  {
    type: 'path',
    d,
    stroke: color,
    strokeWidth: width,
    lineCap: 'round',
    ...style,
  },
];

/** Lines through points, one list of points for each chain of bones. */
export function rigOutline(
  pivots: Record<string, Pt>,
  chains: Pt[][],
  facing: 1 | -1,
): RigOutline {
  const flip = (p: Pt): Pt => ({ x: p.x * facing, y: p.y });
  return {
    pivots: Object.entries(pivots).map(([name, at]) => ({
      name,
      at: flip(at),
    })),
    bones: chains.map((chain) => chain.map(flip)),
  };
}

/** The ground shadow and the character, turned to face either way. */
export function placed(
  shadow: { rx: number; ry: number } | undefined,
  facing: 1 | -1,
  children: DrawNode[],
): DrawNode {
  const under: DrawNode[] = shadow
    ? [
        {
          type: 'ellipse',
          cx: 0,
          cy: 0,
          rx: shadow.rx,
          ry: shadow.ry,
          fill: '#000',
          opacity: 0.18,
        },
      ]
    : [];
  return {
    type: 'group',
    children: [
      ...under,
      { type: 'group', transform: scaling(facing, 1), children },
    ],
  };
}
