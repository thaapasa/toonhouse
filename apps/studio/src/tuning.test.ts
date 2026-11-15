import type { CutoutRig, Rig } from '@toonhouse/model';
import { HIP_HEIGHT } from '@toonhouse/renderer';
import { describe, expect, it } from 'vitest';

import boy from '../../../assets/characters/boy/rig.json';
import chicken from '../../../assets/characters/chicken/rig.json';
import testTree from '../../../assets/fixtures/props/test-tree/rig.json';
import { isTuned, tuneFields, tuneValue, withTune } from './tuning.ts';

// The boy without the motion settings and the torso scale of his rig file.
const rig: CutoutRig = { ...(boy as CutoutRig) };
delete rig.motion;
rig.scales = { ...rig.scales };
delete rig.scales.torso;
delete rig.scales.handOpen;
const field = (r: Rig, id: string) => tuneFields(r).find((f) => f.id === id)!;

describe('tuning', () => {
  it('lists the scales of the rig, the torso, the limbs and the motion', () => {
    const ids = tuneFields(rig).map((f) => f.id);
    expect(ids).toEqual([
      'scale.head',
      'scale.torso',
      'scale.hand',
      'scale.handOpen',
      'scale.foot',
      'limbs.legLength',
      'limbs.armLength',
      'limbs.legWidth',
      'limbs.armWidth',
      'limbs.outlineWidth',
      'motion.hipHeight',
      'motion.feetOffset',
      'motion.groundOffset',
    ]);
    expect(tuneFields(chicken as Rig).map((f) => f.id)).toEqual([
      ...Object.keys(chicken.scales).map((k) => `scale.${k}`),
      'legs.thighWidth',
      'legs.shankWidth',
      'rig.outlineWidth',
    ]);
    expect(tuneFields(testTree as Rig)).toEqual([]);
  });

  it('scales the leg length with the hip height', () => {
    const hip = field(rig, 'motion.hipHeight');
    const leg = rig.limbs.legLength;
    const lower = withTune(rig, hip, HIP_HEIGHT / 2) as CutoutRig;
    expect(lower.limbs.legLength).toBeCloseTo(leg / 2, 2);
    // Back to the default height gives back the leg length.
    const back = withTune(lower, hip, undefined) as CutoutRig;
    // Within the rounding to two decimals.
    expect(Math.abs(back.limbs.legLength - leg)).toBeLessThanOrEqual(0.011);
    expect(back.motion).toBeUndefined();
    // Other fields leave the legs alone.
    const feet = withTune(rig, field(rig, 'motion.feetOffset'), 10);
    expect((feet as CutoutRig).limbs.legLength).toBe(leg);
  });

  it('keeps the order when the rig gets a value', () => {
    const ids = tuneFields(rig).map((f) => f.id);
    const open = withTune(rig, field(rig, 'scale.handOpen'), 0.4);
    const torso = withTune(open, field(rig, 'scale.torso'), 0.9);
    expect(tuneFields(torso).map((f) => f.id)).toEqual(ids);
  });

  it('reads the fallback when the rig has no value', () => {
    expect(tuneValue(rig, field(rig, 'motion.hipHeight'))).toBe(HIP_HEIGHT);
    expect(tuneValue(rig, field(rig, 'scale.torso'))).toBe(1);
    expect(tuneValue(rig, field(rig, 'scale.handOpen'))).toBe(rig.scales.hand);
    expect(isTuned(rig, field(rig, 'motion.hipHeight'))).toBe(false);
    expect(tuneValue(rig, field(rig, 'limbs.legLength'))).toBe(
      rig.limbs.legLength,
    );
  });

  it('sets and removes a value', () => {
    const f = field(rig, 'motion.feetOffset');
    const tuned = withTune(rig, f, -10) as CutoutRig;
    expect(tuned.motion).toEqual({ feetOffset: -10 });
    expect(isTuned(tuned, f)).toBe(true);
    expect(withTune(tuned, f, undefined)).toEqual(rig);

    const head = field(rig, 'scale.head');
    expect((withTune(rig, head, 0.5) as CutoutRig).scales.head).toBe(0.5);
    const leg = field(rig, 'limbs.legLength');
    expect((withTune(rig, leg, 180) as CutoutRig).limbs.legLength).toBe(180);
    const outline = field(chicken as Rig, 'rig.outlineWidth');
    const thick = withTune(chicken as Rig, outline, 9);
    expect(tuneValue(thick, outline)).toBe(9);
    const shank = field(chicken as Rig, 'legs.shankWidth');
    expect(tuneValue(withTune(chicken as Rig, shank, 7), shank)).toBe(7);
    // A field without a fallback stays in the rig.
    expect(withTune(rig, leg, undefined)).toBe(rig);
  });
});
