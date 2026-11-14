import type { Background, BackgroundFrame, Clip } from '@toonhouse/model';

/** Everything where it rests. */
export const idle: Clip<BackgroundFrame> = {
  id: 'idle',
  kind: 'background',
  duration: 4,
  loops: true,
  frameAt: () => ({ kind: 'background', arc: null, drift: null }),
};

const DAY = 20;

/**
 * A day: the sun rises, crosses the sky and sets. Every part with an arc
 * moves along it at an even speed.
 */
export const day: Clip<BackgroundFrame> = {
  id: 'day',
  kind: 'background',
  duration: DAY,
  loops: true,
  frameAt: (t) => ({
    kind: 'background',
    arc: Math.min(Math.max(t / DAY, 0), 1),
    drift: null,
  }),
};

/**
 * Long enough that a cloud can drift slowly and still go across a whole
 * number of times in a loop.
 */
const DRIFT = 120;

/** The clouds drift slowly across the sky. */
export const drift: Clip<BackgroundFrame> = {
  id: 'drift',
  kind: 'background',
  duration: DRIFT,
  loops: true,
  frameAt: (t) => ({
    kind: 'background',
    arc: null,
    drift: { t, loop: DRIFT },
  }),
};

/** The clips of a background, in the order the studio lists them. */
export const BACKGROUND_CLIPS: readonly Clip<BackgroundFrame>[] = [
  idle,
  day,
  drift,
];

/**
 * The clips that move something on the background: `day` needs a part with
 * an arc, and `drift` a part that drifts.
 */
export function backgroundClips(
  background: Background,
): readonly Clip<BackgroundFrame>[] {
  const parts = Object.values(background.parts ?? {});
  return BACKGROUND_CLIPS.filter(
    (c) =>
      (c.id !== 'day' || parts.some((p) => p.arc)) &&
      (c.id !== 'drift' || parts.some((p) => p.drift)),
  );
}
