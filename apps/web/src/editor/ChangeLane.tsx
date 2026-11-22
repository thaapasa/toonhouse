// The rows of the time of day and the weather on the timeline. Each change is
// a block between a time mark at its start and one at its end, as a camera
// move is, and the mark at time 0 has the start values.
//
// A tap on a change selects the row and moves the playhead to the end of the
// change, where the scene holds its target, so that the properties pane shows
// the change. Dragging the start or the end changes only that time, and
// dragging the block moves the whole change.
import type { TimeChange, WeatherChange } from '@toonhouse/model';
import { changeEnd } from '@toonhouse/renderer';

import { useI18n } from '../i18n/index.tsx';
import type { BlockDrag } from './blockEdit.ts';
import { CURVE, curvePoints } from './CameraLane.tsx';
import type { EditRun } from './history.ts';
import type { PinchCount } from './pointer.ts';
import { changeHolder, type SkyRow } from './skyEdit.ts';
import { formatTime } from './timelineMath.ts';
import { useLaneDrag } from './useLaneDrag.ts';

type Change = TimeChange | WeatherChange;

interface Grip {
  change: Change;
  part: BlockDrag;
  /** Where the dragged part is when the drag starts. */
  t: number;
  /** Where the playhead goes after a tap. */
  tap: number;
}

interface Props {
  row: SkyRow;
  changes: readonly Change[];
  pps: number;
  fps: number;
  t: number;
  selected: boolean;
  /** Selects the row and moves the playhead to `t`. */
  onSelect(t: number): void;
  onDrag(id: string, part: BlockDrag, t: number, run: EditRun): void;
  onDragDone(): void;
  pinches: PinchCount;
  onCancel(run: EditRun): void;
}

export function ChangeLane(props: Props) {
  const { tr } = useI18n();
  const { pps, fps } = props;
  const k = props.row === 'time' ? 'sky' : 'weather';
  const changes = [...props.changes].sort((a, b) => a.t - b.t);
  const holder = props.selected ? changeHolder(changes, props.t) : null;
  const frame = (t: number) => Math.round(t * fps) / fps;

  const drag = useLaneDrag<Grip>({
    pinches: props.pinches,
    onMove: (g, dx, run) =>
      props.onDrag(
        g.change.id,
        g.part,
        Math.max(frame(g.t + dx / pps), 0),
        run,
      ),
    onTap: (g) => props.onSelect(g.tap),
    onDone: props.onDragDone,
    onCancel: (_, run) => props.onCancel(run),
  });

  const mark = (grip: Grip, part: 'start' | 'end', pressed: boolean) => (
    <button
      key={`${part}-${grip.change.id}`}
      type="button"
      className={`time-mark ${part}`}
      aria-pressed={pressed}
      style={{ left: grip.t * pps }}
      aria-label={tr(part === 'start' ? `${k}.changeStart` : `${k}.changeEnd`, {
        time: formatTime(grip.t),
      })}
      title={formatTime(grip.t)}
      onClick={drag.click()}
      {...drag.handlers(grip)}
    />
  );

  return (
    <>
      <button
        type="button"
        className="time-mark"
        aria-pressed={holder?.change === null}
        style={{ left: 0 }}
        aria-label={tr(`${k}.startMark`)}
        title={tr(`${k}.startMark`)}
        onClick={(e) => {
          e.stopPropagation();
          props.onSelect(0);
        }}
      />
      {changes.map((c) => {
        const held = holder?.change?.id === c.id;
        const end = changeEnd(c);
        const width = Math.max((end - c.t) * pps - 2, 6);
        return [
          <button
            key={c.id}
            type="button"
            className={`action-block change-block ${props.row}-block`}
            aria-pressed={held}
            aria-label={tr(`${k}.changeBlock`, {
              start: formatTime(c.t),
              end: formatTime(end),
            })}
            style={{ left: c.t * pps, width }}
            onClick={drag.click()}
            {...drag.handlers({ change: c, part: 'block', t: c.t, tap: end })}
          >
            <svg
              className="camera-curve"
              width={width}
              height={CURVE}
              aria-hidden
            >
              <polyline points={curvePoints(c.easing, width)} />
            </svg>
          </button>,
          mark({ change: c, part: 'start', t: c.t, tap: c.t }, 'start', false),
          mark(
            { change: c, part: 'end', t: end, tap: end },
            'end',
            held && !holder?.moving,
          ),
        ];
      })}
    </>
  );
}
