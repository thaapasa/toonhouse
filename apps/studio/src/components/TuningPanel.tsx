import type { Rig } from '@toonhouse/model';

import { isTextKey, type TextKey, useI18n } from '../i18n/index.tsx';
import {
  isTuned,
  type TuneField,
  tuneFields,
  type TuneGroup,
  tuneValue,
  withTune,
} from '../tuning.ts';

const GROUPS: { id: TuneGroup; title: TextKey; hint: TextKey }[] = [
  { id: 'sizes', title: 'tuneSizes', hint: 'tuneSizesHint' },
  { id: 'limbs', title: 'tuneLimbs', hint: 'tuneLimbsHint' },
  { id: 'motion', title: 'tuneMotion', hint: 'tuneMotionHint' },
];

interface Props {
  rig: Rig;
  onRig(rig: Rig): void;
}

/** Sliders for the sizes of the parts and how the clips fit the character. */
export function TuningPanel({ rig, onRig }: Props) {
  const { tr } = useI18n();
  const fields = tuneFields(rig);
  if (fields.length === 0) {
    return <div className="hint">{tr('tuneNone')}</div>;
  }

  const row = (f: TuneField) => {
    const value = tuneValue(rig, f);
    const set = (v: number) => onRig(withTune(rig, f, v));
    const label = isTextKey(f.id) ? tr(f.id) : f.id;
    return (
      <div key={f.id} className="tune-row">
        <label className="tune-label" htmlFor={`tune-${f.id}`}>
          {label}
        </label>
        <input
          type="range"
          aria-label={label}
          min={f.min}
          max={f.max}
          step={f.step}
          value={value}
          onChange={(e) => set(Number(e.target.value))}
        />
        <input
          id={`tune-${f.id}`}
          className="tune-number"
          type="number"
          step={f.step}
          value={value}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (e.target.value !== '' && Number.isFinite(v)) set(v);
          }}
        />
        {f.fallback !== undefined && (
          <button
            type="button"
            className="tune-reset"
            disabled={!isTuned(rig, f)}
            title={tr('tuneReset', { value: f.fallback })}
            aria-label={tr('tuneReset', { value: f.fallback })}
            onClick={() => onRig(withTune(rig, f, undefined))}
          >
            ↺
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      {GROUPS.map((g) => {
        const list = fields.filter((f) => f.group === g.id);
        if (list.length === 0) return null;
        return (
          <section key={g.id} className="inspector-section">
            <div className="section-title">{tr(g.title)}</div>
            {list.map(row)}
            <div className="hint">{tr(g.hint)}</div>
          </section>
        );
      })}
    </>
  );
}
