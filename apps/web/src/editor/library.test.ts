// Plays every clip on every character, prop and background of the library,
// so that a new asset can't break the renderer without a failing test.
import type { Clip } from '@toonhouse/model';
import {
  backgroundClips,
  clipsFor,
  drawCharacter,
  drawScene,
  wholeBackground,
} from '@toonhouse/renderer';
import { describe, expect, it } from 'vitest';

import { BACKGROUNDS, CHARACTERS, PROPS } from './library.ts';

/** Every number in a value, in a fixed order. */
function numbers(v: unknown): number[] {
  if (typeof v === 'number') return [v];
  if (Array.isArray(v)) return v.flatMap(numbers);
  if (v && typeof v === 'object') return Object.values(v).flatMap(numbers);
  return [];
}

/** The times to draw a clip at: 30 frames a second over one loop. */
const frameTimes = (clip: Clip) =>
  Array.from({ length: Math.floor(clip.duration * 30) + 1 }, (_, i) => i / 30);

const rigCases = [...CHARACTERS, ...PROPS].flatMap((asset) =>
  clipsFor(asset.rig.kind).map(
    (clip) => [`${asset.id} ${clip.id}`, asset.rig, clip] as const,
  ),
);

describe('library rigs', () => {
  it('has characters and props', () => {
    expect(CHARACTERS.length).toBeGreaterThan(0);
    expect(PROPS.length).toBeGreaterThan(0);
  });

  describe.each(rigCases)('%s', (_, rig, clip) => {
    it('draws the same for the same time', () => {
      for (const t of [0, 0.37, clip.duration / 2]) {
        const draw = () => drawCharacter(rig, clip.frameAt(t), { facing: -1 });
        expect(draw()).toEqual(draw());
      }
    });

    it('draws finite numbers at every frame', () => {
      for (const t of frameTimes(clip)) {
        const drawing = drawCharacter(rig, clip.frameAt(t), { facing: 1 });
        for (const n of numbers(drawing)) expect(Number.isFinite(n)).toBe(true);
      }
    });
  });
});

const backgroundCases = BACKGROUNDS.flatMap(({ id, background }) =>
  backgroundClips(background).map(
    (clip) => [`${id} ${clip.id}`, background, clip] as const,
  ),
);

describe('library backgrounds', () => {
  it('has backgrounds', () => {
    expect(BACKGROUNDS.length).toBeGreaterThan(0);
  });

  describe.each(backgroundCases)('%s', (_, background, clip) => {
    const { rig } = CHARACTERS[0]!;
    const idle = clipsFor(rig.kind)[0]!;
    const draw = (t: number) => {
      const { node } = drawCharacter(rig, idle.frameAt(t), { facing: 1 });
      const { x, y } = background.ground.start;
      return drawScene(
        background,
        clip.frameAt(t),
        wholeBackground(background),
        [{ id: 'a', node, x, y }],
      );
    };

    it('draws the same for the same time', () => {
      for (const t of [0, 0.37, clip.duration / 2]) {
        expect(draw(t)).toEqual(draw(t));
      }
    });

    it('draws finite numbers at every frame', () => {
      // A background clip can be long, so this draws a frame a second.
      for (let t = 0; t <= clip.duration; t += 1) {
        for (const n of numbers(draw(t))) expect(Number.isFinite(n)).toBe(true);
      }
    });
  });
});
