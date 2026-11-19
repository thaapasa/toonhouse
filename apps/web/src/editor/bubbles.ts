// The speech bubbles of a scene in the web app: where the actors are for
// their attached bubbles, the default font from the asset pack, and the edits
// of the bubbles.
import type {
  ActorAsset,
  Background,
  Bubble,
  BubbleFontId,
  Pt,
  Scene,
} from '@toonhouse/model';
import {
  actorScaleAt,
  type BubbleAnchor,
  type BubbleContext,
  bubbleOffset,
  DEFAULT_BUBBLE_FONT,
  fontByFamily,
  headPoint,
  placeBubbles,
  type PlacedBubble,
} from '@toonhouse/renderer';

import type { PlacedActor } from './placement.ts';
import { savedPoint } from './sceneEdit.ts';

interface Pack {
  id: string;
  bubbleFont: string;
  characters: string[];
  props: string[];
  backgrounds: string[];
}

const packs = Object.values(
  import.meta.glob<Pack>('../../../../assets/packs/*/pack.json', {
    eager: true,
    import: 'default',
  }),
);

const packFont = (pack: Pack | undefined): BubbleFontId =>
  (pack && fontByFamily(pack.bubbleFont)) ?? DEFAULT_BUBBLE_FONT;

/** The default bubble font of a character or a prop: the font of its asset pack. */
export const actorFont = (asset: ActorAsset) =>
  packFont(
    packs.find((p) =>
      (asset.kind === 'character' ? p.characters : p.props).includes(asset.id),
    ),
  );

/** The default font of a free bubble: the font of the pack of the background. */
export const backgroundFont = (id: string | null) =>
  packFont(packs.find((p) => id !== null && p.backgrounds.includes(id)));

/** Where each actor is at the moment of `placed`, for its attached bubbles. */
export function bubbleAnchors(
  bg: Background,
  placed: readonly PlacedActor[],
): Map<string, BubbleAnchor> {
  return new Map(
    placed.map((p) => {
      const at = p.state.at;
      const size = actorScaleAt(bg, at.y) * p.actor.scale;
      const head = headPoint({ node: p.drawing.node, skeleton: p.skeleton });
      return [
        p.actor.id,
        {
          at,
          size,
          head: { x: at.x + head.x * size, y: at.y + head.y * size },
        },
      ];
    }),
  );
}

export function bubbleContext(
  scene: Scene,
  bg: Background,
  placed: readonly PlacedActor[],
): BubbleContext {
  const actors = new Map(scene.actors.map((a) => [a.id, a]));
  const free = backgroundFont(scene.background);
  return {
    width: bg.width,
    height: bg.height,
    anchors: bubbleAnchors(bg, placed),
    fontOf: (b) => {
      const actor = b.actorId === undefined ? undefined : actors.get(b.actorId);
      return actor ? actorFont(actor.asset) : free;
    },
  };
}

/** The bubbles that show at `t`, with `placed` from `placeActors`. */
export const placeSceneBubbles = (
  scene: Scene,
  bg: Background,
  placed: readonly PlacedActor[],
  t: number,
): PlacedBubble[] =>
  placeBubbles(scene.bubbles ?? [], t, bubbleContext(scene, bg, placed));

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
): Scene => ({
  ...scene,
  bubbles: (scene.bubbles ?? []).map((b) => (b.id === id ? fn(b) : b)),
});

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
