import type { Pt } from '@toonhouse/model';
import { describe, expect, it } from 'vitest';

import {
  circle,
  outline,
  SHOUT_SPIKE,
  THOUGHT_HEIGHT,
  wobble,
} from './shape.ts';

const UNIT = 40;
const extent = (points: readonly Pt[]) => ({
  x: Math.max(...points.map((p) => Math.abs(p.x))),
  y: Math.max(...points.map((p) => Math.abs(p.y))),
});

describe('bubble outlines', () => {
  it('bulges a thought bubble out by the height of its bumps', () => {
    const speech = extent(outline('speech', 300, 40, UNIT, 1));
    const thought = extent(outline('thought', 300, 40, UNIT, 1));
    // The base of a thought bubble is a little rounder than a speech bubble.
    expect(thought.y).toBeLessThanOrEqual(
      speech.y * 1.1 + UNIT * THOUGHT_HEIGHT,
    );
    expect(thought.y).toBeGreaterThan(speech.y);
  });

  it('keeps the ends of a wide thought bubble round', () => {
    // Bumps that cut across the round ends of a wide bubble gave it pointed
    // ends, with points far outside its ellipse.
    const points = outline('thought', 300, 40, UNIT, 1);
    const end = points.reduce((a, b) =>
      Math.abs(b.x) > Math.abs(a.x) ? b : a,
    );
    const near = points.filter((p) => Math.abs(p.x) > Math.abs(end.x) - 5);
    expect(Math.max(...near.map((p) => Math.abs(p.y)))).toBeGreaterThan(3);
  });

  it('gives a shout bubble spikes of the set lengths', () => {
    const inner = extent(outline('speech', 200, 60, UNIT, 1));
    const shout = extent(outline('shout', 200, 60, UNIT, 7));
    expect(shout.x).toBeGreaterThan(inner.x + UNIT * SHOUT_SPIKE.min * 0.5);
    expect(shout.x).toBeLessThanOrEqual(inner.x + UNIT * SHOUT_SPIKE.max + 1);
  });

  it('draws the same outline for the same bubble', () => {
    expect(outline('shout', 200, 60, UNIT, 7)).toEqual(
      outline('shout', 200, 60, UNIT, 7),
    );
  });

  it('closes a wobbly line without a kink', () => {
    for (const r of [50, 87, 133, 260]) {
      const round = circle({ x: 0, y: 0 }, r);
      const offsets = wobble(round, 4, 3).map((p) => Math.hypot(p.x, p.y) - r);
      const steps = offsets.map(
        (h, i) => h - offsets[(i - 1 + offsets.length) % offsets.length]!,
      );
      const inside = Math.max(...steps.slice(1).map(Math.abs));
      expect(Math.abs(steps[0]!)).toBeLessThanOrEqual(inside * 1.01);
    }
  });
});
