export {
  BIRD_CLIPS,
  BIRD_WALK_SPEED,
  clipById,
  clipsFor,
  CUTOUT_CLIPS,
  WALK_SPEED,
} from './clips/index.ts';
export type {
  CharacterDrawing,
  ClipShape,
  DrawNode,
  DrawOptions,
  PathStyle,
  Skeleton,
} from './draw.ts';
export { drawCharacter } from './draw.ts';
export { IDENTITY, multiply } from './math.ts';
