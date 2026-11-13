import type { CutoutRig } from '@toonhouse/model';
import { describe, expect, it } from 'vitest';

import boy from '../../../assets/characters/boy/rig.json';
import { clipById, CLIPS, WALK_SPEED } from './clips/index.ts';
import { drawCharacter, type DrawNode } from './draw.ts';

const rig = boy as CutoutRig;

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

describe.each(CLIPS.map((c) => [c.id, c] as const))('clip %s', (_, clip) => {
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
      const drawing = drawCharacter(rig, clip.frameAt(t), { facing: 1 });
      for (const n of numbers(drawing)) expect(Number.isFinite(n)).toBe(true);
    }
  });
});

describe('walk', () => {
  const walk = clipById('walk');

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
    expect(walk.frameAt(1).travel).toBeCloseTo(WALK_SPEED, 6);
  });
});

describe('drawCharacter', () => {
  it('opens the hand for the wave', () => {
    const wave = clipById('wave');
    expect(
      parts(drawCharacter(rig, wave.frameAt(0), { facing: 1 }).node),
    ).not.toContain('handOpen');
    expect(
      parts(drawCharacter(rig, wave.frameAt(1.5), { facing: 1 }).node),
    ).toContain('handOpen');
  });

  it('mirrors the skeleton when facing left', () => {
    const frame = clipById('idle').frameAt(0);
    const right = drawCharacter(rig, frame, { facing: 1 }).skeleton.joints;
    const left = drawCharacter(rig, frame, { facing: -1 }).skeleton.joints;
    right.forEach((j, i) => {
      expect(left[i]!.at.x).toBeCloseTo(-j.at.x, 6);
      expect(left[i]!.at.y).toBeCloseTo(j.at.y, 6);
    });
  });
});
