// Plays every clip on every character, prop and background of the library,
// so that a new asset can't break the renderer without a failing test.
import type { Clip } from '@toonhouse/model';
import {
  backgroundClips,
  clipsFor,
  drawRig,
  drawScene,
  restClip,
  wholeBackground,
} from '@toonhouse/renderer';
import { describe, expect, it } from 'vitest';

import { isTextKey } from '../i18n/index.tsx';
import { BACKGROUNDS, CHARACTERS, LIBRARY, PROPS } from './index.ts';

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
        const draw = () => drawRig(rig, clip.frameAt(t), { facing: -1 });
        expect(draw()).toEqual(draw());
      }
    });

    it('ends where it starts when it loops', () => {
      const a = clip.frameAt(0);
      const b = clip.frameAt(clip.duration);
      if (a.kind === 'background' || b.kind === 'background') return;
      const pa = numbers(a.pose);
      const pb = numbers(b.pose);
      pa.forEach((v, i) => expect(pb[i]).toBeCloseTo(v, 6));
      expect('face' in b && b.face).toEqual('face' in a && a.face);
    });

    it('draws finite numbers at every frame', () => {
      for (const t of frameTimes(clip)) {
        const drawing = drawRig(rig, clip.frameAt(t), { facing: 1 });
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
    const idle = restClip(rig.kind);
    const draw = (t: number) => {
      const { node } = drawRig(rig, idle.frameAt(t), { facing: 1 });
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

describe('library packs', () => {
  it('gives the default bubble font of the asset pack', () => {
    const { actorFont, backgroundFont } = LIBRARY;
    expect(actorFont({ kind: 'character', id: 'sunny/blond-boy' })).toBe(
      'comic-relief',
    );
    expect(backgroundFont('sunny/meadow')).toBe('comic-relief');
    expect(backgroundFont('adventure/harbor')).toBe('indie-flower');
    expect(backgroundFont(null)).toBe('comic-relief');
  });
});

describe('library texts', () => {
  // The user picks the colors by the names of the color settings.
  it('has a name for every color setting', () => {
    const ids = [...CHARACTERS, ...PROPS].flatMap(
      (a) => a.rig.colorSettings?.map((s) => s.id) ?? [],
    );
    const missing = ids.filter((id) => !isTextKey(`colorSetting.${id}`));
    expect(missing).toEqual([]);
  });
});
