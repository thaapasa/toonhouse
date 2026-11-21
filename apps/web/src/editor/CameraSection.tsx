// The camera in the properties pane: the view that the camera holds at the
// current time, and the timing and the easing of its move. While a move plays,
// the pane shows that move.
import type { Background, CameraEasing, Scene } from '@toonhouse/model';
import {
  CAMERA_EASINGS,
  cameraAt,
  cameraEntryEnd,
  cameraHolder,
  clampCamera,
  DEFAULT_EASING,
  isJump,
  wholeBackground,
} from '@toonhouse/renderer';

import { type TextKey, useI18n } from '../i18n/index.tsx';
import {
  type CameraDrag,
  dragCameraEntry,
  setCameraView,
  updateCameraEntry,
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
  const { entry, moving } = cameraHolder(scene, props.t);
  const id = entry?.id ?? null;
  const view = entry ? clampCamera(bg, entry.to) : cameraAt(scene, bg, 0);
  const frame = 1 / props.fps;
  const setView = (v: Partial<typeof view>) =>
    props.onEdit((s) =>
      setCameraView(s, bg, id, clampCamera(bg, { ...view, ...v })),
    );
  /**
   * Changes a time of the entry `entryId`, as a drag on the timeline does. With
   * `seek`, the playhead goes to the changed time after the entries beside it
   * have stopped it, so that the pane keeps showing the entry.
   */
  const drag = (
    entryId: string,
    part: CameraDrag,
    v: number,
    seek: boolean,
  ) => {
    props.onEdit((s) => dragCameraEntry(s, entryId, part, v));
    const moved = dragCameraEntry(scene, entryId, part, v).camera?.entries.find(
      (m) => m.id === entryId,
    );
    if (seek && moved)
      props.onSeek(part === 'end' ? cameraEntryEnd(moved) : moved.t);
  };

  const title: TextKey = !entry
    ? 'camera.startView'
    : isJump(entry)
      ? 'camera.jump'
      : 'camera.move';

  return (
    <div className="pane-section">
      <h3>{tr(title)}</h3>
      {entry && isJump(entry) && (
        <NumberField
          label={tr('properties.start')}
          value={entry.t}
          step={frame}
          decimals={2}
          unit={tr('properties.seconds')}
          onChange={(v) => drag(entry.id, 'block', v, true)}
        />
      )}
      {entry && !isJump(entry) && (
        <>
          <NumberField
            label={tr('properties.start')}
            value={entry.t}
            step={frame}
            decimals={2}
            unit={tr('properties.seconds')}
            onChange={(v) => drag(entry.id, 'start', v, false)}
          />
          <NumberField
            label={tr('camera.length')}
            value={entry.length ?? 0}
            step={0.1}
            decimals={2}
            unit={tr('properties.seconds')}
            onChange={(v) => drag(entry.id, 'end', entry.t + v, true)}
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
                aria-pressed={(entry.easing ?? DEFAULT_EASING) === e}
                onClick={() =>
                  props.onEdit((s) =>
                    updateCameraEntry(s, entry.id, (m) => ({
                      ...m,
                      easing: e,
                    })),
                  )
                }
              >
                {tr(EASING_LABELS[e])}
              </button>
            ))}
          </div>
        </>
      )}
      <h4>{tr(entry && !isJump(entry) ? 'camera.moveTo' : 'camera.view')}</h4>
      {moving && entry && (
        <>
          <p className="muted small">{tr('camera.movingHint')}</p>
          <button
            type="button"
            className="button small"
            onClick={() => props.onSeek(cameraEntryEnd(entry))}
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
