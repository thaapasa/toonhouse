import type { Pt } from './geometry.ts';
import type { ClipId } from './pose.ts';

/**
 * The version of the cartoon format. It goes up by one when the format changes
 * so that old cartoons no longer fit it, and the previous version gets a
 * converter to the new one. See "Cartoon format versions" in ARCHITECTURE.md.
 */
export const CARTOON_VERSION = 1;

/** What a cartoon is made of. The title and the sharing are kept apart. */
export interface CartoonContent {
  version: typeof CARTOON_VERSION;
  scenes: Scene[];
}

/** A background with actors on it, and a timeline for them. */
export interface Scene {
  /** Unique within the cartoon. */
  id: string;
  /** The id of a library background, or null before the user picks one. */
  background: string | null;
  /** The actions of the background, such as the sun moving across the sky. */
  backgroundActions: Action[];
  actors: Actor[];
  /**
   * The length of the scene in seconds, if the user has set it. Without it,
   * the scene ends a few seconds after its last action.
   */
  length?: number;
}

/** The library character or prop that an actor uses. */
export interface ActorAsset {
  kind: 'character' | 'prop';
  /** The name of the folder of the asset, such as `boy` or `oak`. */
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
