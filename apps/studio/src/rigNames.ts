// The names of the points, the pieces and the draw entries of a rig, in the
// language of the UI.
import type { DrawEntry } from '@toonhouse/renderer';

import { isTextKey, useI18n } from './i18n/index.tsx';

export function useRigNames() {
  const { tr } = useI18n();
  const name = (key: string, fallback: string) =>
    isTextKey(key) ? tr(key) : fallback;
  return {
    joint: (joint: string) => name(`joint.${joint}`, joint),
    part: (part: string) => name(`part.${part}`, part),
    group: (group: string) => name(`attach.${group}`, group),
    layer: (layer: string) => name(`layer.${layer}`, layer),
    /** The name of an entry in the draw order. */
    entry: (e: DrawEntry) => {
      const slot = name(`entry.${e.slot}`, e.slot);
      return e.layer === undefined
        ? slot
        : tr('layerEntry', { slot, layer: name(`layer.${e.layer}`, e.layer) });
    },
  };
}
