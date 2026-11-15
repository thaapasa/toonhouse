// Where the actors of a scene are and what they do at a time `t`. An action
// goes on until the next action of the same actor. A walk follows its path at
// the speed of its clip, so that the feet don't slide, and when the actor gets
// to the last point, it stands still until its next action.
import type {
  Action,
  Actor,
  Background,
  Clip,
  ClipId,
  ClipKind,
  Pt,
  Scene,
} from '@toonhouse/model';

import { actorScaleAt } from './background.ts';
import { clipsFor } from './clips/index.ts';

/** A scene is at least this long, in seconds. */
export const MIN_SCENE_LENGTH = 10;
/** The time after the last action of a scene, in seconds. */
const SCENE_TAIL = 4;

/**
 * How fast a clip moves its rig forward, in rig pixels a second. 0 for the
 * clips that stay in place.
 */
export function clipSpeed(clip: Clip): number {
  const end = clip.frameAt(clip.duration);
  if (end.kind === 'background') return 0;
  return end.travel / clip.duration;
}

/** The clip of a kind with the id, or its first clip, the idle one. */
export function clipOf(kind: ClipKind, id: ClipId): Clip {
  const clips = clipsFor(kind);
  return clips.find((c) => c.id === id) ?? clips[0]!;
}

/** Whether an action with the clip walks along a path. */
export const isMoving = (kind: ClipKind, id: ClipId) =>
  clipSpeed(clipOf(kind, id)) > 0;

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

interface WalkResult {
  at: Pt;
  facing: 1 | -1;
  /** How long it took to get to the last point, or null if not there yet. */
  arrived: number | null;
}

/**
 * Walks `time` seconds from `from` through the points. `speedAt` gives the
 * speed in frame pixels a second at a height of the frame, since an actor is
 * smaller further away. Each line between two points uses the mean of the
 * speeds at its ends.
 */
function walkAlong(
  from: Pt,
  path: readonly Pt[],
  facing: 1 | -1,
  speedAt: (y: number) => number,
  time: number,
): WalkResult {
  let at = from;
  let left = time;
  let spent = 0;
  for (const to of path) {
    const dx = to.x - at.x;
    const length = Math.hypot(dx, to.y - at.y);
    if (Math.abs(dx) > 0.5) facing = dx > 0 ? 1 : -1;
    const speed = (speedAt(at.y) + speedAt(to.y)) / 2;
    const needs = speed > 0 ? length / speed : 0;
    if (needs > left) {
      const u = left / needs;
      return {
        at: { x: at.x + dx * u, y: at.y + (to.y - at.y) * u },
        facing,
        arrived: null,
      };
    }
    left -= needs;
    spent += needs;
    at = to;
  }
  return { at, facing, arrived: spent };
}

/** Frame pixels a second for an actor walking with the clip at the height `y`. */
function speedOf(
  bg: Background,
  actor: Actor,
  clip: Clip,
): (y: number) => number {
  const speed = clipSpeed(clip);
  return (y) => speed * actorScaleAt(bg, y) * actor.scale;
}

/**
 * Where an actor is and what it does at time `t`. `kind` is the rig kind of
 * the actor, which sets its clips.
 */
export function actorStateAt(
  actor: Actor,
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
        at,
        action.path,
        facing,
        speedOf(bg, actor, clip),
        elapsed,
      );
      at = walk.at;
      facing = walk.facing;
      if (current) {
        // After the last point, the actor stands still until its next action.
        return walk.arrived === null
          ? { at, facing, clip: clip.id, clipT: elapsed, action }
          : {
              at,
              facing,
              clip: clipsFor(kind)[0]!.id,
              clipT: elapsed - walk.arrived,
              action,
            };
      }
    } else if (current) {
      return { at, facing, clip: clip.id, clipT: elapsed, action };
    }
  }
  return { at, facing, clip: clipsFor(kind)[0]!.id, clipT: t, action: null };
}

/**
 * How long an action of an actor walks before it gets to its last point, or
 * null if the action doesn't walk. The next action can stop it earlier.
 */
export function walkTime(
  actor: Actor,
  kind: ClipKind,
  bg: Background,
  action: Action,
): number | null {
  const clip = clipOf(kind, action.clip);
  if (clipSpeed(clip) === 0 || !action.path?.length) return null;
  const from = actorStateAt(actor, kind, bg, action.t);
  return walkAlong(
    from.at,
    action.path,
    from.facing,
    speedOf(bg, actor, clip),
    Infinity,
  ).arrived;
}

/**
 * When the last action of an actor ends by itself: when the last walk gets
 * to its last point, or else when the last action starts.
 */
export function actorEnd(actor: Actor, kind: ClipKind, bg: Background): number {
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
  return action
    ? { clip: action.clip, clipT: t - action.t, action }
    : { clip: 'idle', clipT: t, action: null };
}

/**
 * The length of a scene in seconds: a few seconds after the last action ends,
 * in whole seconds, and at least `MIN_SCENE_LENGTH`. `kindOf` gives the rig
 * kind of an actor.
 */
export function sceneLength(
  scene: Scene,
  bg: Background | null,
  kindOf: (actor: Actor) => ClipKind | null,
): number {
  let end = Math.max(0, ...scene.backgroundActions.map((a) => a.t));
  if (bg) {
    for (const actor of scene.actors) {
      const kind = kindOf(actor);
      if (kind) end = Math.max(end, actorEnd(actor, kind, bg));
    }
  }
  return Math.max(MIN_SCENE_LENGTH, Math.ceil(end + SCENE_TAIL));
}
