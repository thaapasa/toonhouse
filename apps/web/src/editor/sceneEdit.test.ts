import type { Action, Actor } from '@toonhouse/model';
import { describe, expect, it } from 'vitest';

import { moveAction, moveActor, startAction, stepSize } from './sceneEdit.ts';

const wave = (id: string, t: number): Action => ({ id, t, clip: 'wave' });

describe('actions', () => {
  it('replaces the action that starts at the same time', () => {
    const actions = startAction([wave('a', 1), wave('b', 2)], {
      id: 'c',
      t: 2,
      clip: 'talk',
    });
    expect(actions.map((a) => a.id)).toEqual(['a', 'c']);
  });

  it('moves an action in time, never before the start', () => {
    const actions = moveAction([wave('a', 1), wave('b', 2)], 'b', -3);
    expect(actions).toEqual([wave('a', 1), wave('b', 0)]);
  });

  it('lets a moved action take the place of one at the same time', () => {
    const actions = moveAction([wave('a', 1), wave('b', 2)], 'b', 1);
    expect(actions).toEqual([wave('b', 1)]);
  });
});

describe('actors', () => {
  it('moves the walks of an actor with it', () => {
    const actor: Actor = {
      id: 'x',
      asset: { kind: 'character', id: 'boy' },
      at: { x: 10, y: 20 },
      facing: 1,
      scale: 1,
      actions: [
        { id: 'w', t: 0, clip: 'walk', path: [{ x: 100, y: 20 }] },
        wave('a', 3),
      ],
    };
    const moved = moveActor(actor, { x: 5, y: -5 });
    expect(moved.at).toEqual({ x: 15, y: 15 });
    expect(moved.actions[0]!.path).toEqual([{ x: 105, y: 15 }]);
    expect(moved.actions[1]).toEqual(wave('a', 3));
  });

  it('steps the size up and down, and stops at the ends', () => {
    expect(stepSize(1, 1)).toBe(1.4);
    expect(stepSize(1, -1)).toBe(0.7);
    expect(stepSize(0.8, -1)).toBe(0.7);
    expect(stepSize(4, 1)).toBe(4);
  });
});
