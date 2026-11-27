import { CONTENT_LIMITS, isStorable } from '@toonhouse/api';
import {
  type Actor,
  CARTOON_VERSION,
  type CartoonContent,
  type CastMember,
} from '@toonhouse/model';
import { actorSettings } from '@toonhouse/renderer';
import { describe, expect, it } from 'vitest';

import {
  castFromActor,
  castUsers,
  clearOverride,
  overrideColor,
  overrideScale,
  removeCastMember,
  savedName,
} from './castEdit.ts';

const asset = { kind: 'character' as const, id: 'sunny/grandma' };
const member: CastMember = {
  id: 'm',
  name: 'Grandma',
  asset,
  settings: { scale: 1.4, colors: { hair: 'white', dress: 'blue' } },
};
const actor = (id: string, a: Partial<Actor> = {}): Actor => ({
  id,
  asset,
  at: { x: 0, y: 0 },
  facing: 1,
  actions: [],
  ...a,
});
const content = (actors: Actor[][]): CartoonContent => ({
  version: CARTOON_VERSION,
  cast: [member],
  scenes: actors.map((list, i) => ({
    id: `s${i}`,
    background: null,
    actors: list,
  })),
});

describe('overrides', () => {
  it('set a setting of one actor and clear it again', () => {
    const a = actor('a', { cast: 'm' });
    const red = overrideColor(a, 'dress', 'red');
    expect(red.overrides).toEqual({ colors: { dress: 'red' } });
    expect(clearOverride(red, { type: 'color', id: 'dress' })).toEqual(a);
    const big = overrideScale(a, 2);
    expect(clearOverride(big, { type: 'scale' })).toEqual(a);
  });

  it('keep the size inside the limits of the server', () => {
    const a = actor('a');
    expect(overrideScale(a, 0).overrides?.scale).toBe(CONTENT_LIMITS.scale.min);
    expect(overrideScale(a, 5000).overrides?.scale).toBe(
      CONTENT_LIMITS.scale.max,
    );
    expect(overrideScale(a, 1.23456).overrides?.scale).toBe(1.2346);
  });
});

describe('removing a cast member', () => {
  it('keeps its actors looking the same, without the cast member', () => {
    const a = actor('a', {
      cast: 'm',
      overrides: { colors: { hair: 'black' } },
    });
    const other = actor('b');
    const before = content([[a], [other]]);
    expect(castUsers(before, 'm')).toBe(1);
    const after = removeCastMember(before, 'm');
    expect(after.cast).toEqual([]);
    const moved = after.scenes[0]!.actors[0]!;
    expect(moved.cast).toBeUndefined();
    expect(actorSettings(moved, after.cast)).toEqual(
      actorSettings(a, before.cast),
    );
    expect(after.scenes[1]!.actors[0]).toBe(other);
  });
});

describe('a cast member from an actor', () => {
  it('takes the settings of the actor, which then has no overrides', () => {
    const a = actor('a', {
      overrides: { scale: 0.7, colors: { hair: 'red' } },
    });
    const b = actor('b', { overrides: { scale: 2 } });
    const before = content([[a, b]]);
    const { content: after, member } = castFromActor(before, 's0', 'a', 'Mum');
    expect(member).toMatchObject({
      name: 'Mum',
      asset,
      settings: { scale: 0.7, colors: { hair: 'red' } },
    });
    const [na, nb] = after.scenes[0]!.actors;
    expect(na).toEqual({ ...actor('a'), cast: member!.id });
    expect(nb).toBe(b);
    expect(actorSettings(na!, after.cast)).toEqual(
      actorSettings(a, before.cast),
    );
  });

  it('does nothing for an actor that has a cast member', () => {
    const before = content([[actor('a', { cast: 'm' })]]);
    expect(castFromActor(before, 's0', 'a', 'X').content).toBe(before);
  });
});

describe('a saved name', () => {
  const max = CONTENT_LIMITS.castName;

  it('keeps a name inside the limit', () => {
    expect(savedName('Grandma')).toBe('Grandma');
    expect(savedName('x'.repeat(max + 5))).toBe('x'.repeat(max));
  });

  it('does not split an emoji at the limit', () => {
    const name = savedName('x'.repeat(max - 1) + '😀');
    expect(name).toBe('x'.repeat(max - 1));
    expect(isStorable(name)).toBe(true);
  });
});

describe('storable text', () => {
  it('accepts text with emojis', () => {
    expect(isStorable('')).toBe(true);
    expect(isStorable('Mummo 😀👍')).toBe(true);
  });

  it('refuses NUL and lone surrogates', () => {
    expect(isStorable('a\u0000b')).toBe(false);
    expect(isStorable('half \ud83d')).toBe(false);
    expect(isStorable('\ud83d x')).toBe(false);
    expect(isStorable('\ude00 x')).toBe(false);
    expect(isStorable('\ud83d\ud83d\ude00')).toBe(false);
  });
});
