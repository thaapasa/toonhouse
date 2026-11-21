// The frame of a scene at a time `t`: where each actor is and its drawing,
// the frame of the background clip, the bubbles, and the tree to draw. The
// editor, the player and the preview image draw it, and export will too.
//
// The renderer doesn't load the library. The app passes in a `Library` that
// gives the rig of a character or a prop, a background by its id and the
// default bubble fonts of the asset packs.
import type {
  Actor,
  ActorAsset,
  Background,
  BackgroundFrame,
  BubbleFontId,
  ClipKind,
  Rig,
  Scene,
} from '@toonhouse/model';

import {
  actorScaleAt,
  drawScene,
  type SceneActor,
  wholeBackground,
} from './background.ts';
import {
  type BubbleAnchor,
  type BubbleContext,
  drawBubbles,
  headPoint,
  placeBubbles,
  type PlacedBubble,
} from './bubbles/bubble.ts';
import { clipOf } from './clips/index.ts';
import {
  type Bounds,
  drawCharacter,
  type DrawNode,
  partBounds,
  type Skeleton,
} from './draw.ts';
import { type ActorState, actorStateAt, backgroundStateAt } from './scene.ts';

/** The library assets that a scene refers to. */
export interface Library {
  /** The rig of a character or a prop, or `undefined` if the library doesn't have it. */
  rig(asset: ActorAsset): Rig | undefined;
  /** A background by its id, or `undefined` if the library doesn't have it. */
  background(id: string): Background | undefined;
  /** The default bubble font of a character or a prop: the font of its asset pack. */
  actorFont(asset: ActorAsset): BubbleFontId;
  /** The default font of a free bubble: the font of the pack of the background. */
  backgroundFont(id: string | null): BubbleFontId;
}

/**
 * The rig kind of an actor, which sets its clips. It is null if the library
 * doesn't have the character or the prop of the actor. The frame leaves such
 * an actor out, and so do the timeline and the properties pane, so a saved
 * cartoon that refers to a removed asset still opens.
 */
export const actorKind = (
  library: Library,
  asset: ActorAsset,
): ClipKind | null => library.rig(asset)?.kind ?? null;

/** An actor at the time of the frame. */
export interface PlacedActor {
  actor: Actor;
  rig: Rig;
  kind: ClipKind;
  state: ActorState;
  drawing: SceneActor;
  /** The joints of the drawing, in the pixels of the actor. */
  skeleton: Skeleton;
  /** The box around the drawing, in the pixels of the background frame. */
  box: Bounds | null;
  /** Where the attached bubbles of the actor go from. */
  anchor: BubbleAnchor;
}

export interface SceneFrame {
  background: Background;
  backgroundFrame: BackgroundFrame;
  /** The actors whose character or prop is in the library. */
  actors: PlacedActor[];
  /** The fonts and the anchors of the bubbles. */
  bubbleContext: BubbleContext;
  /** The bubbles that show, in their draw order. */
  bubbles: PlacedBubble[];
  /** The background with the actors, in the pixels of the frame. */
  node: DrawNode;
  /** The bubbles, to draw on top of `node`. */
  bubbleNode: DrawNode;
}

/** The time in a clip, looped. Every clip loops for now. */
const loop = (t: number, duration: number) =>
  duration > 0 ? ((t % duration) + duration) % duration : 0;

function placeActor(
  actor: Actor,
  rig: Rig,
  bg: Background,
  t: number,
): PlacedActor {
  const kind = rig.kind;
  const state = actorStateAt(actor, kind, bg, t);
  const clip = clipOf(kind, state.clip);
  const frame = clip.frameAt(loop(state.clipT, clip.duration));
  const { node, skeleton } = drawCharacter(rig, frame, {
    facing: state.facing,
  });
  const { at } = state;
  const s = actorScaleAt(bg, at.y) * actor.scale;
  const b = partBounds(node);
  const box = b && {
    x: at.x + b.x * s,
    y: at.y + b.y * s,
    width: b.width * s,
    height: b.height * s,
  };
  const head = headPoint({ node, skeleton });
  return {
    actor,
    rig,
    kind,
    state,
    drawing: { id: actor.id, node, x: at.x, y: at.y, scale: actor.scale },
    skeleton,
    box,
    anchor: {
      at,
      size: s,
      head: { x: at.x + head.x * s, y: at.y + head.y * s },
    },
  };
}

/** The frame of the clip of the background at time `t`. */
function backgroundFrame(scene: Scene, t: number): BackgroundFrame {
  const state = backgroundStateAt(scene.backgroundActions, t);
  const clip = clipOf('background', state.clip);
  return clip.frameAt(loop(state.clipT, clip.duration));
}

/**
 * The frame of a scene at time `t`, on its background `bg`. With `pop`
 * false, the bubbles show at their full size also while they pop in and out,
 * as in the editor when the cartoon doesn't play.
 */
export function sceneFrame(
  scene: Scene,
  bg: Background,
  library: Library,
  t: number,
  options: { pop?: boolean } = {},
): SceneFrame {
  const actors = scene.actors.flatMap((actor) => {
    const rig = library.rig(actor.asset);
    return rig ? [placeActor(actor, rig, bg, t)] : [];
  });
  const byId = new Map(scene.actors.map((a) => [a.id, a]));
  const free = library.backgroundFont(scene.background);
  const bubbleContext: BubbleContext = {
    width: bg.width,
    height: bg.height,
    anchors: new Map(actors.map((p) => [p.actor.id, p.anchor])),
    fontOf: (b) => {
      const actor = b.actorId === undefined ? undefined : byId.get(b.actorId);
      return actor ? library.actorFont(actor.asset) : free;
    },
  };
  const bubbles = placeBubbles(
    scene.bubbles ?? [],
    t,
    bubbleContext,
    options.pop ?? true,
  );
  const frame = backgroundFrame(scene, t);
  return {
    background: bg,
    backgroundFrame: frame,
    actors,
    bubbleContext,
    bubbles,
    node: drawScene(
      bg,
      frame,
      wholeBackground(bg),
      actors.map((p) => p.drawing),
    ),
    bubbleNode: drawBubbles(bubbles),
  };
}
