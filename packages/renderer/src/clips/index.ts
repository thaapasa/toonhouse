import type { Clip, ClipId } from '@toonhouse/model';

import { idle } from './idle.ts';
import { talk } from './talk.ts';
import { walk } from './walk.ts';
import { wave } from './wave.ts';

export { WALK_SPEED } from './walk.ts';

/** The clips of a cutout character, in the order the studio lists them. */
export const CLIPS: readonly Clip[] = [idle, walk, wave, talk];

export function clipById(id: ClipId): Clip {
  const clip = CLIPS.find((c) => c.id === id);
  if (!clip) throw new Error(`Unknown clip: ${id}`);
  return clip;
}
