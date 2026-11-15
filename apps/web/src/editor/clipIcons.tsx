import type { ClipId } from '@toonhouse/model';
import type { ComponentType } from 'react';

import {
  CloudIcon,
  FlapIcon,
  HopIcon,
  LookoutIcon,
  PeckIcon,
  RustleIcon,
  StandIcon,
  SunIcon,
  TalkIcon,
  WalkIcon,
  WaveIcon,
} from '../components/icons.tsx';

export const CLIP_ICONS: Record<ClipId, ComponentType> = {
  idle: StandIcon,
  walk: WalkIcon,
  wave: WaveIcon,
  talk: TalkIcon,
  peck: PeckIcon,
  flap: FlapIcon,
  hop: HopIcon,
  lookout: LookoutIcon,
  rustle: RustleIcon,
  day: SunIcon,
  drift: CloudIcon,
};

/** The colors of the actions of each clip on the timeline. */
export const CLIP_COLORS: Record<ClipId, string> = {
  idle: '#4a4d57',
  walk: '#8db4f0',
  wave: '#e6c36e',
  talk: '#e7a1b3',
  peck: '#d9b38c',
  flap: '#b9a3e8',
  hop: '#9ccb8b',
  lookout: '#8fd0c9',
  rustle: '#9ccb8b',
  day: '#f2c46b',
  drift: '#b8c4d6',
};
