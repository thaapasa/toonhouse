export interface Pt {
  x: number;
  y: number;
}

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
