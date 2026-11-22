// The sky, the time of day and the weather in the properties pane: the start
// values of the scene, and the target and the timing of the selected time
// change or weather change.
import {
  type Background,
  type Scene,
  type Sky,
  SKY_PRESET_IDS,
  type SkyPresetId,
  type TimeChange,
  type WeatherChange,
  type WeatherState,
} from '@toonhouse/model';
import {
  CAMERA_EASINGS,
  changeEnd,
  DEFAULT_EASING,
  restingSky,
  sceneSky,
  skyColors,
  startWeather,
  WEATHER_KEYS,
} from '@toonhouse/renderer';
import { useRef } from 'react';

import { IconButton } from '../components/IconButton.tsx';
import { DeleteIcon, PlusIcon } from '../components/icons.tsx';
import { type TextKey, useI18n } from '../i18n/index.tsx';
import type { BlockDrag } from './blockEdit.ts';
import { ColorField } from './BubbleSection.tsx';
import { EASING_LABELS } from './CameraSection.tsx';
import type { EditRun } from './history.ts';
import { NumberField } from './NumberField.tsx';
import { newSeed } from './sceneEdit.ts';
import {
  changesOf,
  clockOf,
  dragChange,
  setChangeEasing,
  setSkyLook,
  setStartHour,
  setStartWeather,
  setSun,
  setTimeTarget,
  setWeatherTarget,
  type SkyRow,
  weatherAtChange,
  weatherRange,
  withSeed,
} from './skyEdit.ts';

type Edit = (fn: (scene: Scene) => Scene, run?: EditRun) => void;

const PRESET_LABELS: Record<SkyPresetId, TextKey> = {
  blue: 'sky.presetBlue',
  peach: 'sky.presetPeach',
  pale: 'sky.presetPale',
  lilac: 'sky.presetLilac',
};

const WEATHER_LABELS: Record<keyof WeatherState, TextKey> = {
  clouds: 'weather.clouds',
  cloudDark: 'weather.cloudDark',
  wind: 'weather.wind',
  rain: 'weather.rain',
  snow: 'weather.snow',
  mist: 'weather.mist',
};

/** The kinds of sky that the user picks from. A color is a gradient with one color. */
type SkyMode = 'preset' | 'color' | 'gradient' | 'space';
const SKY_MODES: readonly SkyMode[] = ['preset', 'color', 'gradient', 'space'];
const MODE_LABELS: Record<SkyMode, TextKey> = {
  preset: 'sky.preset',
  color: 'sky.color',
  gradient: 'sky.gradient',
  space: 'sky.space',
};

const modeOf = (sky: Sky): SkyMode =>
  sky.kind === 'gradient'
    ? sky.top === sky.bottom
      ? 'color'
      : 'gradient'
    : sky.kind;

/** The colors of a sky at noon, at the top and at the bottom. */
const noonColors = (bg: Background, sky: Sky) =>
  skyColors({ ...restingSky(bg), sky });

/**
 * A run of edits of the same field, such as dragging in a color picker, is one
 * undo step.
 */
function useEditRun(onEdit: Edit) {
  const run = useRef<{ field: string } | null>(null);
  return {
    run: (field: string, fn: (s: Scene) => Scene) => {
      if (run.current?.field !== field) run.current = { field };
      onEdit(fn, run.current);
    },
    end: () => {
      run.current = null;
    },
  };
}

/** The sky of the scene, the sun and the time of day at the start. */
export function SkyFields(props: {
  scene: Scene;
  bg: Background;
  onEdit: Edit;
}) {
  const { tr } = useI18n();
  const { scene, bg, onEdit } = props;
  const sky = sceneSky(scene, bg);
  const mode = modeOf(sky);
  const colors = useEditRun(onEdit);
  const sun = scene.sky?.sun ?? true;
  const start = scene.sky?.start ?? 12;
  const setLook = (look: Sky | undefined) => {
    colors.end();
    onEdit((s) => setSkyLook(s, look));
  };
  const pickMode = (m: SkyMode) => {
    if (m === mode) return;
    const [top, bottom] = noonColors(bg, sky);
    if (m === 'preset')
      setLook({
        kind: 'preset',
        id: bg.sky?.kind === 'preset' ? bg.sky.id : 'blue',
      });
    else if (m === 'space') setLook({ kind: 'space' });
    else if (m === 'color') setLook({ kind: 'gradient', top, bottom: top });
    else setLook({ kind: 'gradient', top, bottom });
  };
  const setColor = (field: 'top' | 'bottom' | 'both', color: string) => {
    if (sky.kind !== 'gradient') return;
    const next =
      field === 'both'
        ? { ...sky, top: color, bottom: color }
        : { ...sky, [field]: color };
    colors.run(field, (s) => setSkyLook(s, next));
  };

  return (
    <>
      <h4>{tr('sky.title')}</h4>
      <div
        className="segmented sky-modes"
        role="group"
        aria-label={tr('sky.look')}
      >
        {SKY_MODES.map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => pickMode(m)}
          >
            {tr(MODE_LABELS[m])}
          </button>
        ))}
      </div>
      {sky.kind === 'preset' && (
        <div className="sky-presets" role="group" aria-label={tr('sky.preset')}>
          {SKY_PRESET_IDS.map((id) => {
            const [top, bottom] = noonColors(bg, { kind: 'preset', id });
            return (
              <button
                key={id}
                type="button"
                className="sky-preset"
                aria-pressed={sky.id === id}
                onClick={() => setLook({ kind: 'preset', id })}
              >
                <span
                  className="sky-swatch"
                  style={{
                    background: `linear-gradient(${top}, ${bottom})`,
                  }}
                  aria-hidden
                />
                {tr(PRESET_LABELS[id])}
              </button>
            );
          })}
        </div>
      )}
      {mode === 'color' && sky.kind === 'gradient' && (
        <ColorField
          label="sky.color"
          value={sky.top}
          onChange={(c) => setColor('both', c)}
          onDone={colors.end}
        />
      )}
      {mode === 'gradient' && sky.kind === 'gradient' && (
        <>
          <ColorField
            label="sky.top"
            value={sky.top}
            onChange={(c) => setColor('top', c)}
            onDone={colors.end}
          />
          <ColorField
            label="sky.bottom"
            value={sky.bottom}
            onChange={(c) => setColor('bottom', c)}
            onDone={colors.end}
          />
        </>
      )}
      {scene.sky?.look ? (
        <button
          type="button"
          className="button small"
          onClick={() => setLook(undefined)}
        >
          {tr('sky.useBackground')}
        </button>
      ) : (
        <p className="muted small">{tr('sky.ofBackground')}</p>
      )}
      <div className="pane-row">
        <span>{tr('sky.sun')}</span>
        <div className="segmented" role="group" aria-label={tr('sky.sun')}>
          {([true, false] as const).map((v) => (
            <button
              key={String(v)}
              type="button"
              aria-pressed={sun === v}
              onClick={() => onEdit((s) => setSun(s, v))}
            >
              {tr(v ? 'sky.on' : 'sky.off')}
            </button>
          ))}
        </div>
      </div>
      {!sun && <p className="muted small">{tr('sky.sunOffHint')}</p>}
      <HourField
        label={tr('sky.startHour')}
        value={start}
        onChange={(h) => onEdit((s) => setStartHour(s, h))}
      />
    </>
  );
}

/** An hour of the day, with its clock time under it. */
function HourField(props: {
  label: string;
  value: number;
  onChange(hour: number): void;
}) {
  const { tr } = useI18n();
  const clock = clockOf(props.value);
  return (
    <>
      <NumberField
        label={props.label}
        value={props.value}
        step={1}
        decimals={2}
        unit={tr('sky.hours')}
        onChange={props.onChange}
      />
      <p className="muted small">
        {tr(clock.day > 1 ? 'sky.clockDay' : 'sky.clock', clock)}
      </p>
    </>
  );
}

/** A weather value as a percentage. */
function WeatherField(props: {
  name: keyof WeatherState;
  value: number;
  onChange(v: number): void;
}) {
  const { tr } = useI18n();
  const r = weatherRange(props.name);
  return (
    <NumberField
      label={tr(WEATHER_LABELS[props.name])}
      value={Math.round(props.value * 100)}
      step={10}
      decimals={0}
      unit="%"
      onChange={(v) =>
        props.onChange(Math.min(Math.max(v / 100, r.min), r.max))
      }
    />
  );
}

/** The weather at the start of the scene. */
export function StartWeatherFields(props: { scene: Scene; onEdit: Edit }) {
  const { tr } = useI18n();
  const w = startWeather(props.scene);
  return (
    <>
      <h4>{tr('weather.start')}</h4>
      {WEATHER_KEYS.map((k) => (
        <WeatherField
          key={k}
          name={k}
          value={w[k]}
          onChange={(v) => props.onEdit((s) => setStartWeather(s, k, v))}
        />
      ))}
      <p className="muted small">{tr('weather.windHint')}</p>
    </>
  );
}

/** The button that gives the scene a new seed. */
export function NewLookButton(props: { onEdit: Edit }) {
  const { tr } = useI18n();
  return (
    <>
      <button
        type="button"
        className="button small"
        onClick={() => {
          const seed = newSeed();
          props.onEdit((s) => withSeed(s, seed));
        }}
      >
        {tr('sky.newLook')}
      </button>
      <p className="muted small">{tr('sky.newLookHint')}</p>
    </>
  );
}

/** The start, the length and the easing of a change. */
function ChangeTiming(props: {
  scene: Scene;
  row: SkyRow;
  change: TimeChange | WeatherChange;
  fps: number;
  onEdit: Edit;
  onSeek(t: number): void;
}) {
  const { tr } = useI18n();
  const { row, change } = props;
  /**
   * Changes a time of the change as a drag on the timeline does. With `seek`,
   * the playhead goes to the end of the change, where the pane keeps showing
   * the change.
   */
  const drag = (part: BlockDrag, v: number, seek: boolean) => {
    props.onEdit((s) => dragChange(s, row, change.id, part, v));
    const moved = changesOf(
      dragChange(props.scene, row, change.id, part, v),
      row,
    ).find((c) => c.id === change.id);
    if (seek && moved) props.onSeek(changeEnd(moved));
  };
  return (
    <>
      <NumberField
        label={tr('properties.start')}
        value={change.t}
        step={1 / props.fps}
        decimals={2}
        unit={tr('properties.seconds')}
        onChange={(v) => drag('start', v, false)}
      />
      <NumberField
        label={tr('camera.length')}
        value={change.length}
        step={0.1}
        decimals={2}
        unit={tr('properties.seconds')}
        onChange={(v) => drag('end', change.t + v, true)}
      />
      <div className="pane-row">
        <span>{tr('camera.easing')}</span>
      </div>
      <div
        className="segmented easing"
        role="group"
        aria-label={tr('camera.easing')}
      >
        {CAMERA_EASINGS.map((e) => (
          <button
            key={e}
            type="button"
            aria-pressed={(change.easing ?? DEFAULT_EASING) === e}
            onClick={() =>
              props.onEdit((s) => setChangeEasing(s, row, change.id, e))
            }
          >
            {tr(EASING_LABELS[e])}
          </button>
        ))}
      </div>
    </>
  );
}

/** A hint and a button while the playhead is inside the change. */
function Moving(props: { row: SkyRow; end: number; onSeek(t: number): void }) {
  const { tr } = useI18n();
  return (
    <>
      <p className="muted small">
        {tr(props.row === 'time' ? 'sky.movingHint' : 'weather.movingHint')}
      </p>
      <button
        type="button"
        className="button small"
        onClick={() => props.onSeek(props.end)}
      >
        {tr('camera.goToEnd')}
      </button>
    </>
  );
}

export function TimeChangeSection(props: {
  scene: Scene;
  change: TimeChange;
  moving: boolean;
  fps: number;
  onEdit: Edit;
  onSeek(t: number): void;
}) {
  const { tr } = useI18n();
  const { change } = props;
  return (
    <div className="pane-section">
      <h3>{tr('sky.change')}</h3>
      <ChangeTiming row="time" {...props} />
      {props.moving && (
        <Moving row="time" end={changeEnd(change)} onSeek={props.onSeek} />
      )}
      <HourField
        label={tr('sky.changeTo')}
        value={change.to}
        onChange={(h) => props.onEdit((s) => setTimeTarget(s, change.id, h))}
      />
      <p className="muted small">{tr('sky.changeHint')}</p>
    </div>
  );
}

export function WeatherChangeSection(props: {
  scene: Scene;
  change: WeatherChange;
  moving: boolean;
  fps: number;
  onEdit: Edit;
  onSeek(t: number): void;
}) {
  const { tr } = useI18n();
  const { change, scene } = props;
  const set = WEATHER_KEYS.filter((k) => change.to[k] !== undefined);
  const unset = WEATHER_KEYS.filter((k) => change.to[k] === undefined);
  const target = (k: keyof WeatherState, v: number | undefined) =>
    props.onEdit((s) => setWeatherTarget(s, change.id, k, v));
  return (
    <div className="pane-section">
      <h3>{tr('weather.change')}</h3>
      <ChangeTiming row="weather" {...props} />
      <h4>{tr('weather.changeTo')}</h4>
      {props.moving && (
        <Moving row="weather" end={changeEnd(change)} onSeek={props.onSeek} />
      )}
      {set.length === 0 && (
        <p className="muted small">{tr('weather.nothingSet')}</p>
      )}
      {set.map((k) => (
        <div key={k} className="weather-target">
          <WeatherField
            name={k}
            value={change.to[k]!}
            onChange={(v) => target(k, v)}
          />
          <IconButton
            label="weather.removeValue"
            vars={{ label: tr(WEATHER_LABELS[k]) }}
            small
            onClick={() => target(k, undefined)}
          >
            <DeleteIcon />
          </IconButton>
        </div>
      ))}
      {set.length > 0 && (
        <p className="muted small">{tr('weather.changeHint')}</p>
      )}
      {unset.length > 0 && (
        <div className="weather-add">
          {unset.map((k) => (
            <button
              key={k}
              type="button"
              className="button small"
              aria-label={tr('weather.addValue', {
                label: tr(WEATHER_LABELS[k]),
              })}
              onClick={() => target(k, weatherAtChange(scene, change, k))}
            >
              <PlusIcon />
              {tr(WEATHER_LABELS[k])}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
