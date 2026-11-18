import type { Actor, Background, Scene } from '@toonhouse/model';
import { describe, expect, it } from 'vitest';

import { RABBIT_HOP_SPEED, WALK_SPEED } from './clips/index.ts';
import { clipById } from './clips/index.ts';
import {
  actorEnd,
  actorStateAt,
  backgroundStateAt,
  clipSpeed,
  isMoving,
  MIN_SCENE_LENGTH,
  minSceneLength,
  sceneLength,
} from './scene.ts';

/** A flat background where one rig pixel is one frame pixel. */
const flat: Background = {
  width: 1600,
  height: 900,
  layers: [{ id: 'ground', svg: 'ground.svg', depth: 1 }],
  ground: { layer: 'ground', start: { x: 800, y: 700 }, actorScale: 1 },
};

const actor = (actions: Actor['actions'], at = { x: 0, y: 700 }): Actor => ({
  id: 'a',
  asset: { kind: 'character', id: 'boy' },
  at,
  facing: 1,
  scale: 1,
  actions,
});

describe('clip speed', () => {
  it('is the speed of the walk for a walk and 0 for clips in place', () => {
    expect(clipSpeed(clipById('cutout', 'walk'))).toBeCloseTo(WALK_SPEED);
    expect(clipSpeed(clipById('rabbit', 'hop'))).toBeCloseTo(RABBIT_HOP_SPEED);
    expect(clipSpeed(clipById('cutout', 'wave'))).toBe(0);
    expect(clipSpeed(clipById('background', 'day'))).toBe(0);
    expect(isMoving('bird', 'walk')).toBe(true);
    expect(isMoving('prop', 'rustle')).toBe(false);
  });
});

describe('actor state', () => {
  it('stands at its start point before its first action', () => {
    const s = actorStateAt(
      actor([{ id: '1', t: 2, clip: 'wave' }]),
      'cutout',
      flat,
      1,
    );
    expect(s).toMatchObject({
      at: { x: 0, y: 700 },
      clip: 'idle',
      clipT: 1,
      action: null,
    });
  });

  it('plays an action from its start until the next action', () => {
    const a = actor([
      { id: '2', t: 3, clip: 'talk' },
      { id: '1', t: 1, clip: 'wave' },
    ]);
    expect(actorStateAt(a, 'cutout', flat, 2.5)).toMatchObject({
      clip: 'wave',
      clipT: 1.5,
    });
    expect(actorStateAt(a, 'cutout', flat, 4)).toMatchObject({
      clip: 'talk',
      clipT: 1,
    });
  });

  it('walks along the path at the speed of the walk clip', () => {
    const far = { x: WALK_SPEED * 10, y: 700 };
    const a = actor([{ id: '1', t: 1, clip: 'walk', path: [far] }]);
    const s = actorStateAt(a, 'cutout', flat, 3);
    expect(s.clip).toBe('walk');
    expect(s.at.x).toBeCloseTo(WALK_SPEED * 2);
    expect(s.at.y).toBeCloseTo(700);
  });

  it('walks and plays the clip faster at a higher speed', () => {
    const far = { x: WALK_SPEED * 10, y: 700 };
    const a = actor([{ id: '1', t: 1, clip: 'walk', path: [far], speed: 2 }]);
    const s = actorStateAt(a, 'cutout', flat, 3);
    expect(s.at.x).toBeCloseTo(WALK_SPEED * 4);
    expect(s.clipT).toBeCloseTo(4);
    expect(actorEnd(a, 'cutout', flat)).toBeCloseTo(6);
  });

  it('plays a clip in place slower at a lower speed', () => {
    const a = actor([{ id: '1', t: 1, clip: 'wave', speed: 0.5 }]);
    expect(actorStateAt(a, 'cutout', flat, 3).clipT).toBeCloseTo(1);
  });

  it('starts the clip from the middle', () => {
    const a = actor([{ id: '1', t: 1, clip: 'wave', clipStart: 0.5 }]);
    const { duration } = clipById('cutout', 'wave');
    expect(actorStateAt(a, 'cutout', flat, 2).clipT).toBeCloseTo(
      duration / 2 + 1,
    );
  });

  it('stands still after the last point', () => {
    const a = actor([
      { id: '1', t: 0, clip: 'walk', path: [{ x: WALK_SPEED, y: 700 }] },
    ]);
    const s = actorStateAt(a, 'cutout', flat, 3);
    expect(s.clip).toBe('idle');
    expect(s.clipT).toBeCloseTo(2);
    expect(s.at.x).toBeCloseTo(WALK_SPEED);
    expect(actorEnd(a, 'cutout', flat)).toBeCloseTo(1);
  });

  it('stops walking where it is when the next action starts', () => {
    const a = actor([
      { id: '1', t: 0, clip: 'walk', path: [{ x: WALK_SPEED * 10, y: 700 }] },
      { id: '2', t: 2, clip: 'wave' },
    ]);
    const s = actorStateAt(a, 'cutout', flat, 5);
    expect(s.clip).toBe('wave');
    expect(s.at.x).toBeCloseTo(WALK_SPEED * 2);
  });

  it('starts the next action at its exact start time', () => {
    const a = actor([
      { id: '1', t: 0, clip: 'walk', path: [{ x: WALK_SPEED * 10, y: 700 }] },
      { id: '2', t: 2, clip: 'wave' },
    ]);
    const s = actorStateAt(a, 'cutout', flat, 2);
    expect(s).toMatchObject({ clip: 'wave', clipT: 0 });
    expect(s.action?.id).toBe('2');
  });

  it('turns to the direction of the walk and keeps facing that way', () => {
    const a = actor(
      [
        { id: '1', t: 0, clip: 'walk', path: [{ x: 100, y: 700 }] },
        { id: '2', t: 5, clip: 'wave' },
      ],
      { x: 500, y: 700 },
    );
    expect(actorStateAt(a, 'cutout', flat, 0.1).facing).toBe(-1);
    expect(actorStateAt(a, 'cutout', flat, 6).facing).toBe(-1);
  });

  it('walks slower in frame pixels further away on a background with a perspective', () => {
    const deep: Background = {
      ...flat,
      ground: { ...flat.ground, perspective: { horizon: 100, y: 700 } },
    };
    const near = actor([
      { id: '1', t: 0, clip: 'walk', path: [{ x: 5000, y: 700 }] },
    ]);
    const away = actor(
      [{ id: '1', t: 0, clip: 'walk', path: [{ x: 5000, y: 400 }] }],
      { x: 0, y: 400 },
    );
    expect(actorStateAt(near, 'cutout', deep, 1).at.x).toBeCloseTo(WALK_SPEED);
    expect(actorStateAt(away, 'cutout', deep, 1).at.x).toBeCloseTo(
      WALK_SPEED / 2,
    );
  });
});

describe('background state', () => {
  it('rests until its first action', () => {
    const actions = [{ id: '1', t: 2, clip: 'day' as const }];
    expect(backgroundStateAt(actions, 1)).toMatchObject({
      clip: 'idle',
      clipT: 1,
    });
    expect(backgroundStateAt(actions, 3)).toMatchObject({
      clip: 'day',
      clipT: 1,
    });
  });

  it('starts a day with the sun in the middle of the sky', () => {
    const actions = [{ id: '1', t: 2, clip: 'day' as const, clipStart: 0.5 }];
    const { duration } = clipById('background', 'day');
    expect(backgroundStateAt(actions, 2).clipT).toBeCloseTo(duration / 2);
  });
});

describe('scene length', () => {
  const scene = (actors: Actor[]): Scene => ({
    id: 's',
    background: 'flat',
    backgroundActions: [],
    actors,
  });

  it('is the minimum length for an empty scene', () => {
    expect(sceneLength(scene([]), flat, () => 'cutout')).toBe(MIN_SCENE_LENGTH);
  });

  it('goes a few seconds past the end of the last walk', () => {
    const a = actor([
      { id: '1', t: 8, clip: 'walk', path: [{ x: WALK_SPEED * 5, y: 700 }] },
    ]);
    expect(sceneLength(scene([a]), flat, () => 'cutout')).toBe(17);
  });

  it('is the length that the user has set, shorter or longer', () => {
    const a = actor([{ id: '1', t: 2, clip: 'wave' }]);
    const short = { ...scene([a]), length: 3.5 };
    const long = { ...scene([a]), length: 40 };
    expect(sceneLength(short, flat, () => 'cutout')).toBe(3.5);
    expect(sceneLength(long, flat, () => 'cutout')).toBe(40);
  });

  it('does not end before the last action starts', () => {
    const a = actor([{ id: '1', t: 6, clip: 'wave' }]);
    const s = { ...scene([a]), length: 2 };
    expect(minSceneLength(s)).toBeCloseTo(6.1);
    expect(sceneLength(s, flat, () => 'cutout')).toBeCloseTo(6.1);
    expect(minSceneLength(scene([]))).toBe(1);
  });
});
