import type { Pt } from './geometry.ts';
import type { ClipId } from './pose.ts';

/**
 * The version of the cartoon format. It goes up by one when the format changes
 * so that old cartoons no longer fit it. A change that old cartoons still fit,
 * such as a new optional field, keeps the version. See "Cartoon format
 * versions" in ARCHITECTURE.md.
 */
export const CARTOON_VERSION = 1;

/** What a cartoon is made of. The title and the sharing are kept apart. */
export interface CartoonContent {
  version: typeof CARTOON_VERSION;
  scenes: Scene[];
}

/** The content of a new cartoon. */
export const emptyContent = (): CartoonContent => ({
  version: CARTOON_VERSION,
  scenes: [],
});

/** A background with actors on it, and a timeline for them. */
export interface Scene {
  /** Unique within the cartoon. */
  id: string;
  /** The id of a library background, or null before the user picks one. */
  background: string | null;
  /** The actions of the background, such as the sun moving across the sky. */
  backgroundActions: Action[];
  actors: Actor[];
  /** The speech bubbles of the scene, both attached and free. */
  bubbles?: Bubble[];
  /** Where the camera is and how it moves. Without it, it shows the whole background. */
  camera?: SceneCamera;
  /**
   * The length of the scene in seconds, if the user has set it. Without it,
   * the scene ends a few seconds after its last action.
   */
  length?: number;
}

/** The library character or prop that an actor uses. */
export interface ActorAsset {
  kind: 'character' | 'prop';
  /** The id of the library asset, `<pack>/<name>`, such as `sunny/oak`. */
  id: string;
}

/** A character or a prop that the user has placed in a scene. */
export interface Actor {
  /** Unique within the scene. */
  id: string;
  asset: ActorAsset;
  /**
   * Where the ground point of the actor is at the start of the scene, on the
   * ground layer, in the pixels of the background frame.
   */
  at: Pt;
  /** Which way the actor faces at the start: 1 right, -1 left. */
  facing: 1 | -1;
  /** The size of the actor against the default size of the background. */
  scale: number;
  /** The actions of the actor. The order doesn't matter, only the times. */
  actions: Action[];
}

/**
 * Something that an actor does on the timeline, from `t` until its next
 * action. An action with a clip that moves, such as a walk, follows its
 * `path`. When the actor gets to the last point, it stands still.
 */
export interface Action {
  /** Unique within its actor. */
  id: string;
  /**
   * What the action does, `clip` if not set. Only `clip` exists so far: the
   * actor plays a clip. The old cartoons stay valid when other kinds of
   * actions come, such as a change of a setting in the middle of a scene, so
   * the format version stays. But a web app that knows only `clip` can't open
   * a cartoon with another kind until it loads the new version of the app.
   */
  type?: 'clip';
  /** When the action starts, in seconds from the start of the scene. */
  t: number;
  clip: ClipId;
  /**
   * The points that a walk goes through, on the ground layer, in the pixels
   * of the background frame. Only the clips that move use it.
   */
  path?: Pt[];
  /**
   * How fast the clip plays against its normal speed, 1 if not set. A walk
   * also moves faster, so that the feet don't slide.
   */
  speed?: number;
  /**
   * Where in its clip the action starts, as a part of one loop of the clip
   * from 0 to 1, 0 if not set. With 0.5, the sun of a day starts high on
   * the sky.
   */
  clipStart?: number;
}

/**
 * A view of the camera on the ground layer. It has the shape of the frame, so
 * the middle point and the zoom set it.
 */
export interface CameraView {
  /** The middle of the view, in the pixels of the background frame. */
  x: number;
  y: number;
  /** 1 shows the whole background, 2 a view half as wide. */
  zoom: number;
}

/** How a camera move speeds up and slows down. */
export type CameraEasing = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';

/**
 * A camera entry: a camera move or a camera jump at `t`. It starts from where the camera is
 * at `t`, which is the view of the entry before it, or the start view. A move
 * gets to `to` after `length` seconds. A jump has no length and shows `to` at
 * once.
 */
export interface CameraEntry {
  /** Unique within the scene. */
  id: string;
  /** When the move or the jump starts, in seconds from the start of the scene. */
  t: number;
  to: CameraView;
  /** How long a move takes, in seconds. A jump has none. */
  length?: number;
  /** How a move speeds up and slows down, `ease-in-out` if not set. */
  easing?: CameraEasing;
}

/** The camera of a scene. */
export interface SceneCamera {
  /** The view at the start of the scene, the whole background if not set. */
  start?: CameraView;
  /** The moves and the jumps. They don't overlap, and the order doesn't matter. */
  entries: CameraEntry[];
}

/** The fonts that speech bubbles can use. See assets/fonts. */
export type BubbleFontId =
  | 'comic-relief'
  | 'bangers'
  | 'chewy'
  | 'indie-flower'
  | 'shantell-sans'
  | 'oooh-baby'
  | 'crafty-girls'
  | 'fondamento';

export type BubbleShape = 'speech' | 'thought' | 'shout' | 'caption';

export type BubbleBorder = 'solid' | 'dashed' | 'double' | 'wobbly' | 'none';

/**
 * A text that shows on the stage from `t` for its length. An attached bubble
 * follows its actor, and a free bubble stays at its place in the scene.
 */
export interface Bubble {
  /** Unique within the scene. */
  id: string;
  /** When the bubble shows, in seconds from the start of the scene. */
  t: number;
  /**
   * How long the bubble shows, in seconds, if the user has set it. Without
   * it, the length comes from the length of the text.
   */
  length?: number;
  /** The text. A line break in it stays in the bubble. */
  text: string;
  /** The actor that the bubble is attached to, or none for a free bubble. */
  actorId?: string;
  /**
   * Where the middle of the bubble is. For an attached bubble, an offset from
   * the ground point of the actor at the size 1 of the actor, so that it
   * grows and shrinks with the actor. For a free bubble, a point in the pixels
   * of the background frame.
   */
  at: Pt;
  /** The widest that the text gets before it wraps, in frame pixels. */
  width: number;
  shape: BubbleShape;
  tail: boolean;
  /**
   * Where the tail points, as `at` is given, if the user has moved it.
   * Without it, the tail of an attached bubble points at the head of the
   * actor, and the tail of a free bubble points down.
   */
  tailTip?: Pt;
  /** The font, if not the default font of the asset pack. */
  font?: BubbleFontId;
  /** The size of the text in frame pixels. */
  fontSize: number;
  /** The colors are CSS hex colors, such as `#1a1a1a`. */
  color: string;
  bold?: boolean;
  italic?: boolean;
  /** Shows the text in capital letters. */
  caps?: boolean;
  /** How the lines line up, `center` if not set. */
  align?: 'left' | 'center' | 'right';
  /** The height of a line against the size of the text, 1.2 if not set. */
  lineSpacing?: number;
  fill: string;
  border: BubbleBorder;
  borderColor: string;
  /** The width of the border in frame pixels. */
  borderWidth: number;
  /** Whether the bubble pops in and out, true if not set. */
  pop?: boolean;
}
