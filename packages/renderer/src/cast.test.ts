import type { Actor, CastMember } from '@toonhouse/model';
import { describe, expect, it } from 'vitest';

import { actorSettings, mergeSettings } from './cast.ts';

const member: CastMember = {
  id: 'm',
  name: 'Grandma',
  asset: { kind: 'character', id: 'sunny/grandma' },
  settings: { scale: 1.4, colors: { hair: 'white', dress: 'blue' } },
};

const actor = (a: Partial<Actor> = {}): Actor => ({
  id: 'a',
  asset: member.asset,
  at: { x: 0, y: 0 },
  facing: 1,
  actions: [],
  ...a,
});

describe('actor settings', () => {
  it('start from the library without a cast member', () => {
    expect(actorSettings(actor(), [member])).toEqual({ scale: 1, colors: {} });
  });

  it('come from the cast member', () => {
    expect(actorSettings(actor({ cast: 'm' }), [member])).toEqual({
      scale: 1.4,
      colors: { hair: 'white', dress: 'blue' },
    });
  });

  it('take the overrides of the actor over the cast member', () => {
    const a = actor({ cast: 'm', overrides: { colors: { hair: 'black' } } });
    expect(actorSettings(a, [member])).toEqual({
      scale: 1.4,
      colors: { hair: 'black', dress: 'blue' },
    });
  });

  it('start from the library if the cast no longer has the cast member', () => {
    const a = actor({ cast: 'gone', overrides: { scale: 2 } });
    expect(actorSettings(a, [member])).toEqual({ scale: 2, colors: {} });
  });
});

describe('merged settings', () => {
  it('leave out what neither level sets', () => {
    expect(mergeSettings({}, {})).toEqual({});
    expect(mergeSettings({ scale: 2 }, { colors: { a: 'b' } })).toEqual({
      scale: 2,
      colors: { a: 'b' },
    });
  });
});
