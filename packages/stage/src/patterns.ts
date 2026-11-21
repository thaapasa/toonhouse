// Patterns that a color preset draws over a role, such as stars on a robe.
// Each pattern is one square tile that repeats. The layout of a tile is fixed,
// so a part looks the same in every frame and every export.
import type { PatternKind } from '@toonhouse/model';

const round = (v: number) => Math.round(v * 10) / 10;

/** A five-pointed star with its middle at `cx`, `cy`, as SVG path data. */
export function starPath(cx: number, cy: number, r: number, turn = 0) {
  const points = Array.from({ length: 10 }, (_, i) => {
    const radius = i % 2 === 0 ? r : r * 0.45;
    const a = ((i * 36 + turn - 90) * Math.PI) / 180;
    return `${round(cx + radius * Math.cos(a))} ${round(cy + radius * Math.sin(a))}`;
  });
  return `M${points.join('L')}Z`;
}

const dot = (cx: number, cy: number, r: number) =>
  `M${round(cx - r)} ${round(cy)}a${r} ${r} 0 1 0 ${round(2 * r)} 0a${r} ${r} 0 1 0 ${round(-2 * r)} 0Z`;

/** The five round petals of a flower of radius `r`, without its middle. */
function petalsPath(cx: number, cy: number, r: number, turn = 0) {
  return Array.from({ length: 5 }, (_, i) => {
    const a = ((i * 72 + turn - 90) * Math.PI) / 180;
    const d = r * 0.55;
    return dot(cx + d * Math.cos(a), cy + d * Math.sin(a), r * 0.45);
  }).join('');
}

/** The middle of a flower of radius `r`. */
const flowerMiddle = (cx: number, cy: number, r: number) =>
  dot(cx, cy, r * 0.3);

export interface Tile {
  size: number;
  /** The shapes in the pattern color, as SVG path data. */
  d: string;
  /** The shapes in the accent color, drawn over `d`. */
  accent?: string;
  /** Turns the tile, in degrees, so that the rows don't run level. */
  turn: number;
}

// Stars of four sizes and a few dots, spread so that the tile doesn't show a
// grid when it repeats. The sizes are in the pixels of a part.
const STARS: Tile = {
  size: 150,
  turn: -14,
  d: [
    starPath(32, 38, 15, 8),
    starPath(108, 22, 9, -12),
    starPath(92, 104, 12, 20),
    starPath(26, 118, 6, -5),
    starPath(140, 70, 5, 30),
    dot(62, 76, 2.5),
    dot(128, 136, 2),
    dot(70, 140, 3),
    dot(12, 78, 2),
  ].join(''),
};

// Small flowers of three sizes, each turned a little, with dots between them,
// as on a printed cotton dress.
const FLOWER_LAYOUT: [number, number, number, number][] = [
  [26, 30, 16, 0],
  [94, 18, 11, 20],
  [70, 78, 15, 40],
  [128, 72, 9, 10],
  [22, 108, 11, 30],
  [108, 128, 14, 15],
];
const FLOWERS: Tile = {
  size: 150,
  turn: -10,
  d: [
    ...FLOWER_LAYOUT.map(([x, y, r, t]) => petalsPath(x, y, r, t)),
    dot(56, 128, 2.5),
    dot(136, 26, 2),
    dot(52, 46, 2),
    dot(142, 108, 2.5),
  ].join(''),
  accent: FLOWER_LAYOUT.map(([x, y, r]) => flowerMiddle(x, y, r)).join(''),
};

const TILES: Record<PatternKind, Tile> = { stars: STARS, flowers: FLOWERS };

/** The tile of a pattern kind, for a `<pattern>` element. */
export const patternTile = (kind: PatternKind): Tile => TILES[kind];

/** An icon of a pattern kind in a 20 × 20 box, for a color swatch. */
export function patternIcon(kind: PatternKind): { d: string; accent?: string } {
  switch (kind) {
    case 'stars':
      return { d: starPath(10, 10.5, 7) };
    case 'flowers':
      return { d: petalsPath(10, 10, 8), accent: flowerMiddle(10, 10, 8) };
  }
}
