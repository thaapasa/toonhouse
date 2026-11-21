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
  `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;

interface Tile {
  size: number;
  /** The shapes of the tile as SVG path data, all in the pattern color. */
  d: string;
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

const TILES: Record<PatternKind, Tile> = { stars: STARS };

/** The tile of a pattern kind, for a `<pattern>` element. */
export const patternTile = (kind: PatternKind): Tile => TILES[kind];
