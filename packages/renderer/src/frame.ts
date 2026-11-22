// The frame of a scene at a time `t`: where each actor is and its drawing,
// the sky and the weather, the bubbles, and the tree to draw. The
// editor, the player and the preview image draw it, and export will too.
//
// The renderer doesn't load the library. The app passes in a `Library` that
// gives the rig of a character or a prop, a background by its id and the
// default bubble fonts of the asset packs.
import type {
  ActorAsset,
  Background,
  BubbleFontId,
  ClipKind,
  Matrix,
  Rig,
  RoleColors,
  RolePatterns,
} from '@toonhouse/model';

import {
  actorScaleAt,
  type Camera,
  drawScene,
  groundDepth,
  layerTransform,
  type SceneActor,
} from './background.ts';
import {
  type BubbleAnchor,
  type BubbleContext,
  drawBubbles,
  headPoint,
  placeBubbles,
  type PlacedBubble,
} from './bubbles/bubble.ts';
import { cameraAt, pictureToGround } from './camera.ts';
import type { CastActor, CastScene } from './cast.ts';
import { clipOf, inWind } from './clips/index.ts';
import { colorRig, presetColors, presetPatterns } from './colors.ts';
import {
  type Bounds,
  type DrawNode,
  drawRig,
  partBounds,
  type RigOutline,
} from './draw.ts';
import { transformPoint } from './math.ts';
import { type ActorState, actorStateAt } from './scene.ts';
import { type SkyWeather, skyWeatherAt } from './skyDraw.ts';

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

/** An actor at the time of the frame, on the ground layer. */
export interface PlacedActor {
  actor: CastActor;
  /** The rig as the library has it, without the colors of the actor. */
  rig: Rig;
  /** The colors of the color roles of the actor, to paint its parts with. */
  colors: RoleColors;
  /** The patterns over the color roles of the actor. */
  patterns: RolePatterns;
  kind: ClipKind;
  state: ActorState;
  drawing: SceneActor;
  /** The pivot points of the drawing, in the pixels of the actor. */
  rigOutline: RigOutline;
  /** The box around the drawing, in the pixels of the background frame. */
  box: Bounds | null;
  /** Where the attached bubbles of the actor go from. */
  anchor: BubbleAnchor;
}

/**
 * The frame of a scene. The bubbles and the drawing are in picture pixels, as
 * the camera sees them, or on the ground layer with the `ground` option.
 */
export interface SceneFrame {
  background: Background;
  /** The sky and the weather at the time of the frame. */
  sky: SkyWeather;
  /** The actors whose character or prop is in the library. */
  actors: PlacedActor[];
  /** The fonts and the anchors of the bubbles. */
  bubbleContext: BubbleContext;
  /** The bubbles that show, in their draw order. */
  bubbles: PlacedBubble[];
  /** The view of the camera at the time of the frame. */
  camera: Camera;
  /** The background with the actors. */
  node: DrawNode;
  /** The bubbles, to draw on top of `node`. */
  bubbleNode: DrawNode;
}

/** The time in a clip, looped. Every clip loops for now. */
const loop = (t: number, duration: number) =>
  duration > 0 ? ((t % duration) + duration) % duration : 0;

/**
 * An actor at `t`. A prop sways more in a stronger `wind`, so that its clip
 * gives only the gusts.
 */
function placeActor(
  actor: CastActor,
  rig: Rig,
  bg: Background,
  t: number,
  wind: number,
): PlacedActor {
  const kind = rig.kind;
  const state = actorStateAt(actor, kind, bg, t);
  const clip = clipOf(kind, state.clip);
  const clipFrame = clip.frameAt(loop(state.clipT, clip.duration));
  const frame = clipFrame.kind === 'prop' ? inWind(clipFrame, wind) : clipFrame;
  const { colors: choice, scale } = actor.settings;
  const colors = presetColors(rig, choice);
  const { node, rigOutline } = drawRig(colorRig(rig, colors), frame, {
    facing: state.facing,
  });
  const { at } = state;
  const s = actorScaleAt(bg, at.y) * scale;
  const b = partBounds(node);
  const box = b && {
    x: at.x + b.x * s,
    y: at.y + b.y * s,
    width: b.width * s,
    height: b.height * s,
  };
  const head = headPoint({ node, rigOutline });
  return {
    actor,
    rig,
    colors,
    patterns: presetPatterns(rig, choice),
    kind,
    state,
    drawing: { id: actor.id, node, x: at.x, y: at.y, scale },
    rigOutline,
    box,
    anchor: {
      at,
      size: s,
      head: { x: at.x + head.x * s, y: at.y + head.y * s },
    },
  };
}

/** A bubble in picture pixels mapped by `m`, which only scales and moves. */
function mappedBubble(p: PlacedBubble, m: Matrix): PlacedBubble {
  const corner = transformPoint(m, p.box);
  return {
    ...p,
    center: transformPoint(m, p.center),
    box: { ...corner, width: p.box.width * m[0], height: p.box.height * m[3] },
    tip: p.tip && transformPoint(m, p.tip),
    node: { type: 'group', transform: m, children: [p.node] },
  };
}

/**
 * The frame of a scene at time `t`, on its background `bg`. With `pop`
 * false, the bubbles show at their full size also while they pop in and out,
 * as in the editor when the cartoon doesn't play.
 *
 * With `ground`, the frame is drawn on the ground layer, as the editor shows
 * it: the actors and the ground layer keep their places, and the far layers
 * move with the camera. The bubbles look as they do in the picture, so they
 * get smaller when the camera zooms in.
 */
export function sceneFrame(
  scene: CastScene,
  bg: Background,
  library: Library,
  t: number,
  options: { pop?: boolean; ground?: boolean } = {},
): SceneFrame {
  const sky = skyWeatherAt(scene, bg, t);
  const actors = scene.actors.flatMap((actor) => {
    const rig = library.rig(actor.asset);
    return rig ? [placeActor(actor, rig, bg, t, sky.weather.wind)] : [];
  });
  const byId = new Map(scene.actors.map((a) => [a.id, a]));
  const free = library.backgroundFont(scene.background);
  const camera = cameraAt(scene, bg, t);
  const bubbleContext: BubbleContext = {
    width: bg.width,
    height: bg.height,
    toPicture: layerTransform(bg, camera, groundDepth(bg)),
    anchors: new Map(actors.map((p) => [p.actor.id, p.anchor])),
    fontOf: (b) => {
      const actor = b.actorId === undefined ? undefined : byId.get(b.actorId);
      return actor ? library.actorFont(actor.asset) : free;
    },
  };
  let bubbles = placeBubbles(
    scene.bubbles ?? [],
    t,
    bubbleContext,
    options.pop ?? true,
  );
  let node = drawScene(
    bg,
    camera,
    actors.map((p) => p.drawing),
    sky,
  );
  if (options.ground) {
    const toGround = pictureToGround(bg, camera);
    node = { type: 'group', transform: toGround, children: [node] };
    bubbles = bubbles.map((p) => mappedBubble(p, toGround));
  }
  return {
    background: bg,
    sky,
    actors,
    bubbleContext,
    bubbles,
    camera,
    node,
    bubbleNode: drawBubbles(bubbles),
  };
}
