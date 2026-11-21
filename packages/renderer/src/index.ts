export type { Camera, SceneActor } from './background.ts';
export {
  clampCamera,
  drawScene,
  groundDepth,
  layerTransform,
  layerView,
  MAX_ZOOM,
  wholeBackground,
} from './background.ts';
export type {
  BubbleAnchor,
  BubbleContext,
  PlacedBubble,
} from './bubbles/bubble.ts';
export {
  bubbleEnd,
  bubbleLength,
  bubbleOffset,
  bubblePoint,
  sortedBubbles,
} from './bubbles/bubble.ts';
export {
  BUBBLE_FONTS,
  DEFAULT_BUBBLE_FONT,
  fontByFamily,
  fontFamily,
} from './bubbles/text.ts';
export {
  CAMERA_EASINGS,
  cameraAt,
  cameraBetween,
  cameraBounds,
  cameraEntryEnd,
  cameraFromBounds,
  cameraHolder,
  DEFAULT_EASING,
  ease,
  isJump,
  pictureToGround,
  sortedCameraEntries,
  startView,
} from './camera.ts';
export type { CartoonEntry, CartoonTimeline } from './cartoon.ts';
export { cartoonTime, cartoonTimeline } from './cartoon.ts';
export {
  backgroundClips,
  clipOf,
  clipsFor,
  HIP_HEIGHT,
  restClip,
} from './clips/index.ts';
export type { ColorChoice } from './colors.ts';
export { colorRig, presetColors, presetPatterns } from './colors.ts';
export type {
  Bounds,
  ClipShape,
  DrawNode,
  DrawOptions,
  PathStyle,
  RigDrawing,
  RigOutline,
} from './draw.ts';
export { drawRig, partBounds } from './draw.ts';
export type { Library, PlacedActor, SceneFrame } from './frame.ts';
export { actorKind, sceneFrame } from './frame.ts';
export { clamp } from './math.ts';
export type { DrawEntry, FarGroup } from './order.ts';
export { defaultDrawOrder, drawOrder } from './order.ts';
export type { ActorState } from './scene.ts';
export {
  actionSpeed,
  actorStateAt,
  backgroundStateAt,
  clipStartOf,
  FPS,
  isMoving,
  minSceneLength,
  sceneLength,
  sortedActions,
  walkTime,
} from './scene.ts';
