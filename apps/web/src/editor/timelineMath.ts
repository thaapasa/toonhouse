// The sizes and times of the timeline, without the DOM.
import type { Action, ClipKind } from '@toonhouse/model';
import { actionSpeed, clipOf, clipStartOf } from '@toonhouse/renderer';

/** The zoom levels of the zoom buttons, as times the zoom that fits. */
const ZOOM_LEVELS = [1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64, 96, 128];
/** The steps of the ruler in seconds. */
const TICK_STEPS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60];
/** The least room between two ticks of the ruler, in CSS pixels. */
const MIN_TICK_GAP = 56;
/** Loops closer than this, in CSS pixels, get no marks and don't snap. */
export const MIN_MARK_GAP = 16;
/** A dragged end snaps to a mark closer than this, in CSS pixels. */
const SNAP_DISTANCE = 8;
/** A loop narrower than this, in CSS pixels, shows as a flat fill. */
const MIN_TOOTH = 4;

/** The actions of one row of the timeline: an actor or the background. */
export interface TimelineRow {
  kind: ClipKind;
  actions: Action[];
  /** How long each walk walks before it gets to its last point. */
  walkTimes: Map<string, number>;
}

/** A dragged action moves in steps of a tenth of a second. */
export const snapTenth = (t: number) => Math.round(t * 10) / 10;

/**
 * How long the timeline is for a scene of `duration` seconds: the scene and an
 * empty part after it, so that the end of the scene shows and the user can
 * start new actions after it.
 */
export const timelineLength = (duration: number) =>
  duration + Math.max(5, Math.ceil(duration * 0.25));

/** A time as m:ss.s. */
export function formatTime(t: number) {
  const tenths = Math.floor(t * 10 + 1e-6);
  const m = Math.floor(tenths / 600);
  const s = Math.floor((tenths % 600) / 10);
  return `${m}:${String(s).padStart(2, '0')}.${tenths % 10}`;
}

/**
 * The ticks of the ruler at `pps` pixels a second, and their labels. The
 * labels show tenths only when the ticks are closer than a second.
 */
export function rulerTicks(
  length: number,
  pps: number,
): { t: number; label: string }[] {
  const step = TICK_STEPS.find((s) => s * pps >= MIN_TICK_GAP) ?? 60;
  const ticks = [];
  for (let i = 0; i * step <= length + 1e-6; i++) {
    const t = Math.round(i * step * 10) / 10;
    const label =
      step < 1
        ? formatTime(t)
        : `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
    ticks.push({ t, label });
  }
  return ticks;
}

/**
 * The zoom levels that the zoom buttons go to from `zoom`. The deepest zoom
 * shows a frame at `maxZoom`, which is a level too.
 */
export function zoomSteps(
  zoom: number,
  maxZoom: number,
): { in: number | undefined; out: number | undefined } {
  const levels = [...ZOOM_LEVELS.filter((l) => l < maxZoom - 1e-6), maxZoom];
  return {
    in: levels.find((l) => l > zoom + 1e-6),
    out: levels.findLast((l) => l < zoom - 1e-6),
  };
}

/**
 * The scroll after a zoom from `from` to `to` pixels a second that keeps the
 * time `x` pixels into the view at the same place.
 */
export const anchoredScroll = (
  scroll: number,
  x: number,
  from: number,
  to: number,
) => Math.max(0, ((scroll + x) / from) * to - x);

/**
 * The middle points of an action up to `until`: where its walk gets to the
 * last point, or else where its clip starts each new loop. Loops that are
 * closer than `MIN_MARK_GAP` at `pps` pixels a second have none.
 */
export function midPoints(
  a: Action,
  row: TimelineRow,
  until: number,
  pps: number,
): number[] {
  const walk = row.walkTimes.get(a.id);
  if (walk !== undefined) return a.t + walk <= until ? [a.t + walk] : [];
  const loop = clipOf(row.kind, a.clip).duration / actionSpeed(a);
  if (loop <= 0 || loop * pps < MIN_MARK_GAP) return [];
  // An action that starts in the middle of its clip gets to the next loop
  // sooner.
  const first = a.t + (1 - clipStartOf(a)) * loop;
  const points: number[] = [];
  for (let k = 0; first + k * loop <= until + 1e-6 && k < 1000; k++)
    points.push(first + k * loop);
  return points;
}

/**
 * The time for a dragged end at `t`: the closest of `targets` within
 * `SNAP_DISTANCE`, on a whole frame, or else the nearest tenth of a second.
 */
export function snapToTargets(
  t: number,
  targets: readonly number[],
  pps: number,
  fps: number,
): number {
  let best: number | null = null;
  for (const target of targets) {
    const d = Math.abs(target - t);
    if (d * pps <= SNAP_DISTANCE && (best === null || d < Math.abs(best - t)))
      best = target;
  }
  return best === null
    ? Math.max(snapTenth(t), 0)
    : Math.round(best * fps) / fps;
}

/**
 * The outline of the progress strip of an action that is `length` seconds
 * long, as points in CSS pixels with `height` at the bottom. A looping clip
 * rises once for each loop of `loop` seconds, and a walk rises once over the
 * `walk` seconds that it walks and is empty after that.
 */
export function progressPoints(opts: {
  length: number;
  pps: number;
  height: number;
  walk: number | undefined;
  loop: number;
  /** Where in its first loop the clip starts, from 0 to 1. */
  phase?: number;
}): [number, number][] {
  const { length, pps, height, walk, loop, phase = 0 } = opts;
  const y = (f: number) => height * (1 - f);
  const points: [number, number][] = [[0, height]];
  if (walk !== undefined) {
    const w = Math.min(walk, length);
    points.push([w * pps, y(walk > 0 ? w / walk : 1)], [w * pps, height]);
  } else if (loop > 0 && loop * pps < MIN_TOOTH) {
    points.push([0, y(0.5)], [length * pps, y(0.5)]);
  } else if (loop > 0) {
    // The first loop starts part of the way up.
    if (phase > 0) points.push([0, y(phase)]);
    for (let s = -phase * loop; s < length - 1e-9; s += loop) {
      const e = Math.min(s + loop, length);
      points.push([e * pps, y((e - s) / loop)], [e * pps, height]);
    }
  }
  points.push([length * pps, height]);
  return points;
}
