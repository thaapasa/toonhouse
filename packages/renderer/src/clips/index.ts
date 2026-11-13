import type {
  BirdFrame,
  Clip,
  ClipId,
  CutoutFrame,
  RigKind,
} from '@toonhouse/model';

import { BIRD_CLIPS } from './bird/index.ts';
import { idle } from './idle.ts';
import { talk } from './talk.ts';
import { walk } from './walk.ts';
import { wave } from './wave.ts';

export { BIRD_WALK_SPEED } from './bird/index.ts';
export { WALK_SPEED } from './walk.ts';

/** The clips of a cutout character, in the order the studio lists them. */
export const CUTOUT_CLIPS: readonly Clip<CutoutFrame>[] = [
  idle,
  walk,
  wave,
  talk,
];

export { BIRD_CLIPS };

const byKind: Record<RigKind, readonly Clip[]> = {
  cutout: CUTOUT_CLIPS,
  bird: BIRD_CLIPS,
};

/** The clips that work on the rigs of a kind. */
export function clipsFor(kind: RigKind): readonly Clip[] {
  return byKind[kind];
}

export function clipById(kind: 'cutout', id: ClipId): Clip<CutoutFrame>;
export function clipById(kind: 'bird', id: ClipId): Clip<BirdFrame>;
export function clipById(kind: RigKind, id: ClipId): Clip;
export function clipById(kind: RigKind, id: ClipId): Clip {
  const clip = byKind[kind].find((c) => c.id === id);
  if (!clip) throw new Error(`Unknown ${kind} clip: ${id}`);
  return clip;
}
