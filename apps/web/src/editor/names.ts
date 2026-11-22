// The names of the library assets, the actors and the clips, in the language
// of the UI.
import type {
  Actor,
  ActorAsset,
  CastMember,
  ClipId,
  ClipKind,
  Scene,
} from '@toonhouse/model';
import { castMemberOf } from '@toonhouse/renderer';

import { isTextKey, useI18n } from '../i18n/index.tsx';

export function useNames() {
  const { tr } = useI18n();
  const name = (key: string, fallback: string) =>
    isTextKey(key) ? tr(key) : fallback;
  const asset = (a: ActorAsset) => name(`${a.kind}.${a.id}`, a.id);
  return {
    asset,
    background: (id: string) => name(`background.${id}`, id),
    clip: (kind: ClipKind, id: ClipId) =>
      kind === 'background' && id === 'idle'
        ? tr('clip.backgroundIdle')
        : name(`clip.${id}`, id),
    /** The name of a cast member, or of its character or prop if it has none. */
    member: (m: CastMember) => m.name.trim() || asset(m.asset),
    /**
     * The name of each actor in a scene, by its id: the name of its cast
     * member, or else of its character or prop. If several actors have the
     * same cast member, or the same character or prop without one, they get
     * numbers.
     */
    actors(
      scene: Scene,
      cast: readonly CastMember[] | undefined,
    ): Map<string, string> {
      const base = (a: Actor) => {
        const m = castMemberOf(a, cast);
        return m
          ? { key: `cast.${m.id}`, name: m.name.trim() || asset(m.asset) }
          : { key: `${a.asset.kind}.${a.asset.id}`, name: asset(a.asset) };
      };
      const total = new Map<string, number>();
      for (const a of scene.actors) {
        const { key } = base(a);
        total.set(key, (total.get(key) ?? 0) + 1);
      }
      const seen = new Map<string, number>();
      const names = new Map<string, string>();
      for (const a of scene.actors) {
        const { key, name } = base(a);
        const n = (seen.get(key) ?? 0) + 1;
        seen.set(key, n);
        names.set(
          a.id,
          total.get(key)! > 1 ? tr('editor.actorNumber', { name, n }) : name,
        );
      }
      return names;
    },
  };
}
