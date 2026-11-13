import type { BirdFrame, Clip } from '@toonhouse/model';

import { flap } from './flap.ts';
import { idle } from './idle.ts';
import { peck } from './peck.ts';
import { talk } from './talk.ts';
import { walk } from './walk.ts';

export { BIRD_WALK_SPEED } from './walk.ts';

/** The clips of a bird, in the order the studio lists them. */
export const BIRD_CLIPS: readonly Clip<BirdFrame>[] = [
  idle,
  walk,
  peck,
  flap,
  talk,
];
