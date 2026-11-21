// Where the speech bubbles of a scene are at a time `t`, and how they look. An
// attached bubble is at an offset from the ground point of its actor, which
// grows and shrinks with the actor, and a free bubble stays at its place. A
// bubble stays inside the frame, and it keeps its size when its actor gets
// smaller further away.
import type { Bubble, BubbleFontId, Pt } from '@toonhouse/model';

import type { Bounds, DrawNode, RigDrawing } from '../draw.ts';
import { partBounds } from '../draw.ts';
import { clamp, easeOutBack, multiply, scaling, translation } from '../math.ts';
import {
  circle,
  hash,
  inside,
  nearestIndex,
  outline,
  pathOf,
  perimeter,
  withTail,
  wobble,
} from './shape.ts';
import { fontFamily, layoutText } from './text.ts';

/** How long a bubble takes to pop in and to pop out, in seconds. */
const POP_IN = 0.2;
const POP_OUT = 0.12;
/** How far a bubble stays from the edges of the frame, in frame pixels. */
const FRAME_MARGIN = 8;
/** A bubble shows at least this long by default, in seconds. */
const MIN_LENGTH = 2;
/** How long a default bubble shows for each word, in seconds. */
const PER_WORD = 0.4;

/** The default length of a bubble with the text: time to read it. */
export function textLength(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(MIN_LENGTH, Math.round((1 + words * PER_WORD) * 10) / 10);
}

/** How long a bubble shows, in seconds. */
export const bubbleLength = (b: Bubble) => b.length ?? textLength(b.text);

/** When a bubble disappears, in seconds from the start of the scene. */
export const bubbleEnd = (b: Bubble) => b.t + bubbleLength(b);

/** The bubbles in the order of their start times, which is the draw order. */
export const sortedBubbles = (bubbles: readonly Bubble[]) =>
  [...bubbles].sort((a, b) => a.t - b.t);

/** Where an actor is at a moment, for its attached bubbles. */
export interface BubbleAnchor {
  /** The ground point, in the pixels of the background frame. */
  at: Pt;
  /** The size of the actor on the stage, with the perspective. */
  size: number;
  /** Where the tail points by default, in frame pixels. */
  head: Pt;
}

export interface BubbleContext {
  /** The size of the background frame. */
  width: number;
  height: number;
  /** The actors that the bubbles can be attached to, by id. */
  anchors: ReadonlyMap<string, BubbleAnchor>;
  /** The font of a bubble that doesn't set one, such as from its asset pack. */
  fontOf(bubble: Bubble): BubbleFontId;
}

/** A bubble as it shows at a moment. */
export interface PlacedBubble {
  bubble: Bubble;
  /** The middle of the bubble, after it moved inside the frame. */
  center: Pt;
  /** The box around the bubble without its tail, in frame pixels. */
  box: Bounds;
  /** Where the tail points, or null without a tail. */
  tip: Pt | null;
  node: DrawNode;
}

/** The anchor of an attached bubble, or null for a free bubble. */
const anchorOf = (b: Bubble, ctx: BubbleContext) =>
  b.actorId === undefined ? null : (ctx.anchors.get(b.actorId) ?? null);

/**
 * A point of a bubble, as `at` and `tailTip` are given, in frame pixels: an
 * offset from the actor of an attached bubble, or a frame point.
 */
export function bubblePoint(p: Pt, anchor: BubbleAnchor | null): Pt {
  if (!anchor) return p;
  return {
    x: anchor.at.x + p.x * anchor.size,
    y: anchor.at.y + p.y * anchor.size,
  };
}

/** The inverse of `bubblePoint`: a frame point as an offset from the anchor. */
export function bubbleOffset(p: Pt, anchor: BubbleAnchor | null): Pt {
  if (!anchor) return p;
  return {
    x: (p.x - anchor.at.x) / anchor.size,
    y: (p.y - anchor.at.y) / anchor.size,
  };
}

/** How big a bubble is at `t`, when it pops in and out. 0 when it doesn't show. */
function popScale(b: Bubble, t: number, pop: boolean): number {
  const end = bubbleEnd(b);
  if (t < b.t || t >= end) return 0;
  if (b.pop === false || !pop) return 1;
  const len = end - b.t;
  const into = t - b.t;
  const left = end - t;
  if (into < POP_IN && into < len / 2)
    return 0.4 + 0.6 * easeOutBack(into / POP_IN);
  if (left < POP_OUT && left < len / 2) return 0.4 + 0.6 * (left / POP_OUT);
  return 1;
}

/** The point of a drawing that the tail of a bubble points at, in its own pixels. */
export function headPoint(drawing: RigDrawing): Pt {
  const pivot = (name: string) =>
    drawing.rigOutline.pivots.find((j) => j.name === name)?.at;
  const head = pivot('head');
  if (head) return head;
  const box = partBounds(drawing.node);
  const neck = pivot('neck');
  if (neck && box) return { x: neck.x, y: (neck.y + box.y) / 2 };
  if (box) return { x: box.x + box.width / 2, y: box.y + box.height * 0.15 };
  return { x: 0, y: 0 };
}

/**
 * The bubbles that show at `t`, in their draw order. With `pop` false, they
 * show at their full size also while they pop in and out, such as in the
 * editor when the cartoon doesn't play.
 */
export function placeBubbles(
  bubbles: readonly Bubble[],
  t: number,
  ctx: BubbleContext,
  pop = true,
): PlacedBubble[] {
  return sortedBubbles(bubbles).flatMap((b) => {
    const scale = popScale(b, t, pop);
    if (scale === 0) return [];
    if (b.actorId !== undefined && !ctx.anchors.has(b.actorId)) return [];
    return [placeBubble(b, scale, ctx)];
  });
}

function placeBubble(
  b: Bubble,
  scale: number,
  ctx: BubbleContext,
): PlacedBubble {
  const font = b.font ?? ctx.fontOf(b);
  const text = layoutText(b, font);
  const unit = b.fontSize;
  const pad = unit * (b.shape === 'caption' ? 0.5 : 0.35);
  const hw = text.width / 2 + pad;
  const hh = text.height / 2 + pad * 0.6;
  const seed = hash(b.id);
  let shape = outline(b.shape, hw, hh, unit, seed);
  // A wobbly line goes on before the tail, which is too narrow to wobble.
  const wobbly = (points: Pt[]) =>
    b.border === 'wobbly'
      ? wobble(points, Math.max(1.5, b.borderWidth * 0.6) + unit * 0.05, seed)
      : points;
  shape = wobbly(shape);

  // Move the bubble inside the frame.
  const anchor = anchorOf(b, ctx);
  const wanted = bubblePoint(b.at, anchor);
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  const fit = (v: number, lo: number, hi: number, size: number) =>
    hi - lo + 2 * FRAME_MARGIN > size
      ? size / 2 - (hi + lo) / 2
      : clamp(v, FRAME_MARGIN - lo, size - FRAME_MARGIN - hi);
  const center = {
    x: fit(wanted.x, left, right, ctx.width),
    y: fit(wanted.y, top, bottom, ctx.height),
  };
  const box = {
    x: center.x + left,
    y: center.y + top,
    width: right - left,
    height: bottom - top,
  };

  let tip: Pt | null = null;
  if (b.tail) {
    if (b.tailTip) tip = bubblePoint(b.tailTip, anchor);
    else if (anchor) {
      // Stop short of the head, so that the tail doesn't cover the face.
      const h = anchor.head;
      const d = Math.hypot(h.x - center.x, h.y - center.y);
      const gap = Math.min(d * 0.3, unit * 1.5);
      tip = {
        x: h.x + ((center.x - h.x) / (d || 1)) * gap,
        y: h.y + ((center.y - h.y) / (d || 1)) * gap,
      };
    } else tip = { x: center.x, y: center.y + hh + unit * 1.5 };
  }
  const tipRel = tip && { x: tip.x - center.x, y: tip.y - center.y };
  if (tipRel && inside(shape, tipRel)) tip = null;

  const extra: Pt[][] = [];
  if (tip && tipRel) {
    if (b.shape === 'thought') {
      // Small circles from the edge toward the speaker.
      const edge = shape[nearestIndex(shape, tipRel)]!;
      for (const [u, r] of [
        [0.2, 0.32],
        [0.55, 0.22],
        [0.88, 0.14],
      ] as const) {
        extra.push(
          circle(
            {
              x: edge.x + (tipRel.x - edge.x) * u,
              y: edge.y + (tipRel.y - edge.y) * u,
            },
            unit * r,
          ),
        );
      }
    } else {
      const width = Math.min(
        Math.max(Math.min(hw, hh) * 0.6, unit * 0.6),
        unit * 1.4,
      );
      shape = withTail(shape, tipRel, width);
    }
  }

  // The circles of a thought bubble are too small to wobble.
  const outlines = [...extra, shape];
  const children: DrawNode[] = outlines.flatMap((points) =>
    bubblePaths(b, points),
  );

  const family = fontFamily(font);
  const align = b.align ?? 'center';
  const textLeft = -text.width / 2;
  const x =
    align === 'left' ? textLeft : align === 'right' ? textLeft + text.width : 0;
  text.lines.forEach((line, i) => {
    children.push({
      type: 'text',
      x,
      y: -text.height / 2 + text.baseline + i * text.lineHeight,
      text: line.text,
      font: family,
      size: unit,
      fill: b.color,
      ...(b.bold ? { bold: true } : {}),
      ...(b.italic ? { italic: true } : {}),
      anchor: align === 'left' ? 'start' : align === 'right' ? 'end' : 'middle',
    });
  });

  return {
    bubble: b,
    center,
    box,
    tip,
    node: {
      type: 'group',
      transform: multiply(translation(center.x, center.y), scaling(scale)),
      children,
    },
  };
}

/** The fill and the border of one outline of a bubble. */
function bubblePaths(b: Bubble, points: readonly Pt[]): DrawNode[] {
  const d = pathOf(points);
  const w = b.borderWidth;
  const round = { lineJoin: 'round', lineCap: 'round' } as const;
  if (b.border === 'none' || w <= 0) return [{ type: 'path', d, fill: b.fill }];
  if (b.border === 'double') {
    // A wide line with a line of the fill color down its middle.
    return [
      {
        type: 'path',
        d,
        fill: b.fill,
        stroke: b.borderColor,
        strokeWidth: w * 3,
        ...round,
      },
      { type: 'path', d, stroke: b.fill, strokeWidth: w, ...round },
    ];
  }
  if (b.border === 'dashed') {
    // A whole number of dashes, so that the last one meets the first.
    const len = perimeter(points);
    const each = w * 5 + 8;
    const count = Math.max(4, Math.round(len / each));
    const part = 1 / count;
    return [
      {
        type: 'path',
        d,
        fill: b.fill,
        stroke: b.borderColor,
        strokeWidth: w,
        dash: [part * 0.6, part * 0.4],
        ...round,
      },
    ];
  }
  return [
    {
      type: 'path',
      d,
      fill: b.fill,
      stroke: b.borderColor,
      strokeWidth: w,
      ...round,
    },
  ];
}

/** The bubbles that show at `t`, as one drawing in frame pixels. */
export const drawBubbles = (placed: readonly PlacedBubble[]): DrawNode => ({
  type: 'group',
  children: placed.map((p) => p.node),
});
