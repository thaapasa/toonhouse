import type { Sky, WeatherState } from '@toonhouse/model';
import {
  type Camera,
  clampCamera,
  DEFAULT_SKY,
  layerView,
  WEATHER_KEYS,
} from '@toonhouse/renderer';

import type { BackgroundAsset } from '../backgrounds.ts';
import { type TextKey, useI18n } from '../i18n/index.tsx';
import { useRigNames } from '../rigNames.ts';

interface Props {
  asset: BackgroundAsset;
  camera: Camera;
  hour: number;
  onHour(hour: number): void;
  weather: WeatherState;
  onWeather(weather: WeatherState): void;
}

const round = (n: number) => Math.round(n);

const skyName = (sky: Sky): TextKey =>
  sky.kind === 'preset' ? `sky.${sky.id}` : `sky.${sky.kind}`;

/**
 * The layers of a background, and what the camera shows of each layer, with
 * sliders for the time of day and the weather. The studio doesn't edit
 * backgrounds yet, and each scene has its own sky and weather, so the sliders
 * only change the preview.
 */
export function BackgroundInspector({ asset, camera, ...props }: Props) {
  const { tr } = useI18n();
  const names = useRigNames();
  const bg = asset.background;
  const c = clampCamera(bg, camera);
  const slider = (
    id: string,
    label: string,
    value: number,
    range: { min: number; max: number; step: number },
    set: (v: number) => void,
  ) => (
    <div key={id} className="tune-row">
      <label className="tune-label" htmlFor={`sky-${id}`}>
        {label}
      </label>
      <input
        type="range"
        aria-label={label}
        {...range}
        value={value}
        onChange={(e) => set(Number(e.target.value))}
      />
      <input
        id={`sky-${id}`}
        className="tune-number"
        type="number"
        {...range}
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (e.target.value !== '' && Number.isFinite(v)) set(v);
        }}
      />
    </div>
  );

  return (
    <aside className="inspector" aria-label={tr('properties')}>
      <div className="inspector-body">
        <section className="inspector-section">
          <div className="section-title">{tr('background')}</div>
          <dl className="facts">
            <dt>{tr('frameSize')}</dt>
            <dd>
              {bg.width} × {bg.height}
            </dd>
            <dt>{tr('groundLayer')}</dt>
            <dd>{names.layer(bg.ground.layer)}</dd>
            <dt>{tr('startPoint')}</dt>
            <dd>
              x = {bg.ground.start.x}, y = {bg.ground.start.y}
            </dd>
            <dt>{tr('actorScale')}</dt>
            <dd>{bg.ground.actorScale}</dd>
            <dt>{tr('perspective')}</dt>
            <dd>
              {bg.ground.perspective
                ? tr('perspectiveOf', { ...bg.ground.perspective })
                : tr('perspectiveNone')}
            </dd>
            <dt>{tr('defaultSky')}</dt>
            <dd>{tr(skyName(bg.sky ?? DEFAULT_SKY))}</dd>
            <dt>{tr('place')}</dt>
            <dd>{tr(bg.indoor ? 'indoors' : 'outdoors')}</dd>
          </dl>
        </section>

        <section className="inspector-section">
          <div className="section-title">{tr('skyWeather')}</div>
          <div className="hint">{tr('skyWeatherHint')}</div>
          {slider(
            'hour',
            tr('hour'),
            props.hour,
            { min: 0, max: 24, step: 0.25 },
            props.onHour,
          )}
          {WEATHER_KEYS.map((k) =>
            slider(
              k,
              tr(`weather.${k}`),
              props.weather[k],
              { min: k === 'wind' ? -1 : 0, max: 1, step: 0.05 },
              (v) => props.onWeather({ ...props.weather, [k]: v }),
            ),
          )}
        </section>

        <section className="inspector-section">
          <div className="section-title">{tr('layers')}</div>
          <div className="hint">{tr('layersHint')}</div>
          <div className="order-end">{tr('orderFront')}</div>
          <ol className="draw-order">
            {[...bg.layers].reverse().map((l) => {
              const v = layerView(bg, c, l.depth);
              return (
                <li key={l.id} className="order-row layer-row">
                  <div className="order-name">
                    <span>
                      {names.layer(l.id)}
                      {l.id === bg.ground.layer && (
                        <span className="tag">{tr('groundTag')}</span>
                      )}
                    </span>
                    <span className="order-kind">
                      {tr('depthOf', { n: l.depth })}
                      {' · '}
                      {tr('layerZoom', {
                        n: round((bg.width / v.width) * 100),
                      })}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="order-end">{tr('orderBack')}</div>
        </section>

        <section className="inspector-section">
          <div className="section-title">{tr('camera')}</div>
          <dl className="facts">
            <dt>{tr('cameraMiddle')}</dt>
            <dd>
              {round(c.x)}, {round(c.y)}
            </dd>
            <dt>{tr('zoom')}</dt>
            <dd>{round(c.zoom * 100)}%</dd>
          </dl>
          <div className="hint">{tr('cameraHint')}</div>
        </section>
      </div>
    </aside>
  );
}
