import {
  CARTOON_VERSION,
  type CartoonContent as Content,
} from '@toonhouse/model';
import { z } from 'zod';

const Coordinate = z.number().finite().min(-100_000).max(100_000);
const Point = z.object({ x: Coordinate, y: Coordinate });
const Id = z.string().min(1).max(64);

const ClipId = z.enum([
  'idle',
  'walk',
  'wave',
  'talk',
  'peck',
  'flap',
  'hop',
  'lookout',
  'rustle',
  'day',
  'drift',
]);

const Action = z.object({
  id: Id,
  t: z.number().finite().min(0).max(3600),
  clip: ClipId,
  path: z.array(Point).max(200).exactOptional(),
  speed: z.number().finite().min(0.05).max(20).exactOptional(),
  clipStart: z.number().finite().min(0).max(1).exactOptional(),
});

const Actor = z.object({
  id: Id,
  asset: z.object({
    kind: z.enum(['character', 'prop']),
    id: z.string().regex(/^[a-z0-9-]{1,64}$/),
  }),
  at: Point,
  facing: z.union([z.literal(1), z.literal(-1)]),
  scale: z.number().finite().min(0.05).max(20),
  actions: z.array(Action).max(1000),
});

const Color = z.string().regex(/^#[0-9a-fA-F]{6}$/);

const Bubble = z.object({
  id: Id,
  t: z.number().finite().min(0).max(3600),
  length: z.number().finite().min(0.1).max(3600).exactOptional(),
  text: z.string().max(2000),
  actorId: Id.exactOptional(),
  at: Point,
  width: z.number().finite().min(10).max(10_000),
  shape: z.enum(['speech', 'thought', 'shout', 'caption']),
  tail: z.boolean(),
  tailTip: Point.exactOptional(),
  font: z
    .enum([
      'comic-relief',
      'bangers',
      'chewy',
      'indie-flower',
      'shantell-sans',
      'oooh-baby',
      'crafty-girls',
      'fondamento',
    ])
    .exactOptional(),
  fontSize: z.number().finite().min(1).max(1000),
  color: Color,
  bold: z.boolean().exactOptional(),
  italic: z.boolean().exactOptional(),
  caps: z.boolean().exactOptional(),
  align: z.enum(['left', 'center', 'right']).exactOptional(),
  lineSpacing: z.number().finite().min(0.5).max(5).exactOptional(),
  fill: Color,
  border: z.enum(['solid', 'dashed', 'double', 'wobbly', 'none']),
  borderColor: Color,
  borderWidth: z.number().finite().min(0).max(100),
  pop: z.boolean().exactOptional(),
});

const Scene = z.object({
  id: Id,
  background: z
    .string()
    .regex(/^[a-z0-9-]{1,64}$/)
    .nullable(),
  backgroundActions: z.array(Action).max(1000),
  actors: z.array(Actor).max(100),
  bubbles: z.array(Bubble).max(1000).exactOptional(),
  length: z.number().finite().min(0).max(3600).exactOptional(),
});

/** The scenes of a cartoon, in the latest format. See `CartoonContent` in the model. */
export const CartoonContent = z.object({
  version: z.literal(CARTOON_VERSION),
  scenes: z.array(Scene).max(200),
});
export type CartoonContent = Content;

// The schema and the model must describe the same data.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const sameAsModel: Same<z.infer<typeof CartoonContent>, Content> = true;
void sameAsModel;

/**
 * The body of a save. The version comes first, so that the server can tell an
 * old web app to load the new version before it checks the rest.
 */
export const SaveContentRequest = z.looseObject({ version: z.number() });
