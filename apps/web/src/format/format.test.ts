// Saved cartoons refer to the format and to the library by name. These tests
// fail when a change could break the cartoons that users have saved. See
// "Cartoon format versions" in ARCHITECTURE.md for what such a change needs.
import { CartoonContent } from '@toonhouse/api';
import type { ClipKind } from '@toonhouse/model';
import { backgroundClips, clipsFor } from '@toonhouse/renderer';
import { describe, expect, it } from 'vitest';

import { newBubble } from '../editor/bubbles.ts';
import { newId, newScene } from '../editor/sceneEdit.ts';
import { BACKGROUNDS, CHARACTERS, PROPS } from '../library/index.ts';
import { v1 } from './v1.ts';

const SEE = 'See "Cartoon format versions" in ARCHITECTURE.md.';

describe('cartoon format', () => {
  // The saved cartoon uses every optional field and every value of each list
  // of choices in version 1.
  it('reads a saved cartoon of version 1 as it was saved', () => {
    const parsed = CartoonContent.safeParse(v1);
    expect(parsed.error, SEE).toBeUndefined();
    expect(parsed.data, SEE).toEqual(v1);
  });

  it('accepts what the editor makes for a new scene and a new bubble', () => {
    const scene = {
      ...newScene(),
      background: 'meadow',
      bubbles: [newBubble(newId(), 1, { x: 100, y: 100 }, null)],
    };
    const parsed = CartoonContent.safeParse({ version: 1, scenes: [scene] });
    expect(parsed.error).toBeUndefined();
  });
});

/** The library ids that saved cartoons can refer to, with their rig kinds. */
const characters: Record<string, ClipKind> = {
  boy: 'cutout',
  bunny: 'rabbit',
  captain: 'cutout',
  chicken: 'bird',
  duck: 'bird',
  emo: 'cutout',
  grandma: 'cutout',
  quartermaster: 'cutout',
  raincoat: 'cutout',
  squirrel: 'rabbit',
  wizard: 'cutout',
};
const props = [
  'apple-tree',
  'flowering-bush',
  'hedge',
  'oak',
  'round-bush',
  'spruce',
];
const backgrounds: Record<string, string[]> = {
  farm: ['idle', 'day', 'drift'],
  harbor: ['idle'],
  meadow: ['idle', 'day', 'drift'],
  village: ['idle', 'day', 'drift'],
};
const clips: Record<Exclude<ClipKind, 'background'>, string[]> = {
  cutout: ['idle', 'walk', 'wave', 'talk'],
  bird: ['idle', 'walk', 'peck', 'flap', 'talk'],
  rabbit: ['idle', 'hop', 'lookout', 'talk'],
  prop: ['idle', 'rustle'],
};

describe('library', () => {
  it('keeps every character with its rig kind', () => {
    const kinds = Object.fromEntries(
      CHARACTERS.map((c) => [c.id, c.rig.kind] as const),
    );
    expect(kinds, SEE).toMatchObject(characters);
  });

  it('keeps every prop', () => {
    expect(
      PROPS.map((p) => p.id),
      SEE,
    ).toEqual(expect.arrayContaining(props));
  });

  it('keeps every background with its clips', () => {
    for (const [id, ids] of Object.entries(backgrounds)) {
      const bg = BACKGROUNDS.find((b) => b.id === id);
      expect(bg, `${id}. ${SEE}`).toBeDefined();
      const has = backgroundClips(bg!.background).map((c) => c.id);
      expect(has, `${id}. ${SEE}`).toEqual(expect.arrayContaining(ids));
    }
  });

  it('keeps the clips of each rig kind', () => {
    for (const [kind, ids] of Object.entries(clips)) {
      const has = clipsFor(kind as ClipKind).map((c) => c.id);
      expect(has, `${kind}. ${SEE}`).toEqual(expect.arrayContaining(ids));
    }
  });
});
