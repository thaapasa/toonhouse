import {
  CARTOON_VERSION,
  type CartoonContent as Content,
  CLIP_IDS,
} from '@toonhouse/model';
import { z } from 'zod';

/**
 * The limits of the content that the server saves. The editor keeps the
 * content inside them, so that a save doesn't fail on them.
 *
 * The app doesn't limit what users make, so each limit has a technical reason.
 * Every number must be finite, because JSON has no infinity, and the sizes
 * can't be negative. The caps on the lists and on the text keep the work of
 * the renderer in each frame bounded. They sit far past anything that a
 * cartoon needs, and the body limit of a save bounds the whole content anyway.
 */
export const CONTENT_LIMITS = {
  /**
   * How far a point can be from the frame, in frame pixels. Browsers draw SVG
   * with single-precision numbers, which lose the details of a drawing far
   * beyond this.
   */
  coordinate: 100_000,
  /**
   * The longest time in seconds, a day. Export renders every frame of a scene,
   * so a scene must have a length that it can render.
   */
  time: 86_400,
  /** An actor of size zero has nothing that the user can select. */
  scale: { min: 0.01, max: 1000 },
  /**
   * A walk at speed zero never gets anywhere, so the actor never gets to the
   * actions after it. At the top speed, a walk crosses the frame in less than
   * a frame of the video, so more speed shows nothing new.
   */
  speed: { min: 0.01, max: 1000 },
  /**
   * A shorter bubble shows for only a frame or two, and the user can't grab
   * it on the timeline.
   */
  bubbleLength: { min: 0.1, max: 86_400 },
  /** The sizes of a bubble, in frame pixels. */
  bubbleWidth: { min: 0, max: 200_000 },
  /**
   * The padding and the outline of a bubble grow with the size of its text,
   * and the renderer divides by the length of the outline.
   */
  fontSize: { min: 1, max: 10_000 },
  borderWidth: { min: 0, max: 10_000 },
  /** The height of a line against the size of the text. */
  lineSpacing: { min: 0, max: 100 },
  /** The renderer wraps the text of each bubble in every frame. */
  bubbleText: 5000,
  /** The app makes the ids, which are UUIDs. */
  id: 64,
  scenes: 1000,
  actors: 1000,
  actions: 10_000,
  pathPoints: 10_000,
  bubbles: 10_000,
} as const;

const L = CONTENT_LIMITS;

const range = (r: { min: number; max: number }) =>
  z.number().finite().min(r.min).max(r.max);

// Each object keeps the fields that it doesn't know. So a web app that is
// older than the server keeps the new optional fields when it saves, and the
// server stores the fields that a newer web app sends. A new optional field
// then needs no new version of the format.
const Coordinate = range({ min: -L.coordinate, max: L.coordinate });
const Point = z.looseObject({ x: Coordinate, y: Coordinate });
const Id = z.string().min(1).max(L.id);
const Time = range({ min: 0, max: L.time });

const Action = z.looseObject({
  id: Id,
  type: z.literal('clip').exactOptional(),
  t: Time,
  clip: z.enum(CLIP_IDS),
  path: z.array(Point).max(L.pathPoints).exactOptional(),
  speed: range(L.speed).exactOptional(),
  clipStart: range({ min: 0, max: 1 }).exactOptional(),
});

const Actor = z.looseObject({
  id: Id,
  asset: z.looseObject({
    kind: z.enum(['character', 'prop']),
    id: z.string().regex(/^[a-z0-9-]{1,64}$/),
  }),
  at: Point,
  facing: z.union([z.literal(1), z.literal(-1)]),
  scale: range(L.scale),
  actions: z.array(Action).max(L.actions),
});

const Color = z.string().regex(/^#[0-9a-fA-F]{6}$/);

const Bubble = z.looseObject({
  id: Id,
  t: Time,
  length: range(L.bubbleLength).exactOptional(),
  text: z.string().max(L.bubbleText),
  actorId: Id.exactOptional(),
  at: Point,
  width: range(L.bubbleWidth),
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
  fontSize: range(L.fontSize),
  color: Color,
  bold: z.boolean().exactOptional(),
  italic: z.boolean().exactOptional(),
  caps: z.boolean().exactOptional(),
  align: z.enum(['left', 'center', 'right']).exactOptional(),
  lineSpacing: range(L.lineSpacing).exactOptional(),
  fill: Color,
  border: z.enum(['solid', 'dashed', 'double', 'wobbly', 'none']),
  borderColor: Color,
  borderWidth: range(L.borderWidth),
  pop: z.boolean().exactOptional(),
});

const Scene = z.looseObject({
  id: Id,
  background: z
    .string()
    .regex(/^[a-z0-9-]{1,64}$/)
    .nullable(),
  backgroundActions: z.array(Action).max(L.actions),
  actors: z.array(Actor).max(L.actors),
  bubbles: z.array(Bubble).max(L.bubbles).exactOptional(),
  length: Time.exactOptional(),
});

/** The scenes of a cartoon, in the latest format. See `CartoonContent` in the model. */
export const CartoonContent = z.looseObject({
  version: z.literal(CARTOON_VERSION),
  scenes: z.array(Scene).max(L.scenes),
});
export type CartoonContent = Content;

// The schema and the model must describe the same data, apart from the fields
// that the schema keeps without knowing them.
type Known<T> = T extends readonly (infer U)[]
  ? Known<U>[]
  : T extends object
    ? { [K in keyof T as string extends K ? never : K]: Known<T[K]> }
    : T;
type Same<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
const sameAsModel: Same<
  Known<z.infer<typeof CartoonContent>>,
  Known<Content>
> = true;
void sameAsModel;

/**
 * The revision of the content goes up by one with each save. A save names the
 * revision that it edited, so that it can't overwrite a newer save from
 * another window or device.
 */
const Revision = z.number().int().min(0);

/**
 * The editor that saves, a random id for each time the editor opens. A web app
 * that lost the answer to a save sees from it that the newer revision on the
 * server is its own.
 */
const EditorId = z.uuid();

/**
 * The content of a cartoon with its revision, and the editor that saved it,
 * as the server sends it. `null` for a cartoon that no editor has saved.
 */
export const SavedContent = z.object({
  revision: Revision,
  editor: EditorId.nullable(),
  content: CartoonContent,
});
export type SavedContent = {
  revision: number;
  editor: string | null;
  content: Content;
};

/**
 * The body of a save. The server checks the version of the content before the
 * rest, so that it can tell an old web app to load the new version.
 */
export const SaveContentRequest = z.object({
  revision: Revision,
  editor: EditorId,
  content: z.looseObject({ version: z.number() }),
});
export type SaveContentRequest = z.infer<typeof SaveContentRequest>;

export const SaveContentResponse = z.object({ revision: Revision });

/**
 * Why the server refused a save with 409: the web app knows an older version
 * of the format, or someone saved the content after the revision that the
 * save edited.
 */
export const ContentConflict = z.object({
  error: z.string(),
  reason: z.enum(['version', 'revision']),
});
