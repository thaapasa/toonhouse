import type { ColorPreset, Rig } from '@toonhouse/model';
import type { ColorChoice } from '@toonhouse/renderer';

import { isTextKey, useI18n } from '../i18n/index.tsx';

interface Props {
  rig: Rig;
  choice: ColorChoice;
  onChoice(choice: ColorChoice): void;
}

/** A swatch with a stripe for each color of the preset. */
function Swatch({ preset }: { preset: ColorPreset }) {
  const colors = Object.values(preset.colors);
  return (
    <span className="swatch-colors">
      {colors.map((c, i) => (
        <span key={i} style={{ background: c }} />
      ))}
    </span>
  );
}

/** Picks a preset for each color setting of the rig, to preview it. */
export function ColorPanel({ rig, choice, onChoice }: Props) {
  const { tr } = useI18n();
  const settings = rig.colorSettings ?? [];
  if (settings.length === 0) {
    return <div className="hint">{tr('colorsNone')}</div>;
  }
  const text = (key: string, fallback: string) =>
    isTextKey(key) ? tr(key) : fallback;

  return (
    <>
      {settings.map((s) => {
        const picked = choice[s.id] ?? s.presets[0]?.id;
        return (
          <section key={s.id} className="inspector-section">
            <div className="section-title">
              {text(`colorSetting.${s.id}`, s.id)}
            </div>
            <div className="swatches" role="group">
              {s.presets.map((p, i) => {
                const name = text(`color.${p.id}`, p.id);
                const label =
                  i === 0 ? tr('colorPresetDefault', { name }) : name;
                return (
                  <button
                    key={p.id}
                    type="button"
                    className="swatch"
                    aria-pressed={p.id === picked}
                    aria-label={label}
                    title={label}
                    onClick={() => onChoice({ ...choice, [s.id]: p.id })}
                  >
                    <Swatch preset={p} />
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
      <section className="inspector-section">
        <div className="actions">
          <button
            type="button"
            className="button"
            disabled={Object.keys(choice).length === 0}
            onClick={() => onChoice({})}
          >
            {tr('colorsReset')}
          </button>
        </div>
        <div className="hint">{tr('colorsHint')}</div>
      </section>
    </>
  );
}
