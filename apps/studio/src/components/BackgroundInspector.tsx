import type { BackgroundPart } from '@toonhouse/model';
import { type Camera, clampCamera, layerView } from '@toonhouse/renderer';

import type { BackgroundAsset } from '../backgrounds.ts';
import { useI18n } from '../i18n/index.tsx';
import { useRigNames } from '../rigNames.ts';

interface Props {
  asset: BackgroundAsset;
  camera: Camera;
}

const round = (n: number) => Math.round(n);

/**
 * The layers and the parts of a background, and what the camera shows of
 * each layer. The studio doesn't edit backgrounds yet, so this only shows
 * them.
 */
export function BackgroundInspector({ asset, camera }: Props) {
  const { tr } = useI18n();
  const names = useRigNames();
  const bg = asset.background;
  const parts = Object.entries(bg.parts ?? {});
  const c = clampCamera(bg, camera);
  const motion = (p: BackgroundPart) =>
    p.arc
      ? tr('motionArc')
      : p.drift
        ? tr('motionDrift', { n: p.drift.speed })
        : tr('motionNone');

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
          </dl>
        </section>

        <section className="inspector-section">
          <div className="section-title">{tr('layers')}</div>
          <div className="hint">{tr('layersHint')}</div>
          <div className="order-end">{tr('orderFront')}</div>
          <ol className="draw-order">
            {[...bg.layers].reverse().map((l) => {
              const v = layerView(bg, c, l.depth);
              const own = parts.filter(([, p]) => p.layer === l.id);
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
                    {own.length > 0 && (
                      <span className="order-kind">
                        {tr('partsOn', {
                          list: own.map(([id]) => names.part(id)).join(', '),
                        })}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="order-end">{tr('orderBack')}</div>
        </section>

        {parts.length > 0 && (
          <section className="inspector-section">
            <div className="section-title">{tr('movingParts')}</div>
            {parts.map(([id, p]) => (
              <div key={id} className="order-row layer-row">
                <div className="order-name">
                  <span>{names.part(id)}</span>
                  <span className="order-kind">{motion(p)}</span>
                </div>
              </div>
            ))}
          </section>
        )}

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
