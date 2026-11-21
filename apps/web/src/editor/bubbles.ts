// The edits of the speech bubbles of a scene.
import type { Bubble, Pt, Scene } from '@toonhouse/model';
import { type BubbleAnchor, bubbleOffset } from '@toonhouse/renderer';

import { savedPoint, updateById } from './sceneEdit.ts';

/** The look of a new bubble. */
const NEW_BUBBLE = {
  text: '',
  width: 520,
  shape: 'speech',
  fontSize: 44,
  color: '#1a1a1a',
  fill: '#ffffff',
  border: 'solid',
  borderColor: '#1a1a1a',
  borderWidth: 4,
} as const satisfies Partial<Bubble>;

/**
 * A new bubble at `t`. An attached bubble goes above the head of its actor,
 * with a tail. A free bubble goes to `at` and has no tail.
 */
export function newBubble(
  id: string,
  t: number,
  at: Pt,
  attach: { actorId: string; anchor: BubbleAnchor; top: number } | null,
): Bubble {
  if (!attach) return { ...NEW_BUBBLE, id, t, at: savedPoint(at), tail: false };
  const { anchor } = attach;
  const center = {
    x: anchor.head.x + NEW_BUBBLE.fontSize,
    y: attach.top - NEW_BUBBLE.fontSize * 2,
  };
  return {
    ...NEW_BUBBLE,
    id,
    t,
    actorId: attach.actorId,
    at: savedPoint(bubbleOffset(center, anchor)),
    tail: true,
  };
}

type OptionalKey = {
  [K in keyof Bubble]-?: undefined extends Bubble[K] ? K : never;
}[keyof Bubble];

/**
 * Sets an optional field of a bubble, or leaves the field out with
 * `undefined`, since the saved data has no undefined values.
 */
export function setOptional<K extends OptionalKey>(
  bubble: Bubble,
  key: K,
  value: Bubble[K] | undefined,
): Bubble {
  const out = { ...bubble };
  if (value === undefined) delete out[key];
  else out[key] = value;
  return out;
}

export const updateBubble = (
  scene: Scene,
  id: string,
  fn: (b: Bubble) => Bubble,
): Scene => {
  const list = scene.bubbles ?? [];
  const bubbles = updateById(list, id, fn);
  return bubbles === list ? scene : { ...scene, bubbles };
};

export const addBubble = (scene: Scene, bubble: Bubble): Scene => ({
  ...scene,
  bubbles: [...(scene.bubbles ?? []), bubble],
});

export const removeBubble = (scene: Scene, id: string): Scene => ({
  ...scene,
  bubbles: (scene.bubbles ?? []).filter((b) => b.id !== id),
});

/**
 * Attaches a bubble to another actor, or makes it free with `actorId` null.
 * The bubble and its tail stay where they are on the stage at the moment of
 * `anchors`.
 */
export function attachBubble(
  bubble: Bubble,
  actorId: string | null,
  anchors: ReadonlyMap<string, BubbleAnchor>,
): Bubble {
  const from =
    bubble.actorId === undefined ? null : (anchors.get(bubble.actorId) ?? null);
  const to = actorId === null ? null : (anchors.get(actorId) ?? null);
  const move = (p: Pt) => {
    const frame = from
      ? { x: from.at.x + p.x * from.size, y: from.at.y + p.y * from.size }
      : p;
    return savedPoint(bubbleOffset(frame, to));
  };
  const { tailTip } = bubble;
  return {
    ...setOptional(bubble, 'actorId', actorId ?? undefined),
    at: move(bubble.at),
    ...(tailTip && { tailTip: move(tailTip) }),
  };
}
