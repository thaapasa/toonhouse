// The names of the points and the pieces of a rig, in the language of the UI.
import { isTextKey, useI18n } from './i18n/index.tsx';

export function useRigNames() {
  const { tr } = useI18n();
  const name = (key: string, fallback: string) =>
    isTextKey(key) ? tr(key) : fallback;
  return {
    joint: (joint: string) => name(`joint.${joint}`, joint),
    part: (part: string) => name(`part.${part}`, part),
    group: (group: string) => name(`attach.${group}`, group),
  };
}
