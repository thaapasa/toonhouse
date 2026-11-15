export type { Camera, SceneActor } from './background.ts';
export {
  actorScaleAt,
  arcPoint,
  clampCamera,
  drawScene,
  groundDepth,
  layerTransform,
  layerView,
  MAX_ZOOM,
  partPosition,
  wholeBackground,
} from './background.ts';
export {
  BACKGROUND_CLIPS,
  backgroundClips,
  BIRD_CLIPS,
  BIRD_WALK_SPEED,
  clipById,
  clipsFor,
  CUTOUT_CLIPS,
  HIP_HEIGHT,
  PROP_CLIPS,
  RABBIT_CLIPS,
  RABBIT_HOP_SPEED,
  WALK_SPEED,
} from './clips/index.ts';
export type {
  Bounds,
  CharacterDrawing,
  ClipShape,
  DrawNode,
  DrawOptions,
  PathStyle,
  Skeleton,
} from './draw.ts';
export { drawCharacter, fittedPose, partBounds } from './draw.ts';
export { IDENTITY, multiply } from './math.ts';
export type { DrawEntry, FarGroup } from './order.ts';
export { defaultDrawOrder, drawOrder } from './order.ts';
export type { ActorState } from './scene.ts';
export {
  actorEnd,
  actorStateAt,
  backgroundStateAt,
  clipOf,
  clipSpeed,
  isMoving,
  MIN_SCENE_LENGTH,
  sceneLength,
  sortedActions,
  walkTime,
} from './scene.ts';
