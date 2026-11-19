// What the stage draws at time `t`: where each actor is, its drawing and its
// box on the stage.
import type {
  Actor,
  Background,
  BackgroundFrame,
  ClipKind,
  Scene,
} from '@toonhouse/model';
import {
  actorScaleAt,
  type ActorState,
  actorStateAt,
  backgroundStateAt,
  type Bounds,
  clipOf,
  drawCharacter,
  partBounds,
  type SceneActor,
  type Skeleton,
} from '@toonhouse/renderer';

import { type RigAsset, rigAsset } from './library.ts';

export interface PlacedActor {
  actor: Actor;
  asset: RigAsset;
  kind: ClipKind;
  state: ActorState;
  drawing: SceneActor;
  /** The joints of the drawing, in the pixels of the actor. */
  skeleton: Skeleton;
  /** The box around the drawing, in the pixels of the background frame. */
  box: Bounds | null;
}

/** The time in a clip, looped. Every clip loops for now. */
const loop = (t: number, duration: number) =>
  duration > 0 ? ((t % duration) + duration) % duration : 0;

/** The actors whose character or prop is in the library, at time `t`. */
export function placeActors(
  scene: Scene,
  bg: Background,
  t: number,
): PlacedActor[] {
  return scene.actors.flatMap((actor) => {
    const asset = rigAsset(actor.asset);
    if (!asset) return [];
    const kind = asset.rig.kind;
    const state = actorStateAt(actor, kind, bg, t);
    const clip = clipOf(kind, state.clip);
    const frame = clip.frameAt(loop(state.clipT, clip.duration));
    const { node, skeleton } = drawCharacter(asset.rig, frame, {
      facing: state.facing,
    });
    const s = actorScaleAt(bg, state.at.y) * actor.scale;
    const b = partBounds(node);
    const box = b && {
      x: state.at.x + b.x * s,
      y: state.at.y + b.y * s,
      width: b.width * s,
      height: b.height * s,
    };
    return [
      {
        actor,
        asset,
        kind,
        state,
        drawing: {
          id: actor.id,
          node,
          x: state.at.x,
          y: state.at.y,
          scale: actor.scale,
        },
        skeleton,
        box,
      },
    ];
  });
}

/** The frame of the clip of the background at time `t`. */
export function backgroundFrame(scene: Scene, t: number): BackgroundFrame {
  const state = backgroundStateAt(scene.backgroundActions, t);
  const clip = clipOf('background', state.clip);
  return clip.frameAt(loop(state.clipT, clip.duration)) as BackgroundFrame;
}
