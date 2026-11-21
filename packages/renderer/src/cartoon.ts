// The time of the cartoon. Until the cartoon has shots, it plays each scene
// from the start to the end, one after another, and leaves out the scenes
// whose background isn't in the library, such as a scene without one yet.
// Shots will change how the time of the cartoon maps to a scene and a time
// in it, and the player and export get it from here.
import type { Background, CartoonContent, Scene } from '@toonhouse/model';

import { actorKind, type Library } from './frame.ts';
import { clamp } from './math.ts';
import { sceneLength } from './scene.ts';

export interface CartoonEntry {
  scene: Scene;
  background: Background;
  /** When the scene starts in the cartoon, in seconds. */
  start: number;
  duration: number;
}

export interface CartoonTimeline {
  entries: CartoonEntry[];
  duration: number;
}

/** The scenes that the cartoon plays, and when. */
export function cartoonTimeline(
  content: CartoonContent,
  library: Library,
): CartoonTimeline {
  const entries: CartoonEntry[] = [];
  let start = 0;
  for (const scene of content.scenes) {
    const background =
      scene.background === null
        ? undefined
        : library.background(scene.background);
    if (!background) continue;
    const duration = sceneLength(scene, background, (a) =>
      actorKind(library, a.asset),
    );
    entries.push({ scene, background, start, duration });
    start += duration;
  }
  return { entries, duration: start };
}

/**
 * The scene that plays at time `t` of the cartoon, and the time in it, or
 * null if the cartoon has nothing to play. The end of the cartoon shows the
 * end of the last scene.
 */
export function cartoonTime(
  timeline: CartoonTimeline,
  t: number,
): { entry: CartoonEntry; t: number } | null {
  const { entries } = timeline;
  const entry = entries.find((e) => t < e.start + e.duration) ?? entries.at(-1);
  if (!entry) return null;
  return { entry, t: clamp(t - entry.start, 0, entry.duration) };
}
