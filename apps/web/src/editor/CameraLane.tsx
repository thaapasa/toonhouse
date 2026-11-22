// The camera row of the timeline. A camera move is a block between a time
// mark at its start and one at its end, and a camera jump is a single mark.
// The mark at time 0 has the start view.
//
// Each mark that has a view selects the camera and moves the playhead there,
// so that the stage shows that view for editing. A tap on a move goes to its
// end, where its view is. Dragging the start or the end of a move changes only
// that time, so the views stay and the move gets faster or slower. Dragging
// the block moves the whole move, and dragging a jump moves the jump.
import type { CameraEasing, CameraEntry, Scene } from '@toonhouse/model';
import {
  cameraEntryEnd,
  cameraHolder,
  DEFAULT_EASING,
  ease,
  isJump,
  sortedCameraEntries,
} from '@toonhouse/renderer';

import { type TextKey, useI18n } from '../i18n/index.tsx';
import type { CameraDrag } from './cameraEdit.ts';
import type { EditRun } from './history.ts';
import type { PinchCount } from './pointer.ts';
import { formatTime } from './timelineMath.ts';
import { useLaneDrag } from './useLaneDrag.ts';

/** The height of the curve of the easing in a block, in CSS pixels. */
export const CURVE = 18;

/** A part of a camera move or jump that the user drags. */
interface Grip {
  entry: CameraEntry;
  part: CameraDrag;
  /** Where the dragged part is when the drag starts. */
  t: number;
  /** Where the playhead goes after a tap. */
  tap: number;
}

interface Props {
  scene: Scene;
  pps: number;
  fps: number;
  t: number;
  selected: boolean;
  /** Selects the camera and moves the playhead to `t`. */
  onSelect(t: number): void;
  onDrag(id: string, part: CameraDrag, t: number, run: EditRun): void;
  onDragDone(): void;
  pinches: PinchCount;
  onCancel(run: EditRun): void;
}

/** The curve of an easing as SVG points, `width` wide. */
export function curvePoints(
  easing: CameraEasing | undefined,
  width: number,
): string {
  const steps = 16;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const u = i / steps;
    const v = ease(easing ?? DEFAULT_EASING, u);
    return `${u * width},${CURVE - v * (CURVE - 2) - 1}`;
  }).join(' ');
}

export function CameraLane(props: Props) {
  const { tr } = useI18n();
  const { pps, fps } = props;
  const entries = sortedCameraEntries(props.scene);
  const holder = props.selected ? cameraHolder(props.scene, props.t) : null;
  const frame = (t: number) => Math.round(t * fps) / fps;

  const drag = useLaneDrag<Grip>({
    pinches: props.pinches,
    onMove: (g, dx, run) =>
      props.onDrag(g.entry.id, g.part, Math.max(frame(g.t + dx / pps), 0), run),
    onTap: (g) => props.onSelect(g.tap),
    onDone: props.onDragDone,
    onCancel: (_, run) => props.onCancel(run),
  });

  const mark = (
    key: string,
    grip: Grip,
    label: TextKey,
    className: string,
    pressed: boolean,
  ) => (
    <button
      key={key}
      type="button"
      className={`time-mark ${className}`}
      aria-pressed={pressed}
      style={{ left: grip.t * pps }}
      aria-label={tr(label, { time: formatTime(grip.t) })}
      title={formatTime(grip.t)}
      onClick={drag.click()}
      {...drag.handlers(grip)}
    />
  );

  return (
    <>
      <button
        type="button"
        className="time-mark camera-start"
        aria-pressed={holder?.entry === null}
        style={{ left: 0 }}
        aria-label={tr('camera.startMark')}
        title={tr('camera.startMark')}
        onClick={(e) => {
          e.stopPropagation();
          props.onSelect(0);
        }}
      />
      {entries.map((m) => {
        const held = holder?.entry?.id === m.id;
        if (isJump(m))
          return mark(
            `jump-${m.id}`,
            { entry: m, part: 'block', t: m.t, tap: m.t },
            'camera.jumpMark',
            'camera-jump',
            held,
          );
        const end = cameraEntryEnd(m);
        const width = Math.max((end - m.t) * pps - 2, 6);
        return [
          <button
            key={m.id}
            type="button"
            className="action-block camera-block"
            aria-pressed={held}
            aria-label={tr('camera.moveBlock', {
              start: formatTime(m.t),
              end: formatTime(end),
            })}
            style={{ left: m.t * pps, width }}
            onClick={drag.click()}
            {...drag.handlers({ entry: m, part: 'block', t: m.t, tap: end })}
          >
            <svg
              className="camera-curve"
              width={width}
              height={CURVE}
              aria-hidden
            >
              <polyline points={curvePoints(m.easing, width)} />
            </svg>
          </button>,
          mark(
            `start-${m.id}`,
            { entry: m, part: 'start', t: m.t, tap: m.t },
            'camera.moveStart',
            'start',
            false,
          ),
          mark(
            `end-${m.id}`,
            { entry: m, part: 'end', t: end, tap: end },
            'camera.moveEnd',
            'end camera-end',
            held && !holder?.moving,
          ),
        ];
      })}
    </>
  );
}
