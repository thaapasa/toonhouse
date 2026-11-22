// The settings of a character or a prop: its size and a color preset for each
// color setting. The cast member dialog shows the settings of a cast member,
// and the properties pane those of an actor, with its overrides marked.
import type { ColorPreset, Rig } from '@toonhouse/model';
import type { Settings } from '@toonhouse/renderer';
import type { CSSProperties } from 'react';

import { IconButton } from '../components/IconButton.tsx';
import { ResetIcon } from '../components/icons.tsx';
import { isTextKey, useI18n } from '../i18n/index.tsx';
import type { SettingKey } from './castEdit.ts';
import { NumberField } from './NumberField.tsx';

interface Props {
  rig: Rig;
  /** The settings with every level applied. */
  settings: Settings;
  /**
   * Whether the actor sets the setting itself. Leave out for a cast member,
   * whose settings have no overrides.
   */
  isOverride?: (key: SettingKey) => boolean;
  /** Whether clearing an override goes back to the cast member or the library. */
  hasMember?: boolean;
  onScale(scale: number, closed: boolean): void;
  onColor(setting: string, preset: string): void;
  onClear?(key: SettingKey): void;
}

/** The colors of a swatch: the colors of the preset, with its pattern as dots. */
function swatchStyle(preset: ColorPreset): CSSProperties {
  const colors = [...new Set(Object.values(preset.colors))].slice(0, 2);
  const [a = '#888', b = a] = colors;
  const pattern = Object.values(preset.patterns ?? {})[0];
  const base = `linear-gradient(135deg, ${a} 50%, ${b} 50%)`;
  return {
    background: pattern
      ? `radial-gradient(circle, ${pattern.color} 22%, transparent 26%) 0 0 / 9px 9px, ${base}`
      : base,
  };
}

export function SettingsFields(props: Props) {
  const { tr } = useI18n();
  const { rig, settings } = props;
  const settingName = (id: string) => {
    const key = `colorSetting.${id}`;
    return isTextKey(key) ? tr(key) : id;
  };

  /** The mark and the reset button of a setting that the actor sets itself. */
  const override = (key: SettingKey, label: string) =>
    props.isOverride?.(key) && (
      <span className="setting-override">
        <span className="override-badge">{tr('settings.override')}</span>
        <IconButton
          label={
            props.hasMember
              ? 'settings.clearToMember'
              : 'settings.clearToLibrary'
          }
          vars={{ label }}
          small
          onClick={props.onClear && (() => props.onClear!(key))}
        >
          <ResetIcon />
        </IconButton>
      </span>
    );

  const sizeLabel = tr('properties.size');
  return (
    <div className="settings-fields">
      <div className="setting">
        <NumberField
          label={sizeLabel}
          value={settings.scale * 100}
          step={10}
          decimals={1}
          unit="%"
          onChange={(v, closed) => props.onScale(v / 100, closed)}
        />
        {override({ type: 'scale' }, sizeLabel)}
      </div>
      {(rig.colorSettings ?? []).map((setting) => {
        const label = settingName(setting.id);
        const picked =
          setting.presets.find((p) => p.id === settings.colors[setting.id]) ??
          setting.presets[0];
        return (
          <div key={setting.id} className="setting">
            <div className="setting-head">
              <span className="pane-label">{label}</span>
              {override({ type: 'color', id: setting.id }, label)}
            </div>
            <div className="swatches" role="group" aria-label={label}>
              {setting.presets.map((preset, i) => {
                const text = tr('settings.preset', { label, n: i + 1 });
                return (
                  <button
                    key={preset.id}
                    type="button"
                    className="swatch"
                    aria-pressed={preset === picked}
                    aria-label={text}
                    title={text}
                    style={swatchStyle(preset)}
                    onClick={() => props.onColor(setting.id, preset.id)}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
