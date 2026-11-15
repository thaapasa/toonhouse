// What the player plays. Until the cartoon has shots, the player plays each
// scene from the start to the end, one after another, and skips the scenes
// that have no background yet.
import type { CartoonContent, Scene } from '@toonhouse/model';
import { sceneLength } from '@toonhouse/renderer';

import {
  type BackgroundAsset,
  backgroundAsset,
  kindOf,
} from '../editor/library.ts';

export interface SequenceEntry {
  scene: Scene;
  bg: BackgroundAsset;
  /** When the scene starts in the cartoon, in seconds. */
  start: number;
  duration: number;
}

export interface Sequence {
  entries: SequenceEntry[];
  duration: number;
}

export function sequenceOf(content: CartoonContent): Sequence {
  const entries: SequenceEntry[] = [];
  let start = 0;
  for (const scene of content.scenes) {
    const bg = backgroundAsset(scene.background);
    if (!bg) continue;
    const duration = sceneLength(scene, bg.background, (a) => kindOf(a.asset));
    entries.push({ scene, bg, start, duration });
    start += duration;
  }
  return { entries, duration: start };
}

/**
 * The scene that plays at time `t` of the cartoon, and the time in it. The
 * end of the cartoon shows the end of the last scene.
 */
export function entryAt(
  sequence: Sequence,
  t: number,
): { entry: SequenceEntry; t: number } | null {
  const { entries } = sequence;
  const entry = entries.find((e) => t < e.start + e.duration) ?? entries.at(-1);
  if (!entry) return null;
  return {
    entry,
    t: Math.min(Math.max(t - entry.start, 0), entry.duration),
  };
}
