// Pure edits of the cast of a cartoon and of the settings of its cast members
// and actors. A setting that a level leaves out comes from the level above,
// so clearing an override takes the field away.
import { CONTENT_LIMITS } from '@toonhouse/api';
import type {
  Actor,
  ActorAsset,
  ActorSettings,
  CartoonContent,
  CastMember,
} from '@toonhouse/model';
import { castMemberOf, clamp, mergeSettings } from '@toonhouse/renderer';

import { newId, updateById } from './sceneEdit.ts';

const L = CONTENT_LIMITS;

/** A setting of a character or a prop: its size or one of its color settings. */
export type SettingKey = { type: 'scale' } | { type: 'color'; id: string };

/** A size inside the limits of the server, with four decimals at most. */
export const savedScale = (scale: number) =>
  Math.round(clamp(scale, L.scale.min, L.scale.max) * 1e4) / 1e4;

/**
 * A name inside the limits of the server. The limit counts UTF-16 code units,
 * and the cut doesn't split a character that takes two, such as an emoji,
 * because the server refuses half of one.
 */
export function savedName(name: string): string {
  const cut = name.slice(0, L.castName);
  const last = cut.charCodeAt(cut.length - 1);
  return last >= 0xd800 && last <= 0xdbff ? cut.slice(0, -1) : cut;
}

export const withScale = (
  s: ActorSettings | undefined,
  scale: number,
): ActorSettings => ({ ...s, scale: savedScale(scale) });

export const withColor = (
  s: ActorSettings | undefined,
  setting: string,
  preset: string,
): ActorSettings => ({ ...s, colors: { ...s?.colors, [setting]: preset } });

/** The settings without `key`, which then comes from the level above. */
export function without(
  s: ActorSettings | undefined,
  key: SettingKey,
): ActorSettings {
  const rest = { ...s };
  if (key.type === 'scale') delete rest.scale;
  else if (rest.colors) {
    const colors = { ...rest.colors };
    delete colors[key.id];
    if (Object.keys(colors).length > 0) rest.colors = colors;
    else delete rest.colors;
  }
  return rest;
}

/** Whether the settings set `key`. */
export const hasSetting = (s: ActorSettings | undefined, key: SettingKey) =>
  key.type === 'scale'
    ? s?.scale !== undefined
    : s?.colors?.[key.id] !== undefined;

/** The actor with new overrides. Empty overrides leave the field out. */
export function withOverrides(actor: Actor, overrides: ActorSettings): Actor {
  const rest = { ...actor };
  delete rest.overrides;
  return Object.keys(overrides).length > 0 ? { ...rest, overrides } : rest;
}

export const overrideScale = (actor: Actor, scale: number): Actor =>
  withOverrides(actor, withScale(actor.overrides, scale));

export const overrideColor = (
  actor: Actor,
  setting: string,
  preset: string,
): Actor => withOverrides(actor, withColor(actor.overrides, setting, preset));

/** The actor without the override, so that it follows its cast member again. */
export const clearOverride = (actor: Actor, key: SettingKey): Actor =>
  withOverrides(actor, without(actor.overrides, key));

export const newCastMember = (asset: ActorAsset, name: string): CastMember => ({
  id: newId(),
  name: savedName(name),
  asset: { kind: asset.kind, id: asset.id },
  settings: {},
});

export const addCastMember = (
  content: CartoonContent,
  member: CastMember,
): CartoonContent => ({ ...content, cast: [...(content.cast ?? []), member] });

export function updateCastMember(
  content: CartoonContent,
  id: string,
  fn: (m: CastMember) => CastMember,
): CartoonContent {
  const cast = content.cast ?? [];
  const next = updateById(cast, id, fn);
  return next === cast ? content : { ...content, cast: next };
}

/** Changes every actor of every scene with `fn`. */
function mapActors(
  content: CartoonContent,
  fn: (a: Actor) => Actor,
): CartoonContent {
  return {
    ...content,
    scenes: content.scenes.map((s) => ({ ...s, actors: s.actors.map(fn) })),
  };
}

/** How many actors in the cartoon use the cast member. */
export const castUsers = (content: CartoonContent, id: string) =>
  content.scenes.reduce(
    (n, s) => n + s.actors.filter((a) => a.cast === id).length,
    0,
  );

/**
 * Removes a cast member. Its actors stay in their scenes without a cast
 * member, and they look the same as before: the settings of the cast member
 * become their overrides, under the overrides that they already had.
 */
export function removeCastMember(
  content: CartoonContent,
  id: string,
): CartoonContent {
  const member = content.cast?.find((m) => m.id === id);
  const cast = (content.cast ?? []).filter((m) => m.id !== id);
  return mapActors({ ...content, cast }, (a) => {
    if (a.cast !== id) return a;
    const rest = { ...a };
    delete rest.cast;
    return withOverrides(rest, mergeSettings(member?.settings, a.overrides));
  });
}

/**
 * Makes a cast member from an actor without one. The settings of the actor
 * become the settings of the cast member, and the actor uses it with no
 * overrides. The other actors of the same character or prop don't change.
 */
export function castFromActor(
  content: CartoonContent,
  sceneId: string,
  actorId: string,
  name: string,
): { content: CartoonContent; member: CastMember | null } {
  const actor = content.scenes
    .find((s) => s.id === sceneId)
    ?.actors.find((a) => a.id === actorId);
  if (!actor || castMemberOf(actor, content.cast))
    return { content, member: null };
  const member: CastMember = {
    ...newCastMember(actor.asset, name),
    // An actor whose cast member is gone starts from the library.
    settings: actor.overrides ?? {},
  };
  const next = addCastMember(content, member);
  return {
    member,
    content: {
      ...next,
      scenes: updateById(next.scenes, sceneId, (s) => ({
        ...s,
        actors: updateById(s.actors, actorId, (a) => {
          const rest = { ...a, cast: member.id };
          delete rest.overrides;
          return rest;
        }),
      })),
    },
  };
}
