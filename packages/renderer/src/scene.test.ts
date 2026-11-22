import type { Background, ClipKind } from '@toonhouse/model';
import { describe, expect, it } from 'vitest';

import type { CastActor, CastScene } from './cast.ts';
import {
  clipOf,
  clipsFor,
  RABBIT_HOP_SPEED,
  WALK_SPEED,
} from './clips/index.ts';
import {
  actorEnd,
  actorStateAt,
  backgroundStateAt,
  clipSpeed,
  isMoving,
  MIN_SCENE_LENGTH,
  minSceneLength,
  sceneLength,
  walkTime,
} from './scene.ts';

/** A flat background where one rig pixel is one frame pixel. */
const flat: Background = {
  width: 1600,
  height: 900,
  layers: [{ id: 'ground', svg: 'ground.svg', depth: 1 }],
  ground: { layer: 'ground', start: { x: 800, y: 700 }, actorScale: 1 },
};

const actor = (
  actions: CastActor['actions'],
  at = { x: 0, y: 700 },
): CastActor => ({
  id: 'a',
  asset: { kind: 'character', id: 'boy' },
  at,
  facing: 1,
  settings: { scale: 1, colors: {} },
  actions,
});

describe('clip speed', () => {
  it('is the speed of the walk for a walk and 0 for clips in place', () => {
    expect(clipSpeed(clipOf('cutout', 'walk'))).toBeCloseTo(WALK_SPEED);
    expect(clipSpeed(clipOf('rabbit', 'hop'))).toBeCloseTo(RABBIT_HOP_SPEED);
    expect(clipSpeed(clipOf('cutout', 'wave'))).toBe(0);
    expect(clipSpeed(clipOf('background', 'day'))).toBe(0);
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
    const { duration } = clipOf('cutout', 'wave');
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

  it('slows down as it walks away on a background with a perspective', () => {
    // The actor is half as big at y = 400 and a tenth as big from y = 160 up.
    const deep: Background = {
      ...flat,
      ground: { ...flat.ground, perspective: { horizon: 100, y: 700 } },
    };
    const a = actor([
      { id: '1', t: 0, clip: 'walk', path: [{ x: 0, y: 100 }] },
    ]);
    // The size is 1 - l / 600 after l frame pixels, so l rig pixels take
    // -600 ln(1 - l / 600) rig pixels.
    const l = (d: number) => 600 * (1 - Math.exp(-d / 600));
    expect(actorStateAt(a, 'cutout', deep, 1).at.y).toBeCloseTo(
      700 - l(WALK_SPEED),
    );
    // Above y = 160 the size stays at a tenth.
    const toKnee = -600 * Math.log(0.1);
    const end = (toKnee + 60 / 0.1) / WALK_SPEED;
    expect(walkTime(a, 'cutout', deep, a.actions[0]!)).toBeCloseTo(end);
    const s = actorStateAt(a, 'cutout', deep, toKnee / WALK_SPEED + 1);
    expect(s.at.y).toBeCloseTo(160 - WALK_SPEED * 0.1);
  });
});

describe('a walk on the ground', () => {
  const far = { x: 20000, y: 700 };
  const moving = (kind: ClipKind) =>
    clipsFor(kind)
      .filter((c) => clipSpeed(c) > 0)
      .map((c) => [kind, c.id, c] as const);

  describe.each([...moving('cutout'), ...moving('bird'), ...moving('rabbit')])(
    '%s %s',
    (kind, _, clip) => {
      it('moves the actor as far as the clip moves the rig', () => {
        for (const clipStart of [0, 0.3]) {
          const a = actor([
            {
              id: '1',
              t: 1,
              clip: clip.id,
              path: [far],
              clipStart,
              speed: 1.5,
            },
          ]);
          const travelAt = (ct: number) => {
            const loops = Math.floor(ct / clip.duration);
            const frame = clip.frameAt(ct - loops * clip.duration);
            const end = clip.frameAt(clip.duration);
            if (frame.kind === 'background' || end.kind === 'background')
              return 0;
            return loops * end.travel + frame.travel;
          };
          const start = travelAt(clipStart * clip.duration);
          for (let t = 1; t < 1 + clip.duration / 2; t += 0.01) {
            const s = actorStateAt(a, kind, flat, t);
            expect(s.at.x).toBeCloseTo(travelAt(s.clipT) - start, 6);
          }
        }
      });

      it('arrives at the last point without a jump', () => {
        const end = { x: 300, y: 700 };
        const a = actor([{ id: '1', t: 0, clip: clip.id, path: [end] }]);
        const arrives = walkTime(a, kind, flat, a.actions[0]!)!;
        const before = actorStateAt(a, kind, flat, arrives - 1e-6);
        const after = actorStateAt(a, kind, flat, arrives + 1e-6);
        expect(before.clip).toBe(clip.id);
        expect(before.at.x).toBeCloseTo(300, 2);
        expect(after.clip).toBe('idle');
        expect(after.at.x).toBe(300);
        expect(after.clipT).toBeCloseTo(0, 5);
      });
    },
  );

  it('keeps the rabbit in place while it crouches before a hop', () => {
    const hop = clipOf('rabbit', 'hop');
    const a = actor([{ id: '1', t: 0, clip: 'hop', path: [far] }]);
    // The first hop crouches before it jumps, so the rabbit doesn't move yet.
    expect(actorStateAt(a, 'rabbit', flat, 0.1).at.x).toBe(0);
    // After one hop, it is one hop further.
    const period = hop.duration / 3;
    expect(actorStateAt(a, 'rabbit', flat, period).at.x).toBeCloseTo(
      RABBIT_HOP_SPEED * period,
    );
  });

  it('finishes the hop at the last point and sits when it lands', () => {
    const hop = clipOf('rabbit', 'hop');
    const period = hop.duration / 3;
    // 250 rig pixels is in the jump of the second hop.
    const a = actor([
      { id: '1', t: 0, clip: 'hop', path: [{ x: 250, y: 700 }] },
    ]);
    const arrives = walkTime(a, 'rabbit', flat, a.actions[0]!)!;
    expect(arrives).toBeCloseTo(2 * period, 6);
    expect(actorEnd(a, 'rabbit', flat)).toBe(arrives);
    expect(actorStateAt(a, 'rabbit', flat, arrives - 0.01)).toMatchObject({
      at: { x: 250, y: 700 },
      clip: 'hop',
    });
    expect(actorStateAt(a, 'rabbit', flat, arrives + 0.01)).toMatchObject({
      at: { x: 250, y: 700 },
      clip: 'idle',
    });
  });

  it('lands on a whole hop of the clip when the hop starts in the middle', () => {
    const hop = clipOf('rabbit', 'hop');
    const period = hop.duration / 3;
    const action = {
      id: '1',
      t: 1,
      clip: 'hop' as const,
      path: [{ x: 200, y: 700 }],
      clipStart: 0.5,
      speed: 2,
    };
    const arrives = walkTime(actor([action]), 'rabbit', flat, action)!;
    const landing = (hop.duration * 0.5 + arrives * 2) / period;
    expect(landing).toBeCloseTo(Math.round(landing), 6);
  });

  it('stops a walk at once at the last point', () => {
    const a = actor([
      { id: '1', t: 0, clip: 'walk', path: [{ x: 100, y: 700 }] },
    ]);
    expect(walkTime(a, 'cutout', flat, a.actions[0]!)).toBeCloseTo(
      100 / WALK_SPEED,
      5,
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
    const { duration } = clipOf('background', 'day');
    expect(backgroundStateAt(actions, 2).clipT).toBeCloseTo(duration / 2);
  });
});

describe('scene length', () => {
  const scene = (actors: CastActor[]): CastScene => ({
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
