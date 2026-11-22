import type {
  BirdFrame,
  Clip,
  ClipId,
  ClipKind,
  CutoutFrame,
  PropFrame,
  RabbitFrame,
} from '@toonhouse/model';

import { BIRD_CLIPS } from './bird/index.ts';
import { idle } from './idle.ts';
import { PROP_CLIPS } from './prop/index.ts';
import { RABBIT_CLIPS } from './rabbit/index.ts';
import { talk } from './talk.ts';
import { walk } from './walk.ts';
import { wave } from './wave.ts';

export { BIRD_WALK_SPEED } from './bird/index.ts';
export { HIP_HEIGHT } from './body.ts';
export { inWind } from './prop/index.ts';
export { RABBIT_HOP_SPEED } from './rabbit/index.ts';
export { WALK_SPEED } from './walk.ts';

/** The clips of a cutout character, in the order the studio lists them. */
export const CUTOUT_CLIPS: readonly Clip<CutoutFrame>[] = [
  idle,
  walk,
  wave,
  talk,
];

export { BIRD_CLIPS, PROP_CLIPS, RABBIT_CLIPS };

const byKind: Record<ClipKind, readonly Clip[]> = {
  cutout: CUTOUT_CLIPS,
  bird: BIRD_CLIPS,
  rabbit: RABBIT_CLIPS,
  prop: PROP_CLIPS,
};

/** The clips that work on the rigs of a kind. */
export function clipsFor(kind: ClipKind): readonly Clip[] {
  return byKind[kind];
}

export function clipOf(kind: 'cutout', id: ClipId): Clip<CutoutFrame>;
export function clipOf(kind: 'bird', id: ClipId): Clip<BirdFrame>;
export function clipOf(kind: 'rabbit', id: ClipId): Clip<RabbitFrame>;
export function clipOf(kind: 'prop', id: ClipId): Clip<PropFrame>;
export function clipOf(kind: ClipKind, id: ClipId): Clip;
/**
 * The clip of a kind with the id. A kind that doesn't have the clip gets its
 * rest clip, so that a saved action with an unknown clip still plays.
 */
export function clipOf(kind: ClipKind, id: ClipId): Clip {
  return byKind[kind].find((c) => c.id === id) ?? restClip(kind);
}

export function restClip(kind: 'cutout'): Clip<CutoutFrame>;
export function restClip(kind: 'bird'): Clip<BirdFrame>;
export function restClip(kind: 'rabbit'): Clip<RabbitFrame>;
export function restClip(kind: 'prop'): Clip<PropFrame>;
export function restClip(kind: ClipKind): Clip;
/**
 * The clip that a rig rests in when no action plays: the first clip of its
 * kind, which stands still.
 */
export function restClip(kind: ClipKind): Clip {
  return byKind[kind][0]!;
}
