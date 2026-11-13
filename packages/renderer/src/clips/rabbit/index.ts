import type { Clip, RabbitFrame } from '@toonhouse/model';

import { hop } from './hop.ts';
import { idle } from './idle.ts';
import { lookout } from './lookout.ts';
import { talk } from './talk.ts';

export { RABBIT_HOP_SPEED } from './hop.ts';

/** The clips of a rabbit, in the order the studio lists them. */
export const RABBIT_CLIPS: readonly Clip<RabbitFrame>[] = [
  idle,
  hop,
  lookout,
  talk,
];
