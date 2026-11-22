// The settings of an actor come from three levels, and each level starts from
// the one above it: the library character or prop, the cast member of the
// cartoon, and the overrides of the actor in its scene. The renderer draws a
// scene with the settings of each actor worked out, so it gets a `CastScene`.
import type {
  Actor,
  ActorSettings,
  CastMember,
  ColorChoice,
  Scene,
} from '@toonhouse/model';

/** The settings of an actor with every level applied. */
export interface Settings {
  scale: number;
  /** Only the color settings that some level sets. The rest use the library. */
  colors: ColorChoice;
}

/** An actor with its settings worked out. */
export interface CastActor extends Actor {
  settings: Settings;
}

/** A scene whose actors have their settings worked out. */
export interface CastScene extends Omit<Scene, 'actors'> {
  actors: CastActor[];
}

/** The size of an actor that no level sets. */
export const DEFAULT_SCALE = 1;

/** The settings of `top` over the settings of `base`. */
export function mergeSettings(
  base: ActorSettings | undefined,
  top: ActorSettings | undefined,
): ActorSettings {
  const scale = top?.scale ?? base?.scale;
  const colors = { ...base?.colors, ...top?.colors };
  return {
    ...(scale !== undefined && { scale }),
    ...(Object.keys(colors).length > 0 && { colors }),
  };
}

/** The cast member that an actor uses, if the cast has it. */
export const castMemberOf = (
  actor: Actor,
  cast: readonly CastMember[] | undefined,
): CastMember | undefined =>
  actor.cast === undefined ? undefined : cast?.find((m) => m.id === actor.cast);

/**
 * The settings of an actor. If the cast doesn't have its cast member, the
 * actor starts from the library, as an actor without a cast member does.
 */
export function actorSettings(
  actor: Actor,
  cast: readonly CastMember[] | undefined,
): Settings {
  const s = mergeSettings(castMemberOf(actor, cast)?.settings, actor.overrides);
  return { scale: s.scale ?? DEFAULT_SCALE, colors: s.colors ?? {} };
}

export const castActor = (
  actor: Actor,
  cast: readonly CastMember[] | undefined,
): CastActor => ({ ...actor, settings: actorSettings(actor, cast) });

/** The scene with the settings of its actors worked out from the cast. */
export const castScene = (
  scene: Scene,
  cast: readonly CastMember[] | undefined,
): CastScene => ({
  ...scene,
  actors: scene.actors.map((a) => castActor(a, cast)),
});
