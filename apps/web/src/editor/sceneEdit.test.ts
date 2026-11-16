import {
  type Action,
  type Actor,
  CARTOON_VERSION,
  type Scene,
} from '@toonhouse/model';
import { describe, expect, it } from 'vitest';

import {
  actionsOf,
  moveActor,
  moveBlock,
  moveStart,
  newScene,
  removeScene,
  setLength,
  startAction,
  stepSize,
} from './sceneEdit.ts';

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

  it('moves the start of an action, between its neighbours', () => {
    const actions = [wave('a', 1), wave('b', 2), wave('c', 4)];
    expect(moveStart(actions, 'b', 3)).toEqual([
      wave('a', 1),
      wave('b', 3),
      wave('c', 4),
    ]);
    expect(moveStart(actions, 'b', 0)[1]).toEqual(wave('b', 1.1));
    expect(moveStart(actions, 'b', 9)[1]).toEqual(wave('b', 3.9));
    expect(moveStart(actions, 'a', -3)[0]).toEqual(wave('a', 0));
  });
});

describe('moving a whole action', () => {
  const scene = (actions: Action[], length?: number): Scene => ({
    id: 's',
    background: 'park',
    backgroundActions: actions,
    actors: [],
    ...(length !== undefined && { length }),
  });
  const starts = (s: Scene) => actionsOf(s, null).map((a) => a.t);

  it('moves its start and its end together', () => {
    const s = scene([wave('a', 1), wave('b', 2), wave('c', 4), wave('d', 6)]);
    const moved = moveBlock(s, null, 'b', 2.5, 10);
    expect(moved.t).toBe(2.5);
    expect(starts(moved.scene)).toEqual([1, 2.5, 4.5, 6]);
  });

  it('keeps the actions in their order', () => {
    const s = scene([wave('a', 1), wave('b', 2), wave('c', 4), wave('d', 6)]);
    expect(starts(moveBlock(s, null, 'b', 0, 10).scene)).toEqual([
      1, 1.1, 3.1, 6,
    ]);
    expect(starts(moveBlock(s, null, 'b', 5, 10).scene)).toEqual([
      1, 3.9, 5.9, 6,
    ]);
  });

  it('makes the scene longer to keep the last action as long', () => {
    const s = scene([wave('a', 1), wave('b', 2)]);
    const later = moveBlock(s, null, 'b', 5, 10).scene;
    expect(starts(later)).toEqual([1, 5]);
    expect(later.length).toBe(13);
    expect(moveBlock(s, null, 'b', 1.5, 10).scene.length).toBeUndefined();
  });
});

describe('scene length', () => {
  it('ends the scene after its last action starts', () => {
    const s: Scene = {
      id: 's',
      background: 'park',
      backgroundActions: [wave('a', 5)],
      actors: [],
    };
    expect(setLength(s, 8).length).toBe(8);
    expect(setLength(s, 2).length).toBe(5.1);
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

describe('scenes', () => {
  it('removes a scene and keeps the others in order', () => {
    const [a, b, c] = [newScene(), newScene(), newScene()];
    const content = removeScene(
      { version: CARTOON_VERSION, scenes: [a, b, c] },
      b.id,
    );
    expect(content.scenes).toEqual([a, c]);
  });

  it('leaves a new empty scene when the last one goes', () => {
    const a = newScene();
    const content = removeScene(
      { version: CARTOON_VERSION, scenes: [a] },
      a.id,
    );
    expect(content.scenes).toHaveLength(1);
    expect(content.scenes[0]!.id).not.toBe(a.id);
    expect(content.scenes[0]!.actors).toEqual([]);
  });
});
