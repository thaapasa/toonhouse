import type { Actor, Background, CutoutRig, Scene } from '@toonhouse/model';
import { describe, expect, it } from 'vitest';

import boy from '../../../assets/characters/boy/rig.json';
import testHills from '../../../assets/fixtures/backgrounds/test-hills/background.json';
import { actorScaleAt } from './background.ts';
import { cameraBounds } from './camera.ts';
import { clipOf } from './clips/index.ts';
import { actorKind, type Library, sceneFrame } from './frame.ts';

const bg = testHills as Background;
const rig = boy as CutoutRig;

const library: Library = {
  rig: (a) => (a.kind === 'character' && a.id === 'boy' ? rig : undefined),
  background: () => bg,
  actorFont: () => 'bangers',
  backgroundFont: () => 'indie-flower',
};

const actor = (id: string, asset: string, actions: Actor['actions'] = []) =>
  ({
    id,
    asset: { kind: 'character', id: asset },
    at: { x: 800, y: 900 },
    facing: 1,
    scale: 1.5,
    actions,
  }) satisfies Actor;

const bubble = (id: string, actorId?: string) => ({
  id,
  t: 0,
  text: 'Hi',
  width: 400,
  shape: 'speech' as const,
  fontSize: 40,
  color: '#000',
  fill: '#fff',
  border: 'solid' as const,
  borderColor: '#000',
  borderWidth: 4,
  at: { x: 0, y: -400 },
  tail: true,
  ...(actorId && { actorId }),
});

const scene: Scene = {
  id: 's',
  background: 'hills',
  backgroundActions: [],
  actors: [
    actor('a', 'boy', [{ id: 'w', t: 0, clip: 'wave' }]),
    actor('gone', 'removed'),
  ],
  bubbles: [bubble('attached', 'a'), bubble('free'), bubble('orphan', 'gone')],
};

describe('scene frame', () => {
  it('leaves out the actors whose asset the library does not have', () => {
    const frame = sceneFrame(scene, bg, library, 1);
    expect(frame.actors.map((p) => p.actor.id)).toEqual(['a']);
    expect(actorKind(library, scene.actors[1]!.asset)).toBeNull();
    expect(frame.bubbles.map((b) => b.bubble.id)).toEqual(['attached', 'free']);
  });

  it('loops the clip of an action', () => {
    const { duration } = clipOf('cutout', 'wave');
    const a = sceneFrame(scene, bg, library, 0.4).actors[0]!;
    const b = sceneFrame(scene, bg, library, 0.4 + duration).actors[0]!;
    expect(b.drawing).toEqual(a.drawing);
  });

  it('sizes the actor and its anchor by the background and the actor', () => {
    const p = sceneFrame(scene, bg, library, 0).actors[0]!;
    const size = actorScaleAt(bg, 900) * 1.5;
    expect(p.anchor.size).toBeCloseTo(size);
    expect(p.anchor.head.y).toBeLessThan(900);
    expect(p.box!.y + p.box!.height).toBeGreaterThan(p.anchor.head.y);
  });

  it('takes the bubble fonts from the library', () => {
    const { bubbleContext } = sceneFrame(scene, bg, library, 0);
    expect(bubbleContext.fontOf(scene.bubbles![0]!)).toBe('bangers');
    expect(bubbleContext.fontOf(scene.bubbles![1]!)).toBe('indie-flower');
  });

  it('shows the bubbles at full size while they pop when asked', () => {
    const free = (t: number, pop = true) =>
      sceneFrame(scene, bg, library, t, { pop }).bubbles.find(
        (b) => b.bubble.id === 'free',
      )!.node;
    expect(free(0)).not.toEqual(free(1));
    expect(free(0, false)).toEqual(free(1));
  });

  describe('bubbles under the camera', () => {
    // The camera shows the top left quarter of the background at zoom 2.
    const camera = { x: bg.width / 4, y: bg.height / 4, zoom: 2 };
    const free = { ...bubble('free'), at: { x: 900, y: 300 } };
    const zoomed: Scene = {
      ...scene,
      bubbles: [free],
      camera: { start: camera, moves: [] },
    };
    const boxOf = (s: Scene, ground = false) =>
      sceneFrame(s, bg, library, 1, { ground }).bubbles[0]!.box;

    it('keeps its size in the picture and stays inside it', () => {
      const box = boxOf(zoomed);
      const whole = boxOf({ ...zoomed, camera: { moves: [] } });
      expect(box.width).toBeCloseTo(whole.width);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(bg.width);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(bg.height);
    });

    it('shows on the ground layer inside the camera box, smaller', () => {
      const box = boxOf(zoomed, true);
      const view = cameraBounds(bg, camera);
      expect(box.width).toBeCloseTo(boxOf(zoomed).width / 2);
      expect(box.x).toBeGreaterThanOrEqual(view.x);
      expect(box.x + box.width).toBeLessThanOrEqual(view.x + view.width);
    });
  });
});
