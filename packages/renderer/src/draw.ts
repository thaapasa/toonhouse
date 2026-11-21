// Turns a rig and a clip frame into a list of things to draw. The output is
// plain data, so that the editor can draw it as SVG and export on a canvas.
import type { ClipFrame, Matrix, PartId, Pt, Rig } from '@toonhouse/model';

import { drawBird } from './bird.ts';
import { drawCutout } from './cutout.ts';
import { IDENTITY, multiply } from './math.ts';
import { drawProp } from './prop.ts';
import { drawRabbit } from './rabbit.ts';

/** A shape that clips a group. */
export type ClipShape =
  | { type: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  | { type: 'path'; d: string };

export interface PathStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  lineCap?: 'round';
  lineJoin?: 'round';
  /** Dash lengths, measured with the whole path as length 1. */
  dash?: readonly number[];
}

export type DrawNode =
  | {
      type: 'group';
      transform?: Matrix;
      /** Brightness of everything in the group, from 0 to 1. */
      shade?: number;
      /**
       * The actor that the parts in the group belong to, such as a
       * character on a background. The parts of each actor have their own
       * ids, so a drawing of several actors looks them up by actor.
       */
      actor?: string;
      clip?: ClipShape;
      children: DrawNode[];
    }
  | {
      /** A layer of a part of the rig, drawn in the pixels of the part. */
      type: 'part';
      part: PartId;
      /** The layer, if not the main layer of the part. */
      layer?: string;
      width: number;
      height: number;
      transform: Matrix;
    }
  | ({ type: 'path'; d: string } & PathStyle)
  | {
      type: 'ellipse';
      cx: number;
      cy: number;
      rx: number;
      ry: number;
      fill: string;
      opacity?: number;
    }
  | {
      /** One line of text, with `x` and `y` at the start of its baseline. */
      type: 'text';
      x: number;
      y: number;
      text: string;
      /** The CSS font family. */
      font: string;
      size: number;
      fill: string;
      bold?: boolean;
      italic?: boolean;
      /** Which point of the line `x` is at. */
      anchor: 'start' | 'middle' | 'end';
    }
  | {
      type: 'rect';
      x: number;
      y: number;
      width: number;
      height: number;
      fill: string;
    };

/** The pivot points and the bones of a drawing, for showing the rig in the studio. */
export interface RigOutline {
  pivots: { name: string; at: Pt }[];
  /** Chains of pivot points, drawn as lines. */
  bones: Pt[][];
}

export interface RigDrawing {
  node: DrawNode;
  rigOutline: RigOutline;
}

export interface DrawOptions {
  /** 1 faces right, -1 faces left. */
  facing: 1 | -1;
}

/**
 * Draws a character or a prop with its ground point at the origin, in sheet pixels,
 * y down. The frame must come from a clip for the kind of the rig.
 */
export function drawRig(
  rig: Rig,
  frame: ClipFrame,
  options: DrawOptions,
): RigDrawing {
  if (rig.kind === 'cutout' && frame.kind === 'cutout') {
    return drawCutout(rig, frame, options);
  }
  if (rig.kind === 'bird' && frame.kind === 'bird') {
    return drawBird(rig, frame, options);
  }
  if (rig.kind === 'rabbit' && frame.kind === 'rabbit') {
    return drawRabbit(rig, frame, options);
  }
  if (rig.kind === 'prop' && frame.kind === 'prop') {
    return drawProp(rig, frame, options);
  }
  throw new Error(`A ${frame.kind} clip does not work on a ${rig.kind} rig`);
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The box around the parts of a drawing, or null if it has none. The drawn
 * limbs and the shadow don't count, so this is a little smaller than what
 * shows.
 */
export function partBounds(node: DrawNode): Bounds | null {
  const xs: number[] = [];
  const ys: number[] = [];
  const visit = (n: DrawNode, m: Matrix) => {
    if (n.type === 'group') {
      const g = n.transform ? multiply(m, n.transform) : m;
      n.children.forEach((c) => visit(c, g));
    } else if (n.type === 'part') {
      const t = multiply(m, n.transform);
      for (const [x, y] of [
        [0, 0],
        [n.width, 0],
        [0, n.height],
        [n.width, n.height],
      ] as const) {
        xs.push(t[0] * x + t[2] * y + t[4]);
        ys.push(t[1] * x + t[3] * y + t[5]);
      }
    }
  };
  visit(node, IDENTITY);
  if (xs.length === 0) return null;
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}
