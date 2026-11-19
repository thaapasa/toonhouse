// The outlines of speech bubbles, as closed lists of points around (0, 0).
// Every outline has points at even steps, so that a tail can go in at any
// place and a wobbly border can move each point a bit.
import type { BubbleShape, Pt } from '@toonhouse/model';

/** The distance between the points of an outline, in frame pixels. */
const STEP = 6;
/**
 * How long a bump of a thought bubble is along the outline, and how far it
 * bulges out, against the size of the text.
 */
export const THOUGHT_BUMP = 2.3;
export const THOUGHT_HEIGHT = 0.36;
/**
 * How far apart the spikes of a shout bubble are along the outline, and the
 * shortest and the longest spike, against the size of the text.
 */
export const SHOUT_SPACING = 1.2;
export const SHOUT_SPIKE = { min: 0.35, max: 0.65 } as const;

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const lerp = (a: Pt, b: Pt, u: number): Pt => ({
  x: a.x + (b.x - a.x) * u,
  y: a.y + (b.y - a.y) * u,
});

/** The length around a closed outline. */
export function perimeter(points: readonly Pt[]): number {
  let len = 0;
  for (let i = 0; i < points.length; i++)
    len += dist(points[i]!, points[(i + 1) % points.length]!);
  return len;
}

/** The outline with points at even steps of about `step`. */
export function resample(points: readonly Pt[], step = STEP): Pt[] {
  const total = perimeter(points);
  const count = Math.max(8, Math.round(total / step));
  const each = total / count;
  const out: Pt[] = [];
  let i = 0;
  let along = 0;
  let a = points[0]!;
  let b = points[1 % points.length]!;
  let seg = dist(a, b);
  for (let k = 0; k < count; k++) {
    const want = k * each;
    while (along + seg < want && i < points.length) {
      along += seg;
      i++;
      a = points[i % points.length]!;
      b = points[(i + 1) % points.length]!;
      seg = dist(a, b);
    }
    out.push(seg > 0 ? lerp(a, b, (want - along) / seg) : a);
  }
  return out;
}

/**
 * A shape between an ellipse and a rectangle, through the corners of the box
 * of half width `hw` and half height `hh`, so that the text fits inside.
 */
function superellipse(hw: number, hh: number, n: number): Pt[] {
  const k = 2 ** (1 / n);
  const out: Pt[] = [];
  for (let i = 0; i < 180; i++) {
    const a = (i / 180) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    out.push({
      x: hw * k * Math.sign(c) * Math.abs(c) ** (2 / n),
      y: hh * k * Math.sign(s) * Math.abs(s) ** (2 / n),
    });
  }
  return out;
}

/** A number from 0 to 1 for `i`, the same every time for the same seed. */
export function noise(seed: number, i: number): number {
  const x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** A number for a string, as the seed of `noise`. */
export function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return (h % 1000) + 1000;
}

/**
 * The outline of a bubble with the text box of half width `hw` and half
 * height `hh` in its middle. `unit` is the size of the text, which sets the
 * size of the bumps and the spikes.
 */
export function outline(
  shape: BubbleShape,
  hw: number,
  hh: number,
  unit: number,
  seed: number,
): Pt[] {
  switch (shape) {
    case 'speech':
      return resample(superellipse(hw, hh, 2.5));
    case 'caption':
      return resample([
        { x: -hw, y: -hh },
        { x: hw, y: -hh },
        { x: hw, y: hh },
        { x: -hw, y: hh },
      ]);
    case 'thought': {
      // Bumps outward along an ellipse. Each bump follows the curve of the
      // ellipse, so that a long bump doesn't cut across its round ends.
      const base = resample(superellipse(hw, hh, 2.2), 2);
      const n = base.length;
      const count = Math.max(
        6,
        Math.round(perimeter(base) / (unit * THOUGHT_BUMP)),
      );
      return resample(
        base.map((p, i) => {
          const prev = base[(i - 1 + n) % n]!;
          const next = base[(i + 1) % n]!;
          const len = dist(prev, next) || 1;
          // The outward side: the outline goes clockwise on the screen.
          const nx = (next.y - prev.y) / len;
          const ny = -(next.x - prev.x) / len;
          const u = ((i * count) / n) % 1;
          const h = Math.sin(Math.PI * u) * unit * THOUGHT_HEIGHT;
          return { x: p.x + nx * h, y: p.y + ny * h };
        }),
      );
    }
    case 'shout': {
      const base = resample(superellipse(hw, hh, 2.5), 2);
      const count = Math.max(
        10,
        Math.round(perimeter(base) / (unit * SHOUT_SPACING)),
      );
      const inner = resample(base, perimeter(base) / (count * 2)).slice(
        0,
        count * 2,
      );
      const out = inner.map((p, i) => {
        if (i % 2 === 0) return p;
        const len = Math.hypot(p.x, p.y) || 1;
        const spike =
          unit *
          (SHOUT_SPIKE.min +
            (SHOUT_SPIKE.max - SHOUT_SPIKE.min) * noise(seed, i));
        return { x: p.x + (p.x / len) * spike, y: p.y + (p.y / len) * spike };
      });
      return resample(out);
    }
  }
}

/** Whether `p` is inside the closed outline. */
export function inside(points: readonly Pt[], p: Pt): boolean {
  let yes = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i]!;
    const b = points[j]!;
    if (
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
    )
      yes = !yes;
  }
  return yes;
}

/** The point of the outline in the direction of `p` from (0, 0). */
export function nearestIndex(points: readonly Pt[], p: Pt): number {
  const want = Math.atan2(p.y, p.x);
  let best = 0;
  let bestD = Infinity;
  points.forEach((q, i) => {
    let d = Math.abs(Math.atan2(q.y, q.x) - want);
    if (d > Math.PI) d = Math.PI * 2 - d;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}

/**
 * The outline with a tail to `tip`, as wide as `width` where it leaves the
 * outline. The tail is part of the outline, so that the border goes around
 * both without a line between them.
 */
export function withTail(points: readonly Pt[], tip: Pt, width: number): Pt[] {
  const n = points.length;
  const at = nearestIndex(points, tip);
  // Turn the list so that the tail is in its middle and doesn't wrap.
  const center = Math.floor(n / 2);
  const rotated = Array.from(
    { length: n },
    (_, k) => points[(at - center + k + n) % n]!,
  );
  let a = center;
  let b = center;
  while (a > 1 && dist(rotated[a]!, rotated[center]!) < width / 2) a--;
  while (b < n - 2 && dist(rotated[b]!, rotated[center]!) < width / 2) b++;
  const from = rotated[a]!;
  const to = rotated[b]!;
  // The sides of the tail bend in toward its middle line, as in a drawn
  // bubble.
  const base = lerp(from, to, 0.5);
  const side = (p: Pt) => {
    const steps = Math.max(2, Math.round(dist(p, tip) / STEP));
    return Array.from({ length: steps }, (_, k) => {
      const u = k / steps;
      const edge = lerp(p, tip, u);
      const axis = lerp(base, tip, u);
      return lerp(edge, axis, 0.35 * Math.sin(Math.PI * u));
    });
  };
  return [
    ...rotated.slice(0, a),
    ...side(from),
    tip,
    ...side(to).slice(1).reverse(),
    ...rotated.slice(b),
  ];
}

/** Moves each point a bit along the outline's normal, so the line looks drawn by hand. */
export function wobble(points: readonly Pt[], amount: number, seed: number) {
  const n = points.length;
  const p1 = noise(seed, 1) * 6;
  const p2 = noise(seed, 2) * 6;
  let along = 0;
  return points.map((p, i) => {
    const prev = points[(i - 1 + n) % n]!;
    const next = points[(i + 1) % n]!;
    along += dist(prev, p);
    const len = dist(prev, next) || 1;
    const nx = (next.y - prev.y) / len;
    const ny = -(next.x - prev.x) / len;
    const h =
      amount *
      (0.6 * Math.sin(along / 23 + p1) + 0.4 * Math.sin(along / 9 + p2));
    return { x: p.x + nx * h, y: p.y + ny * h };
  });
}

/** A circle as an outline, for the tail of a thought bubble. */
export function circle(c: Pt, r: number): Pt[] {
  const count = Math.max(12, Math.round((Math.PI * 2 * r) / STEP));
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2;
    return { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r };
  });
}

/** An SVG path through the closed outline. */
export const pathOf = (points: readonly Pt[]) =>
  points
    .map(
      (p, i) =>
        `${i === 0 ? 'M' : 'L'}${Math.round(p.x * 10) / 10} ${Math.round(p.y * 10) / 10}`,
    )
    .join('') + 'Z';
