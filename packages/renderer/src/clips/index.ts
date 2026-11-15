import type {
  BackgroundFrame,
  BirdFrame,
  Clip,
  ClipId,
  ClipKind,
  CutoutFrame,
  PropFrame,
  RabbitFrame,
} from '@toonhouse/model';

import { BACKGROUND_CLIPS } from './background/index.ts';
import { BIRD_CLIPS } from './bird/index.ts';
import { idle } from './idle.ts';
import { PROP_CLIPS } from './prop/index.ts';
import { RABBIT_CLIPS } from './rabbit/index.ts';
import { talk } from './talk.ts';
import { walk } from './walk.ts';
import { wave } from './wave.ts';

export { backgroundClips } from './background/index.ts';
export { BIRD_WALK_SPEED } from './bird/index.ts';
export { HIP_HEIGHT } from './body.ts';
export { RABBIT_HOP_SPEED } from './rabbit/index.ts';
export { WALK_SPEED } from './walk.ts';

/** The clips of a cutout character, in the order the studio lists them. */
export const CUTOUT_CLIPS: readonly Clip<CutoutFrame>[] = [
  idle,
  walk,
  wave,
  talk,
];

export { BACKGROUND_CLIPS, BIRD_CLIPS, PROP_CLIPS, RABBIT_CLIPS };

const byKind: Record<ClipKind, readonly Clip[]> = {
  cutout: CUTOUT_CLIPS,
  bird: BIRD_CLIPS,
  rabbit: RABBIT_CLIPS,
  prop: PROP_CLIPS,
  background: BACKGROUND_CLIPS,
};

/** The clips that work on the rigs of a kind, or on backgrounds. */
export function clipsFor(kind: ClipKind): readonly Clip[] {
  return byKind[kind];
}

export function clipById(kind: 'cutout', id: ClipId): Clip<CutoutFrame>;
export function clipById(kind: 'bird', id: ClipId): Clip<BirdFrame>;
export function clipById(kind: 'rabbit', id: ClipId): Clip<RabbitFrame>;
export function clipById(kind: 'prop', id: ClipId): Clip<PropFrame>;
export function clipById(kind: 'background', id: ClipId): Clip<BackgroundFrame>;
export function clipById(kind: ClipKind, id: ClipId): Clip;
export function clipById(kind: ClipKind, id: ClipId): Clip {
  const clip = byKind[kind].find((c) => c.id === id);
  if (!clip) throw new Error(`Unknown ${kind} clip: ${id}`);
  return clip;
}
