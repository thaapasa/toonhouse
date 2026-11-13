import type { BirdRig, Clip, CutoutRig, Rig } from '@toonhouse/model';
import { describe, expect, it } from 'vitest';

import boy from '../../../assets/characters/boy/rig.json';
import chicken from '../../../assets/characters/chicken/rig.json';
import { legJoint } from './bird.ts';
import {
  BIRD_CLIPS,
  BIRD_WALK_SPEED,
  clipById,
  CUTOUT_CLIPS,
  WALK_SPEED,
} from './clips/index.ts';
import { drawCharacter, type DrawNode } from './draw.ts';

const rig = boy as CutoutRig;
const bird = chicken as BirdRig;

/** Every number in a value, in a fixed order. */
function numbers(v: unknown): number[] {
  if (typeof v === 'number') return [v];
  if (Array.isArray(v)) return v.flatMap(numbers);
  if (v && typeof v === 'object') return Object.values(v).flatMap(numbers);
  return [];
}

function parts(node: DrawNode): string[] {
  if (node.type === 'part') return [node.part];
  if (node.type === 'group') return node.children.flatMap(parts);
  return [];
}

const cases: [string, Clip, Rig][] = [
  ...CUTOUT_CLIPS.map((c): [string, Clip, Rig] => [`cutout ${c.id}`, c, rig]),
  ...BIRD_CLIPS.map((c): [string, Clip, Rig] => [`bird ${c.id}`, c, bird]),
];

describe.each(cases)('clip %s', (_, clip, clipRig) => {
  it('gives the same frame for the same time', () => {
    for (const t of [0, 0.37, clip.duration / 2]) {
      expect(clip.frameAt(t)).toEqual(clip.frameAt(t));
    }
  });

  it('ends where it starts when it loops', () => {
    const a = clip.frameAt(0);
    const b = clip.frameAt(clip.duration);
    const pa = numbers(a.pose);
    const pb = numbers(b.pose);
    pa.forEach((v, i) => expect(pb[i]).toBeCloseTo(v, 6));
    expect(b.face).toEqual(a.face);
  });

  it('draws finite numbers at every frame', () => {
    for (let t = 0; t <= clip.duration; t += 1 / 30) {
      const drawing = drawCharacter(clipRig, clip.frameAt(t), {
        facing: 1,
      });
      for (const n of numbers(drawing)) expect(Number.isFinite(n)).toBe(true);
    }
  });
});

describe.each([
  ['cutout', clipById('cutout', 'walk'), WALK_SPEED],
  ['bird', clipById('bird', 'walk'), BIRD_WALK_SPEED],
] as const)('%s walk', (_, walk, speed) => {
  it('keeps a planted foot still against the ground', () => {
    // When the near foot is on the ground, its position plus the distance
    // travelled stays the same.
    let planted: number[] = [];
    for (let t = 0; t < walk.duration; t += 1 / 120) {
      const f = walk.frameAt(t);
      if (f.pose.footNear.y === 0) planted.push(f.pose.footNear.x + f.travel);
      else if (planted.length > 0) {
        const spread = Math.max(...planted) - Math.min(...planted);
        expect(spread).toBeLessThan(0.5);
        planted = [];
      }
    }
  });

  it('moves at the walking speed', () => {
    expect(walk.frameAt(1).travel).toBeCloseTo(speed, 6);
  });
});

describe('drawCharacter', () => {
  it('opens the hand for the wave', () => {
    const wave = clipById('cutout', 'wave');
    expect(
      parts(drawCharacter(rig, wave.frameAt(0), { facing: 1 }).node),
    ).not.toContain('handOpen');
    expect(
      parts(drawCharacter(rig, wave.frameAt(1.5), { facing: 1 }).node),
    ).toContain('handOpen');
  });

  it('mirrors the skeleton when facing left', () => {
    const frame = clipById('cutout', 'idle').frameAt(0);
    const right = drawCharacter(rig, frame, { facing: 1 }).skeleton.joints;
    const left = drawCharacter(rig, frame, { facing: -1 }).skeleton.joints;
    right.forEach((j, i) => {
      expect(left[i]!.at.x).toBeCloseTo(-j.at.x, 6);
      expect(left[i]!.at.y).toBeCloseTo(j.at.y, 6);
    });
  });
});

describe('bird', () => {
  it('opens the wings for the flap', () => {
    const flap = clipById('bird', 'flap');
    expect(
      parts(drawCharacter(bird, flap.frameAt(0), { facing: 1 }).node),
    ).not.toContain('wingOpen');
    expect(
      parts(drawCharacter(bird, flap.frameAt(1), { facing: 1 }).node),
    ).toContain('wingOpen');
  });

  it('bends the leg backwards and keeps the bone lengths', () => {
    const hip = { x: 0, y: 0 };
    const ankle = { x: 10, y: 90 };
    const knee = legJoint(hip, ankle, 55, 55);
    expect(Math.hypot(knee.x - hip.x, knee.y - hip.y)).toBeCloseTo(55, 6);
    expect(Math.hypot(ankle.x - knee.x, ankle.y - knee.y)).toBeCloseTo(55, 6);
    // Behind the line from the hip to the ankle.
    const cross = ankle.x * knee.y - ankle.y * knee.x;
    expect(cross).toBeGreaterThan(0);
  });

  it('refuses a clip of another kind', () => {
    expect(() =>
      drawCharacter(bird, clipById('cutout', 'idle').frameAt(0), {
        facing: 1,
      }),
    ).toThrow();
  });
});
