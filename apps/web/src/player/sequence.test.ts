import type { Scene } from '@toonhouse/model';
import { CARTOON_VERSION } from '@toonhouse/model';
import { describe, expect, it } from 'vitest';

import { entryAt, sequenceOf } from './sequence.ts';

const scene = (id: string, background: string | null): Scene => ({
  id,
  background,
  backgroundActions: [],
  actors: [],
});

describe('sequence', () => {
  const sequence = sequenceOf({
    version: CARTOON_VERSION,
    scenes: [scene('a', 'meadow'), scene('b', null), scene('c', 'farm')],
  });

  it('plays the scenes with a background one after another', () => {
    expect(sequence.entries.map((e) => e.scene.id)).toEqual(['a', 'c']);
    const [a, c] = sequence.entries;
    expect(c!.start).toBe(a!.duration);
    expect(sequence.duration).toBe(a!.duration + c!.duration);
  });

  it('finds the scene and the time in it', () => {
    const a = sequence.entries[0]!;
    expect(entryAt(sequence, 1)).toMatchObject({
      entry: { scene: { id: 'a' } },
      t: 1,
    });
    expect(entryAt(sequence, a.duration + 0.5)).toMatchObject({
      entry: { scene: { id: 'c' } },
      t: 0.5,
    });
  });

  it('shows the end of the last scene at the end', () => {
    const c = sequence.entries[1]!;
    expect(entryAt(sequence, sequence.duration)).toMatchObject({
      entry: { scene: { id: 'c' } },
      t: c.duration,
    });
  });

  it('has nothing to play without scenes', () => {
    const empty = sequenceOf({ version: CARTOON_VERSION, scenes: [] });
    expect(empty.duration).toBe(0);
    expect(entryAt(empty, 0)).toBeNull();
  });
});
