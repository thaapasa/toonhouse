// The names of the library assets, the actors and the clips, in the language
// of the UI.
import type { ActorAsset, ClipId, ClipKind, Scene } from '@toonhouse/model';

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
    /**
     * The name of each actor in a scene, by its id. If several actors use
     * the same character or prop, they get numbers.
     */
    actors(scene: Scene): Map<string, string> {
      const total = new Map<string, number>();
      const key = (a: ActorAsset) => `${a.kind}.${a.id}`;
      for (const a of scene.actors)
        total.set(key(a.asset), (total.get(key(a.asset)) ?? 0) + 1);
      const seen = new Map<string, number>();
      const names = new Map<string, string>();
      for (const a of scene.actors) {
        const n = (seen.get(key(a.asset)) ?? 0) + 1;
        seen.set(key(a.asset), n);
        names.set(
          a.id,
          total.get(key(a.asset))! > 1
            ? tr('editor.actorNumber', { name: asset(a.asset), n })
            : asset(a.asset),
        );
      }
      return names;
    },
  };
}
