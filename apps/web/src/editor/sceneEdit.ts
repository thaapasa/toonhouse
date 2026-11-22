// Pure edits of the scenes of a cartoon. Each returns a new value and leaves
// the old one as it was, so that undo can keep the old values.
import { CONTENT_LIMITS } from '@toonhouse/api';
import type {
  Action,
  Actor,
  CartoonContent,
  Pt,
  Scene,
} from '@toonhouse/model';
import { clamp, minSceneLength, sortedActions } from '@toonhouse/renderer';

// The edits keep the content inside the limits that the server saves.
const L = CONTENT_LIMITS;

/** Two actions closer than this in seconds start at the same time. */
const SAME_TIME = 1e-6;

export const newId = () => crypto.randomUUID();

/**
 * A random seed for the look of the clouds, the rain, the snow, the mist and
 * the stars of a scene.
 */
export const newSeed = () => crypto.getRandomValues(new Uint32Array(1))[0]!;

export const newScene = (): Scene => ({
  id: newId(),
  background: null,
  actors: [],
  seed: newSeed(),
});

/**
 * Changes the item of `list` with the id. If the item is gone or `fn` returns
 * it as it was, it gives `list` itself. Then the edit leaves no undo step,
 * such as when a typed value is saved to an actor that the user removed.
 */
export function updateById<T extends { id: string }>(
  list: readonly T[],
  id: string,
  fn: (item: T) => T,
): T[] {
  let changed = false;
  const next = list.map((item) => {
    if (item.id !== id) return item;
    const v = fn(item);
    if (v !== item) changed = true;
    return v;
  });
  // The callers don't change the lists that they get.
  return changed ? next : (list as T[]);
}

export function updateScene(
  content: CartoonContent,
  sceneId: string,
  fn: (scene: Scene) => Scene,
): CartoonContent {
  const scenes = updateById(content.scenes, sceneId, fn);
  return scenes === content.scenes ? content : { ...content, scenes };
}

/**
 * Removes a scene. A cartoon in the editor always has a scene, so removing
 * the last one leaves a new empty scene.
 */
export function removeScene(
  content: CartoonContent,
  sceneId: string,
): CartoonContent {
  const scenes = content.scenes.filter((s) => s.id !== sceneId);
  return { ...content, scenes: scenes.length > 0 ? scenes : [newScene()] };
}

export function updateActor(
  scene: Scene,
  actorId: string,
  fn: (actor: Actor) => Actor,
): Scene {
  const actors = updateById(scene.actors, actorId, fn);
  return actors === scene.actors ? scene : { ...scene, actors };
}

/** Removes an actor and the bubbles attached to it. */
export const removeActor = (scene: Scene, actorId: string): Scene => ({
  ...scene,
  actors: scene.actors.filter((a) => a.id !== actorId),
  ...(scene.bubbles && {
    bubbles: scene.bubbles.filter((b) => b.actorId !== actorId),
  }),
});

/**
 * Starts an action. An action that starts at the same time is replaced, so
 * that an actor never does two things at once.
 */
export const startAction = (
  actions: readonly Action[],
  action: Action,
): Action[] => [
  ...actions.filter((a) => Math.abs(a.t - action.t) > SAME_TIME),
  action,
];

export const updateAction = (
  actions: readonly Action[],
  actionId: string,
  fn: (action: Action) => Action,
): Action[] => updateById(actions, actionId, fn);

export const removeAction = (
  actions: readonly Action[],
  actionId: string,
): Action[] => actions.filter((a) => a.id !== actionId);

/** The actions of an actor. */
export function actionsOf(scene: Scene, actorId: string): Action[] {
  return scene.actors.find((a) => a.id === actorId)?.actions ?? [];
}

/** Changes the actions of an actor. */
export function updateActions(
  scene: Scene,
  actorId: string,
  fn: (actions: readonly Action[]) => Action[],
): Scene {
  return updateActor(scene, actorId, (a) => {
    const actions = fn(a.actions);
    return actions === a.actions ? a : { ...a, actions };
  });
}

/** The shortest time between two actions that the user moves. */
const MIN_GAP = 0.1;
/**
 * A time inside the limits that the server saves, to a ten-thousandth of a
 * second, which keeps the saved data short.
 */
export const savedTime = (t: number) =>
  Math.round(clamp(t, 0, L.time) * 1e4) / 1e4;

/**
 * Moves the start of an action to `t`, between the actions before and after
 * it, so that the actions keep their order. The action before it gets longer
 * or shorter.
 */
export function moveStart(
  actions: readonly Action[],
  actionId: string,
  t: number,
): Action[] {
  const sorted = sortedActions(actions);
  const i = sorted.findIndex((a) => a.id === actionId);
  if (i < 0) return [...actions];
  const lo = i > 0 ? sorted[i - 1]!.t + MIN_GAP : 0;
  const hi = sorted[i + 1] ? sorted[i + 1]!.t - MIN_GAP : Infinity;
  const at = savedTime(clamp(t, lo, hi));
  return updateAction(actions, actionId, (a) => ({ ...a, t: at }));
}

/**
 * Moves a whole action of an actor, so that it starts at `t` and stays as
 * long: its start and the start of the next action move together. It stays
 * between the action before it and the action after the next one, so that
 * the actions keep their order. The last action ends with the scene, which
 * is `sceneEnd` seconds long, so the scene gets longer if needed. Gives the
 * new scene and the new start.
 */
export function moveBlock(
  scene: Scene,
  actorId: string,
  actionId: string,
  t: number,
  sceneEnd: number,
): { scene: Scene; t: number } {
  const sorted = sortedActions(actionsOf(scene, actorId));
  const i = sorted.findIndex((a) => a.id === actionId);
  const action = sorted[i];
  if (!action) return { scene, t };
  const next = sorted[i + 1];
  const after = sorted[i + 2];
  const lo = (i > 0 ? sorted[i - 1]!.t + MIN_GAP : 0) - action.t;
  const hi = next && after ? after.t - MIN_GAP - next.t : Infinity;
  const d = clamp(t - action.t, lo, hi);
  const moved = updateActions(scene, actorId, (actions) =>
    actions.map((a) =>
      a.id === action.id || a.id === next?.id
        ? { ...a, t: savedTime(a.t + d) }
        : a,
    ),
  );
  const end = sceneEnd + d;
  return {
    scene:
      !next && end > sceneEnd ? { ...moved, length: savedTime(end) } : moved,
    t: savedTime(action.t + d),
  };
}

/**
 * Sets the length of a scene, but not shorter than `minSceneLength`, so that
 * every action shows on the timeline.
 */
export const setLength = (scene: Scene, length: number): Scene => ({
  ...scene,
  length: savedTime(Math.max(length, minSceneLength(scene))),
});

/** A point to a tenth of a pixel, which keeps the saved data short. */
export const roundPoint = (p: Pt): Pt => ({
  x: Math.round(p.x * 10) / 10,
  y: Math.round(p.y * 10) / 10,
});

/** A point inside the limits that the server saves, to a tenth of a pixel. */
export const savedPoint = (p: Pt): Pt =>
  roundPoint({
    x: clamp(p.x, -L.coordinate, L.coordinate),
    y: clamp(p.y, -L.coordinate, L.coordinate),
  });

const shift = (p: Pt, d: Pt): Pt => savedPoint({ x: p.x + d.x, y: p.y + d.y });

/**
 * Moves an actor and all of its walks by `d`, so that it stays under the
 * finger at any time of the scene.
 */
export const moveActor = (actor: Actor, d: Pt): Actor => ({
  ...actor,
  at: shift(actor.at, d),
  actions: actor.actions.map((a) =>
    a.path ? { ...a, path: a.path.map((p) => shift(p, d)) } : a,
  ),
});

/** The sizes that the size buttons step through. */
export const SIZES = [0.25, 0.35, 0.5, 0.7, 1, 1.4, 2, 2.8, 4] as const;

/** The next size up or down from `scale`. */
export function stepSize(scale: number, step: 1 | -1): number {
  if (step > 0) return SIZES.find((s) => s > scale + 1e-6) ?? scale;
  return SIZES.findLast((s) => s < scale - 1e-6) ?? scale;
}

/** Sets the speed of an action. The normal speed 1 leaves the field out. */
export function setSpeed(action: Action, speed: number): Action {
  const v = Math.round(clamp(speed, L.speed.min, L.speed.max) * 1e4) / 1e4;
  const rest = { ...action };
  delete rest.speed;
  return v === 1 ? rest : { ...rest, speed: v };
}

/** Changes the clip of an action. A clip that moves gets a path if it has none. */
export const setClip = (
  action: Action,
  clip: Action['clip'],
  moves: boolean,
): Action => ({
  ...action,
  clip,
  ...(moves && !action.path && { path: [] }),
});

/** Adds a point to the end of a path, unless the path is as long as the server saves. */
export const addPoint = (path: readonly Pt[], at: Pt): Pt[] =>
  path.length < L.pathPoints ? [...path, savedPoint(at)] : [...path];

/**
 * Adds a point to a path halfway between point `i` and the point before it,
 * which is `start` for the first point.
 */
export function insertPoint(path: readonly Pt[], i: number, start: Pt): Pt[] {
  const to = path[i];
  if (!to || path.length >= L.pathPoints) return [...path];
  const from = i > 0 ? path[i - 1]! : start;
  const mid = roundPoint({ x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 });
  return [...path.slice(0, i), mid, ...path.slice(i)];
}

export const removePoint = (path: readonly Pt[], i: number): Pt[] =>
  path.filter((_, j) => j !== i);

/**
 * Sets where in one loop of its clip an action starts, from 0 to 1. The start
 * of the clip 0 leaves the field out.
 */
export function setClipStart(action: Action, start: number): Action {
  const v = Math.round(clamp(start, 0, 1) * 1e4) / 1e4;
  const rest = { ...action };
  delete rest.clipStart;
  return v === 0 ? rest : { ...rest, clipStart: v };
}
