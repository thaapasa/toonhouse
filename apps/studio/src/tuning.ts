// The numbers that fit the shared clips to a character: the size of each part,
// the length, the width and the outline of the limbs, and the motion settings
// of a cutout rig.
import type { Rig } from '@toonhouse/model';
import { HIP_HEIGHT } from '@toonhouse/renderer';

export type TuneGroup = 'sizes' | 'limbs' | 'motion';

export interface TuneField {
  /** Unique within the rig, and the text key of its label. */
  id: string;
  /**
   * Where the value is in the rig: a key of the rig, or a key of an object
   * in the rig, such as `['scales', 'head']`.
   */
  path: readonly [string] | readonly [string, string];
  group: TuneGroup;
  min: number;
  max: number;
  step: number;
  /**
   * The value that the renderer uses if the rig doesn't set one. A field
   * without a fallback is always in the rig.
   */
  fallback?: number;
}

type Range = Pick<TuneField, 'min' | 'max' | 'step'>;
const SCALE: Range = { min: 0.1, max: 2, step: 0.01 };
const LENGTH: Range = { min: 40, max: 500, step: 1 };
const WIDTH: Range = { min: 2, max: 80, step: 1 };
const OUTLINE: Range = { min: 0, max: 20, step: 0.5 };
const OFFSET: Range = { min: -100, max: 100, step: 1 };

const limb = (
  id: string,
  path: TuneField['path'],
  range: Range,
): TuneField => ({ id, path, group: 'limbs', ...range });

function sizeFields(rig: Rig): TuneField[] {
  if (!('scales' in rig)) return [];
  const scales: Record<string, number | undefined> = rig.scales;
  // The scales that a rig may leave out, after the scale they come after,
  // and their fallbacks.
  const optional: [string, string, number][] =
    rig.kind === 'cutout'
      ? [
          ['torso', 'head', 1],
          ['handOpen', 'hand', rig.scales.hand],
        ]
      : [];
  // A fixed order, so that a field doesn't move when the rig gets a value.
  const keys = Object.keys(scales).filter(
    (k) => !optional.some(([o]) => o === k),
  );
  for (const [key, after] of optional) {
    keys.splice(keys.indexOf(after) + 1, 0, key);
  }
  return keys.map((key) => {
    const fallback = optional.find(([k]) => k === key)?.[2];
    return {
      id: `scale.${key}`,
      path: ['scales', key],
      group: 'sizes',
      ...SCALE,
      ...(fallback === undefined ? {} : { fallback }),
    };
  });
}

function limbFields(rig: Rig): TuneField[] {
  switch (rig.kind) {
    case 'cutout':
      return [
        limb('limbs.legLength', ['limbs', 'legLength'], LENGTH),
        limb('limbs.armLength', ['limbs', 'armLength'], LENGTH),
        limb('limbs.legWidth', ['limbs', 'legWidth'], WIDTH),
        limb('limbs.armWidth', ['limbs', 'armWidth'], WIDTH),
        limb('limbs.outlineWidth', ['limbs', 'outlineWidth'], OUTLINE),
      ];
    case 'bird':
      return [
        limb('legs.thighWidth', ['legs', 'thighWidth'], WIDTH),
        limb('legs.shankWidth', ['legs', 'shankWidth'], WIDTH),
        limb('rig.outlineWidth', ['outlineWidth'], OUTLINE),
      ];
    case 'rabbit':
      return [
        limb('legs.armWidth', ['legs', 'armWidth'], WIDTH),
        limb('legs.shankWidth', ['legs', 'shankWidth'], WIDTH),
        limb('rig.outlineWidth', ['outlineWidth'], OUTLINE),
      ];
    default:
      return [];
  }
}

function motionFields(rig: Rig): TuneField[] {
  if (rig.kind !== 'cutout') return [];
  const motion = (key: string, range: Range, fallback: number): TuneField => ({
    id: `motion.${key}`,
    path: ['motion', key],
    group: 'motion',
    ...range,
    fallback,
  });
  return [
    motion('hipHeight', { min: 120, max: 360, step: 1 }, HIP_HEIGHT),
    motion('feetOffset', OFFSET, 0),
    motion('groundOffset', OFFSET, 0),
  ];
}

/** The fields that the rig has, in the order of the panel. */
export const tuneFields = (rig: Rig): TuneField[] => [
  ...sizeFields(rig),
  ...limbFields(rig),
  ...motionFields(rig),
];

type Bag = Record<string, unknown>;

/** The object that holds the value of the field, and its key there. */
function holderOf(rig: Rig, f: TuneField): [Bag | undefined, string] {
  if (f.path.length === 1) return [rig as unknown as Bag, f.path[0]];
  const [outer, key] = f.path;
  return [(rig as unknown as Bag)[outer] as Bag | undefined, key];
}

/** Whether the rig sets the field itself, instead of using the fallback. */
export function isTuned(rig: Rig, f: TuneField): boolean {
  const [holder, key] = holderOf(rig, f);
  return typeof holder?.[key] === 'number';
}

/** The value of a field, or its fallback if the rig doesn't set it. */
export function tuneValue(rig: Rig, f: TuneField): number {
  const [holder, key] = holderOf(rig, f);
  const v = holder?.[key];
  return typeof v === 'number' ? v : (f.fallback ?? 0);
}

/**
 * The rig with the field set to `value`. With `undefined`, a field with a
 * fallback is removed, so that the rig uses the fallback again, and an object
 * that it leaves empty is removed too.
 *
 * The hip height scales the leg length with it, so that the legs keep the same
 * bend at the new height.
 */
export function withTune(
  rig: Rig,
  f: TuneField,
  value: number | undefined,
): Rig {
  const next = setTune(rig, f, value);
  if (f.id !== 'motion.hipHeight' || next.kind !== 'cutout') return next;
  const before = tuneValue(rig, f);
  const after = tuneValue(next, f);
  if (before <= 0 || before === after) return next;
  const legLength = round2((next.limbs.legLength * after) / before);
  return { ...next, limbs: { ...next.limbs, legLength } };
}

/** Rounds to two decimals, so that dragging a slider back and forth doesn't drift. */
const round2 = (v: number) => Math.round(v * 100) / 100;

function setTune(rig: Rig, f: TuneField, value: number | undefined): Rig {
  if (value === undefined && f.fallback === undefined) return rig;
  const next = { ...rig } as unknown as Bag;
  if (f.path.length === 1) {
    if (value === undefined) delete next[f.path[0]];
    else next[f.path[0]] = value;
    return next as unknown as Rig;
  }
  const [outer, key] = f.path;
  const inner = { ...(next[outer] as Bag | undefined) };
  if (value === undefined) delete inner[key];
  else inner[key] = value;
  if (Object.keys(inner).length === 0) delete next[outer];
  else next[outer] = inner;
  return next as unknown as Rig;
}
