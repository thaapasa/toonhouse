import type { Background, Scene } from '@toonhouse/model';
import { CARTOON_VERSION } from '@toonhouse/model';
import { describe, expect, it } from 'vitest';

import testHills from '../../../assets/fixtures/backgrounds/test-hills/background.json';
import { cartoonTime, cartoonTimeline } from './cartoon.ts';
import type { Library } from './frame.ts';

const library: Library = {
  rig: () => undefined,
  background: (id) => (id === 'hills' ? (testHills as Background) : undefined),
  actorFont: () => 'comic-relief',
  backgroundFont: () => 'comic-relief',
};

const scene = (id: string, background: string | null): Scene => ({
  id,
  background,
  actors: [],
});

describe('cartoon time', () => {
  const timeline = cartoonTimeline(
    {
      version: CARTOON_VERSION,
      scenes: [
        scene('a', 'hills'),
        scene('b', null),
        scene('c', 'removed'),
        { ...scene('d', 'hills'), length: 3 },
      ],
    },
    library,
  );

  it('plays the scenes with a known background one after another', () => {
    expect(timeline.entries.map((e) => e.scene.id)).toEqual(['a', 'd']);
    const [a, d] = timeline.entries;
    expect(d!.start).toBe(a!.duration);
    expect(d!.duration).toBe(3);
    expect(timeline.duration).toBe(a!.duration + 3);
  });

  it('finds the scene and the time in it', () => {
    const a = timeline.entries[0]!;
    expect(cartoonTime(timeline, 1)).toMatchObject({
      entry: { scene: { id: 'a' } },
      t: 1,
    });
    expect(cartoonTime(timeline, a.duration + 0.5)).toMatchObject({
      entry: { scene: { id: 'd' } },
      t: 0.5,
    });
  });

  it('shows the end of the last scene at the end', () => {
    expect(cartoonTime(timeline, timeline.duration + 1)).toMatchObject({
      entry: { scene: { id: 'd' } },
      t: 3,
    });
  });

  it('has nothing to play without scenes', () => {
    const empty = cartoonTimeline(
      { version: CARTOON_VERSION, scenes: [] },
      library,
    );
    expect(empty.duration).toBe(0);
    expect(cartoonTime(empty, 0)).toBeNull();
  });
});
