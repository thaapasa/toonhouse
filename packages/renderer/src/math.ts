import type { Matrix, Pt } from '@toonhouse/model';

export const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
export const smoothstep = (a: number, b: number, v: number) => {
  const u = clamp01((v - a) / (b - a));
  return u * u * (3 - 2 * u);
};
export const easeInOut = (u: number) => {
  const c = clamp01(u);
  return c < 0.5 ? 4 * c * c * c : 1 - (-2 * c + 2) ** 3 / 2;
};
/** Ease out with a small overshoot past 1. */
export const easeOutBack = (u: number, s = 1.70158) => {
  const c = clamp01(u) - 1;
  return 1 + (s + 1) * c * c * c + s * c * c;
};
export const deg = (d: number) => (d * Math.PI) / 180;

export function rotate(p: Pt, a: number): Pt {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
}

export const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });
export const mix = (a: Pt, b: Pt, u: number): Pt => ({
  x: lerp(a.x, b.x, u),
  y: lerp(a.y, b.y, u),
});

/** A number in [0, 1) that depends only on `n`, for made-up variation. */
export function hash(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * Control point of a quadratic curve from `a` to `b` whose length is about
 * `length`, bending to the side given by `bend` (+1 or -1). This is what makes
 * the limbs rubber hoses: a short reach bends the limb, a long reach
 * straightens it.
 */
export function hoseControl(a: Pt, b: Pt, length: number, bend: number): Pt {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  // Length of a shallow quadratic with chord d and sag h: sqrt(d² + 16/3 h²).
  // The control point sits at 2h from the chord.
  const h = Math.sqrt(Math.max(0, ((length * length - d * d) * 3) / 16));
  const mid = mix(a, b, 0.5);
  const nx = d === 0 ? 1 : -(b.y - a.y) / d;
  const ny = d === 0 ? 0 : (b.x - a.x) / d;
  return { x: mid.x + nx * 2 * h * bend, y: mid.y + ny * 2 * h * bend };
}

/**
 * The middle joint of a limb of two straight bones from `a` to `b`. The joint
 * bends to the back of the character (towards -x when the limb points down)
 * when `bend` is 1, and to the front when it is -1. A reach longer than the
 * limb straightens it.
 */
export function twoBoneJoint(
  a: Pt,
  b: Pt,
  first: number,
  second: number,
  bend: 1 | -1,
): Pt {
  const d = sub(b, a);
  const dist = Math.max(Math.hypot(d.x, d.y), 1e-6);
  const reach = Math.min(dist, first + second - 1e-6);
  const cos =
    (first * first + reach * reach - second * second) / (2 * first * reach);
  const turn = Math.acos(Math.min(Math.max(cos, -1), 1)) * bend;
  const dir = { x: d.x / dist, y: d.y / dist };
  // Turning the downward direction by a positive angle moves it towards -x.
  return add(a, rotate({ x: dir.x * first, y: dir.y * first }, turn));
}

/** The middle point of the quadratic curve a-c-b. */
export const curveMiddle = (a: Pt, c: Pt, b: Pt): Pt => ({
  x: 0.25 * a.x + 0.5 * c.x + 0.25 * b.x,
  y: 0.25 * a.y + 0.5 * c.y + 0.25 * b.y,
});

export const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

/** `m` applied after `n`. */
export function multiply(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

export const translation = (x: number, y: number): Matrix => [1, 0, 0, 1, x, y];
export const scaling = (sx: number, sy = sx): Matrix => [sx, 0, 0, sy, 0, 0];
export function rotation(a: number): Matrix {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [c, s, -s, c, 0, 0];
}

/** Places a piece so that its `pivot` is at `at`, rotated and scaled. */
export function pinned(at: Pt, angle: number, scale: number, pivot: Pt) {
  return multiply(
    translation(at.x, at.y),
    multiply(
      rotation(angle),
      multiply(scaling(scale), translation(-pivot.x, -pivot.y)),
    ),
  );
}
