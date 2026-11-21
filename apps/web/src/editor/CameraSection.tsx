// The camera in the properties pane: the view that the camera holds at the
// current time, and the timing and the easing of its move. While a move plays,
// the pane shows that move.
import type { Background, CameraEasing, Scene } from '@toonhouse/model';
import {
  CAMERA_EASINGS,
  cameraAt,
  cameraHolder,
  cameraMoveEnd,
  clampCamera,
  DEFAULT_EASING,
  isJump,
  wholeBackground,
} from '@toonhouse/renderer';

import { type TextKey, useI18n } from '../i18n/index.tsx';
import {
  dragCameraMove,
  setCameraView,
  updateCameraMove,
} from './cameraEdit.ts';
import { NumberField } from './NumberField.tsx';

const EASING_LABELS: Record<CameraEasing, TextKey> = {
  linear: 'camera.linear',
  'ease-in': 'camera.easeIn',
  'ease-out': 'camera.easeOut',
  'ease-in-out': 'camera.easeInOut',
};

export function CameraSection(props: {
  scene: Scene;
  bg: Background;
  t: number;
  fps: number;
  onEdit(fn: (scene: Scene) => Scene): void;
  onSeek(t: number): void;
}) {
  const { tr } = useI18n();
  const { scene, bg } = props;
  const { move, moving } = cameraHolder(scene, props.t);
  const id = move?.id ?? null;
  const view = move ? clampCamera(bg, move.to) : cameraAt(scene, bg, 0);
  const frame = 1 / props.fps;
  const setView = (v: Partial<typeof view>) =>
    props.onEdit((s) =>
      setCameraView(s, id, clampCamera(bg, { ...view, ...v })),
    );

  const title: TextKey = !move
    ? 'camera.startView'
    : isJump(move)
      ? 'camera.jump'
      : 'camera.move';

  return (
    <div className="pane-section">
      <h3>{tr(title)}</h3>
      {move && isJump(move) && (
        <NumberField
          label={tr('properties.start')}
          value={move.t}
          step={frame}
          decimals={2}
          unit={tr('properties.seconds')}
          onChange={(v) => {
            props.onEdit((s) => dragCameraMove(s, move.id, 'block', v));
            props.onSeek(Math.max(v, 0));
          }}
        />
      )}
      {move && !isJump(move) && (
        <>
          <NumberField
            label={tr('properties.start')}
            value={move.t}
            step={frame}
            decimals={2}
            unit={tr('properties.seconds')}
            onChange={(v) =>
              props.onEdit((s) => dragCameraMove(s, move.id, 'start', v))
            }
          />
          <NumberField
            label={tr('camera.length')}
            value={move.length ?? 0}
            step={0.1}
            decimals={2}
            unit={tr('properties.seconds')}
            onChange={(v) => {
              props.onEdit((s) =>
                dragCameraMove(s, move.id, 'end', move.t + v),
              );
            }}
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
                aria-pressed={(move.easing ?? DEFAULT_EASING) === e}
                onClick={() =>
                  props.onEdit((s) =>
                    updateCameraMove(s, move.id, (m) => ({ ...m, easing: e })),
                  )
                }
              >
                {tr(EASING_LABELS[e])}
              </button>
            ))}
          </div>
        </>
      )}
      <h4>{tr(move && !isJump(move) ? 'camera.moveTo' : 'camera.view')}</h4>
      {moving && move && (
        <>
          <p className="muted small">{tr('camera.movingHint')}</p>
          <button
            type="button"
            className="button small"
            onClick={() => props.onSeek(cameraMoveEnd(move))}
          >
            {tr('camera.goToEnd')}
          </button>
        </>
      )}
      <NumberField
        label={tr('properties.x')}
        value={view.x}
        step={10}
        decimals={1}
        onChange={(x) => setView({ x })}
      />
      <NumberField
        label={tr('properties.y')}
        value={view.y}
        step={10}
        decimals={1}
        onChange={(y) => setView({ y })}
      />
      <NumberField
        label={tr('camera.zoom')}
        value={view.zoom}
        step={0.25}
        decimals={2}
        unit="×"
        onChange={(zoom) => setView({ zoom })}
      />
      <button
        type="button"
        className="button small"
        disabled={view.zoom === 1}
        onClick={() => setView(wholeBackground(bg))}
      >
        {tr('camera.wholeBackground')}
      </button>
      <p className="muted small">{tr('camera.hint')}</p>
    </div>
  );
}
