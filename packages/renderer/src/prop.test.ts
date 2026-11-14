import type { PropRig } from '@toonhouse/model';
import { describe, expect, it } from 'vitest';

import testBush from '../../../assets/fixtures/props/test-bush/rig.json';
import testTree from '../../../assets/fixtures/props/test-tree/rig.json';
import { clipById } from './clips/index.ts';
import { drawCharacter, type DrawNode } from './draw.ts';
import { drawOrder } from './order.ts';
import { swayOf } from './prop.ts';

const tree = testTree as PropRig;
const bush = testBush as PropRig;
const rustle = clipById('prop', 'rustle');
const idle = clipById('prop', 'idle');

function layers(node: DrawNode): string[] {
  if (node.type === 'part') {
    return [node.layer ? `${node.part}.${node.layer}` : node.part];
  }
  if (node.type === 'group') return node.children.flatMap(layers);
  return [];
}

describe('prop', () => {
  it('draws the bones in the order of the rig', () => {
    expect(drawOrder(bush).map((e) => e.id)).toEqual([
      'left',
      'right',
      'middle',
    ]);
    expect(
      layers(drawCharacter(tree, idle.frameAt(0), { facing: 1 }).node),
    ).toEqual([
      'crownBack',
      'trunk',
      'crown',
      'crown.leaves',
      'crown',
      'crown.leaves',
    ]);
  });

  it('stands on the pivot of the root part', () => {
    const { skeleton } = drawCharacter(tree, rustle.frameAt(1.3), {
      facing: 1,
    });
    expect(skeleton.joints.find((j) => j.name === 'trunk')!.at).toEqual({
      x: 0,
      y: 0,
    });
  });

  it('stays still in the idle clip', () => {
    const at = (t: number) =>
      drawCharacter(tree, idle.frameAt(t), { facing: 1 });
    expect(at(1.7)).toEqual(at(0));
    for (let i = 0; i < tree.bones.length; i++) {
      expect(swayOf(tree, i, idle.frameAt(2))).toEqual({
        angle: 0,
        squash: 0,
      });
    }
  });

  it('rustles the same at the same time, and again after a loop', () => {
    for (const t of [0, 0.4, 2.25, 5.9]) {
      const a = drawCharacter(tree, rustle.frameAt(t), { facing: 1 });
      expect(drawCharacter(tree, rustle.frameAt(t), { facing: 1 })).toEqual(a);
      const b = drawCharacter(tree, rustle.frameAt(t + rustle.duration), {
        facing: 1,
      });
      const ja = a.skeleton.joints;
      b.skeleton.joints.forEach((j, i) => {
        expect(j.at.x).toBeCloseTo(ja[i]!.at.x, 6);
        expect(j.at.y).toBeCloseTo(ja[i]!.at.y, 6);
      });
    }
  });

  it('sways each clump within its amplitude and out of phase', () => {
    const peak = tree.bones.map(() => 0);
    const at = (t: number) =>
      tree.bones.map((_, i) => swayOf(tree, i, rustle.frameAt(t)));
    for (let t = 0; t < rustle.duration; t += 1 / 30) {
      at(t).forEach((s, i) => {
        peak[i] = Math.max(peak[i]!, Math.abs(s.angle));
        const bone = tree.bones[i]!;
        expect(s.squash).toBeLessThanOrEqual(bone.sway?.squash ?? 0);
        expect(s.squash).toBeGreaterThanOrEqual(0);
      });
    }
    tree.bones.forEach((b, i) => {
      const max = ((b.sway?.angle ?? 0) * Math.PI) / 180;
      expect(peak[i]).toBeGreaterThan(max * 0.5);
      expect(peak[i]).toBeLessThanOrEqual(max + 1e-9);
    });
    const [, , left, right] = at(0.5);
    expect(left!.angle).not.toBeCloseTo(right!.angle, 3);
  });
});
