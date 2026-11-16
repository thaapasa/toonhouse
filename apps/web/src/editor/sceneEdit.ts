// Pure edits of the scenes of a cartoon. Each returns a new value and leaves
// the old one as it was, so that undo can keep the old values.
import type {
  Action,
  Actor,
  CartoonContent,
  Pt,
  Scene,
} from '@toonhouse/model';
import { minSceneLength, sortedActions } from '@toonhouse/renderer';

/** Two actions closer than this in seconds start at the same time. */
const SAME_TIME = 1e-6;

export const newId = () => crypto.randomUUID();

export const newScene = (): Scene => ({
  id: newId(),
  background: null,
  backgroundActions: [],
  actors: [],
});

export const updateScene = (
  content: CartoonContent,
  sceneId: string,
  fn: (scene: Scene) => Scene,
): CartoonContent => ({
  ...content,
  scenes: content.scenes.map((s) => (s.id === sceneId ? fn(s) : s)),
});

export const updateActor = (
  scene: Scene,
  actorId: string,
  fn: (actor: Actor) => Actor,
): Scene => ({
  ...scene,
  actors: scene.actors.map((a) => (a.id === actorId ? fn(a) : a)),
});

export const removeActor = (scene: Scene, actorId: string): Scene => ({
  ...scene,
  actors: scene.actors.filter((a) => a.id !== actorId),
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
): Action[] => actions.map((a) => (a.id === actionId ? fn(a) : a));

export const removeAction = (
  actions: readonly Action[],
  actionId: string,
): Action[] => actions.filter((a) => a.id !== actionId);

/** The action of an actor, or of the background if `actorId` is null. */
export function actionsOf(scene: Scene, actorId: string | null): Action[] {
  if (actorId === null) return scene.backgroundActions;
  return scene.actors.find((a) => a.id === actorId)?.actions ?? [];
}

/** Changes the actions of an actor, or of the background if `actorId` is null. */
export function updateActions(
  scene: Scene,
  actorId: string | null,
  fn: (actions: readonly Action[]) => Action[],
): Scene {
  if (actorId === null)
    return { ...scene, backgroundActions: fn(scene.backgroundActions) };
  return updateActor(scene, actorId, (a) => ({ ...a, actions: fn(a.actions) }));
}

/** The shortest time between two actions that the user moves. */
const MIN_GAP = 0.1;
/** A time to a ten-thousandth of a second, which keeps the saved data short. */
const short = (t: number) => Math.round(t * 1e4) / 1e4;

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
  const at = short(Math.min(Math.max(t, lo), hi));
  return updateAction(actions, actionId, (a) => ({ ...a, t: at }));
}

/**
 * Moves a whole action of an actor, or of the background if `actorId` is
 * null, so that it starts at `t` and stays as long: its start and the start of
 * the next action move together. It stays between the action before it and
 * the action after the next one, so that the actions keep their order. The
 * last action ends with the scene, which is `sceneEnd` seconds long, so the
 * scene gets longer if needed. Gives the new scene and the new start.
 */
export function moveBlock(
  scene: Scene,
  actorId: string | null,
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
  const d = Math.min(Math.max(t - action.t, lo), hi);
  const moved = updateActions(scene, actorId, (actions) =>
    actions.map((a) =>
      a.id === action.id || a.id === next?.id ? { ...a, t: short(a.t + d) } : a,
    ),
  );
  const end = sceneEnd + d;
  return {
    scene: !next && end > sceneEnd ? { ...moved, length: short(end) } : moved,
    t: short(action.t + d),
  };
}

/**
 * Sets the length of a scene, but not shorter than `minSceneLength`, so that
 * every action shows on the timeline.
 */
export const setLength = (scene: Scene, length: number): Scene => ({
  ...scene,
  length: short(Math.max(length, minSceneLength(scene))),
});

/** A point to a tenth of a pixel, which keeps the saved data short. */
export const roundPoint = (p: Pt): Pt => ({
  x: Math.round(p.x * 10) / 10,
  y: Math.round(p.y * 10) / 10,
});

const shift = (p: Pt, d: Pt): Pt => roundPoint({ x: p.x + d.x, y: p.y + d.y });

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
