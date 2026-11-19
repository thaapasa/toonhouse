import type { Bubble } from '@toonhouse/model';
import { describe, expect, it } from 'vitest';

import { bubbleLines } from './BubbleLane.tsx';

const bubble = (id: string, t: number, length: number) =>
  ({ id, t, length }) as Bubble;

describe('bubble lines', () => {
  it('puts bubbles that overlap in time on separate lines', () => {
    const lines = bubbleLines([
      bubble('a', 0, 3),
      bubble('b', 1, 3),
      bubble('c', 3, 1),
      bubble('d', 2, 1),
    ]);
    expect(Object.fromEntries(lines)).toEqual({ a: 0, b: 1, d: 2, c: 0 });
  });
});
