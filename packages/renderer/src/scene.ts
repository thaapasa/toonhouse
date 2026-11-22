// Where the actors of a scene are and what they do at a time `t`. An action
// goes on until the next action of the same actor. A walk moves the actor
// along its path as far as its clip has moved the rig, so that the feet don't
// slide, and when the actor gets to the last point, it stands still until its
// next action.
import type {
  Action,
  Background,
  Clip,
  ClipId,
  ClipKind,
  Pt,
  Scene,
} from '@toonhouse/model';

import { actorScaleAt, minScaleY } from './background.ts';
import { bubbleEnd } from './bubbles/bubble.ts';
import { cameraEntryEnd } from './camera.ts';
import type { CastActor, CastScene } from './cast.ts';
import { clipOf, restClip } from './clips/index.ts';

/** The frames a second that the editor, the player and export step by. */
export const FPS = 30;
/** A scene is at least this long, in seconds. */
export const MIN_SCENE_LENGTH = 10;
/** The time after the last action of a scene, in seconds. */
const SCENE_TAIL = 4;

/** Whether an action with the clip walks along a path. */
export const isMoving = (kind: ClipKind, id: ClipId) =>
  clipSpeed(clipOf(kind, id)) > 0;

/** How fast an action plays its clip against the normal speed. */
export const actionSpeed = (action: Action) => action.speed ?? 1;

/** Where in one loop of its clip an action starts, from 0 to 1. */
export const clipStartOf = (action: Action) => action.clipStart ?? 0;

/** The time in the clip of an action, `elapsed` seconds after it starts. */
const clipTime = (action: Action, duration: number, elapsed: number) =>
  clipStartOf(action) * duration + elapsed * actionSpeed(action);

/** The actions in the order of their times. Actions at the same time keep their order. */
export const sortedActions = (actions: readonly Action[]) =>
  [...actions].sort((a, b) => a.t - b.t);

/** What an actor does at one moment. */
export interface ActorState {
  /** Where the ground point is, in the pixels of the background frame. */
  at: Pt;
  facing: 1 | -1;
  /** The clip to draw, and the time in it. Loop the clip to get its frame. */
  clip: ClipId;
  clipT: number;
  /** The action that goes on at the moment, if any. */
  action: Action | null;
}

/** How far a clip has moved its rig at `t` within one loop, in rig pixels. */
function frameTravel(clip: Clip, t: number): number {
  const frame = clip.frameAt(t);
  return frame.kind === 'background' ? 0 : frame.travel;
}

/** How many times `travelLookup` samples one loop of a clip. */
const LOOKUP_SAMPLES = 32;
/**
 * How many halvings `clipTimeAtTravel` does at most between two samples. For
 * a loop of 3 seconds this finds the time to about a microsecond, far less
 * than a pixel at any walking speed.
 */
const HALVINGS = 16;

const lookups = new WeakMap<Clip, number[]>();

/**
 * The travel of a clip at even steps over one loop, the last one at the end
 * of the loop. The timeline asks for walk times on every frame, and the
 * samples save most of the work. The same clip always gives the same
 * samples, so the cache doesn't change any result.
 */
function travelLookup(clip: Clip): number[] {
  let samples = lookups.get(clip);
  if (!samples) {
    samples = Array.from({ length: LOOKUP_SAMPLES + 1 }, (_, i) =>
      frameTravel(clip, (i / LOOKUP_SAMPLES) * clip.duration),
    );
    lookups.set(clip, samples);
  }
  return samples;
}

/**
 * How fast a clip moves its rig forward on average, in rig pixels a second.
 * 0 for the clips that stay in place.
 */
export function clipSpeed(clip: Clip): number {
  return travelLookup(clip)[LOOKUP_SAMPLES]! / clip.duration;
}

/**
 * How far a clip has moved its rig at the time `ct` in the clip, in rig
 * pixels, counting the loops before it. The scene assumes that `travel` never
 * goes down within a loop.
 */
function travelAt(clip: Clip, ct: number): number {
  const loops = Math.floor(ct / clip.duration);
  return (
    loops * travelLookup(clip)[LOOKUP_SAMPLES]! +
    frameTravel(clip, ct - loops * clip.duration)
  );
}

/**
 * The first time in a clip when its rig has moved `travel` rig pixels from the
 * start of the clip. The clips only give the travel at a time, so this finds
 * the samples around it. Between them, the travel of a walk is often even, so
 * the first guess is on a straight line between the samples. If that misses,
 * it searches by halves.
 */
function clipTimeAtTravel(clip: Clip, travel: number): number {
  const samples = travelLookup(clip);
  const perLoop = samples[LOOKUP_SAMPLES]!;
  const loops = Math.floor(travel / perLoop);
  const rest = travel - loops * perLoop;
  const start = loops * clip.duration;
  if (rest <= 0) return start;
  const gap = clip.duration / LOOKUP_SAMPLES;
  // The first sample at or past `rest`. Sample 0 has a travel of 0.
  let i = 1;
  while (i < LOOKUP_SAMPLES && samples[i]! < rest) i++;
  let lo = (i - 1) * gap;
  let hi = i * gap;
  const from = samples[i - 1]!;
  const guess = lo + (gap * (rest - from)) / (samples[i]! - from);
  if (Math.abs(frameTravel(clip, guess) - rest) < 1e-6) return start + guess;
  for (let k = 0; k < HALVINGS; k++) {
    const mid = (lo + hi) / 2;
    if (frameTravel(clip, mid) >= rest) hi = mid;
    else lo = mid;
  }
  return start + hi;
}

/**
 * How far the rig of a walking action has moved `elapsed` seconds after the
 * action starts, in rig pixels.
 */
function walkedAt(clip: Clip, action: Action, elapsed: number): number {
  const start = clipTime(action, clip.duration, 0);
  return (
    travelAt(clip, clipTime(action, clip.duration, elapsed)) -
    travelAt(clip, start)
  );
}

/**
 * How long a walking action takes to move its rig `distance` rig pixels, and
 * then to finish its step, see `Clip.step`.
 */
function timeToWalk(clip: Clip, action: Action, distance: number): number {
  const start = clipTime(action, clip.duration, 0);
  let end = clipTimeAtTravel(clip, travelAt(clip, start) + distance);
  // The margin keeps an arrival right at a landing from waiting a whole step.
  if (clip.step) end = Math.ceil(end / clip.step - 1e-4) * clip.step;
  return Math.max(0, (end - start) / actionSpeed(action));
}

/**
 * The rig pixels that an actor walks on the line from `a` to `b`, and the
 * point on the line after `d` rig pixels. `scaleAt` gives the frame pixels
 * for one rig pixel at a height. It must be linear in y between `a` and `b`,
 * so that both have a closed form: the integral of 1 / scale over the line.
 */
function linearLine(a: Pt, b: Pt, scaleAt: (y: number) => number) {
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  const s0 = scaleAt(a.y);
  const grow = (scaleAt(b.y) - s0) / s0;
  const even = Math.abs(grow) < 1e-9;
  return {
    cost: even ? length / s0 : (length * Math.log1p(grow)) / (s0 * grow),
    at(d: number): Pt {
      const u = even
        ? (d * s0) / length
        : Math.expm1((d * s0 * grow) / length) / grow;
      return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
    },
  };
}

/**
 * The parts of the line from `a` to `b` where the size of the actor is linear
 * in y. The line splits where it crosses `knee`, see `minScaleY`.
 */
function linearParts(a: Pt, b: Pt, knee: number | null): [Pt, Pt][] {
  if (knee === null || (a.y - knee) * (b.y - knee) >= 0) return [[a, b]];
  const u = (knee - a.y) / (b.y - a.y);
  const mid = { x: a.x + (b.x - a.x) * u, y: knee };
  return [
    [a, mid],
    [mid, b],
  ];
}

interface WalkResult {
  at: Pt;
  facing: 1 | -1;
  /**
   * The rig pixels of the whole path if the actor got to the last point, or
   * null if not there yet.
   */
  arrived: number | null;
}

/**
 * Walks `distance` rig pixels from `from` through the points. An actor is
 * smaller further away, so a rig pixel covers fewer frame pixels there.
 */
function walkAlong(
  bg: Background,
  actor: CastActor,
  from: Pt,
  path: readonly Pt[],
  facing: 1 | -1,
  distance: number,
): WalkResult {
  const scaleAt = (y: number) => actorScaleAt(bg, y) * actor.settings.scale;
  const knee = minScaleY(bg);
  let at = from;
  let left = distance;
  let spent = 0;
  for (const to of path) {
    const dx = to.x - at.x;
    if (Math.abs(dx) > 0.5) facing = dx > 0 ? 1 : -1;
    for (const [a, b] of linearParts(at, to, knee)) {
      const line = linearLine(a, b, scaleAt);
      if (line.cost > left) return { at: line.at(left), facing, arrived: null };
      left -= line.cost;
      spent += line.cost;
    }
    at = to;
  }
  return { at, facing, arrived: spent };
}

/**
 * Where an actor is and what it does at time `t`. `kind` is the rig kind of
 * the actor, which sets its clips.
 */
export function actorStateAt(
  actor: CastActor,
  kind: ClipKind,
  bg: Background,
  t: number,
): ActorState {
  let at = actor.at;
  let facing = actor.facing;
  const actions = sortedActions(actor.actions);
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i]!;
    if (action.t > t) break;
    const next = actions[i + 1];
    // The action goes on at `t` unless the next one has started by then.
    const current = !next || next.t > t;
    const until = current ? t : next.t;
    const clip = clipOf(kind, action.clip);
    const elapsed = until - action.t;
    if (clipSpeed(clip) > 0 && action.path?.length) {
      const walk = walkAlong(
        bg,
        actor,
        at,
        action.path,
        facing,
        walkedAt(clip, action, elapsed),
      );
      at = walk.at;
      facing = walk.facing;
      if (current) {
        // At the last point, the actor finishes its step in place, and then
        // it stands still until its next action.
        const arrived =
          walk.arrived === null ? null : timeToWalk(clip, action, walk.arrived);
        if (arrived === null || elapsed < arrived) {
          const clipT = clipTime(action, clip.duration, elapsed);
          return { at, facing, clip: clip.id, clipT, action };
        }
        return {
          at,
          facing,
          clip: restClip(kind).id,
          clipT: elapsed - arrived,
          action,
        };
      }
    } else if (current) {
      const clipT = clipTime(action, clip.duration, elapsed);
      return { at, facing, clip: clip.id, clipT, action };
    }
  }
  return { at, facing, clip: restClip(kind).id, clipT: t, action: null };
}

/**
 * How long an action of an actor walks before it gets to its last point, or
 * null if the action doesn't walk. The next action can stop it earlier.
 */
export function walkTime(
  actor: CastActor,
  kind: ClipKind,
  bg: Background,
  action: Action,
): number | null {
  const clip = clipOf(kind, action.clip);
  if (clipSpeed(clip) === 0 || !action.path?.length) return null;
  const from = actorStateAt(actor, kind, bg, action.t);
  const walk = walkAlong(
    bg,
    actor,
    from.at,
    action.path,
    from.facing,
    Infinity,
  );
  return timeToWalk(clip, action, walk.arrived ?? 0);
}

/**
 * When the last action of an actor ends by itself: when the last walk gets
 * to its last point, or else when the last action starts.
 */
export function actorEnd(
  actor: CastActor,
  kind: ClipKind,
  bg: Background,
): number {
  const actions = sortedActions(actor.actions);
  const last = actions.at(-1);
  if (!last) return 0;
  return last.t + (walkTime(actor, kind, bg, last) ?? 0);
}

/** The clip of the background at time `t`, and the time in it. */
export function backgroundStateAt(
  actions: readonly Action[],
  t: number,
): { clip: ClipId; clipT: number; action: Action | null } {
  const action = sortedActions(actions).findLast((a) => a.t <= t) ?? null;
  if (!action) return { clip: 'idle', clipT: t, action: null };
  const { duration } = clipOf('background', action.clip);
  return {
    clip: action.clip,
    clipT: clipTime(action, duration, t - action.t),
    action,
  };
}

/**
 * The shortest length that the user can set for a scene: a bit after its last
 * action or bubble starts, so that each shows on the timeline, and at least a
 * second, so that there is something to play.
 */
export function minSceneLength(scene: Scene): number {
  const starts = [
    ...scene.backgroundActions,
    ...scene.actors.flatMap((a) => a.actions),
    ...(scene.bubbles ?? []),
    ...(scene.camera?.entries ?? []),
  ].map((a) => a.t);
  return Math.max(1, Math.max(0, ...starts) + 0.1);
}

/**
 * The length of a scene in seconds. It is the length that the user has set,
 * or else a few seconds after the last action or bubble ends, in whole
 * seconds, and at
 * least `MIN_SCENE_LENGTH`. `kindOf` gives the rig kind of an actor.
 */
export function sceneLength(
  scene: CastScene,
  bg: Background | null,
  kindOf: (actor: CastActor) => ClipKind | null,
): number {
  if (scene.length !== undefined)
    return Math.max(scene.length, minSceneLength(scene));
  let end = Math.max(
    0,
    ...scene.backgroundActions.map((a) => a.t),
    ...(scene.bubbles ?? []).map(bubbleEnd),
    ...(scene.camera?.entries ?? []).map(cameraEntryEnd),
  );
  if (bg) {
    for (const actor of scene.actors) {
      const kind = kindOf(actor);
      if (kind) end = Math.max(end, actorEnd(actor, kind, bg));
    }
  }
  return Math.max(MIN_SCENE_LENGTH, Math.ceil(end + SCENE_TAIL));
}
