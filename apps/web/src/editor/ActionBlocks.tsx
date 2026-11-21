// The actions of one row of the timeline, as blocks from their start until
// the next action. A tap selects an action, and a drag moves the whole action.
import type { Action } from '@toonhouse/model';
import {
  actionSpeed,
  clamp,
  clipOf,
  clipStartOf,
  sortedActions,
} from '@toonhouse/renderer';

import { CLIP_COLORS } from './clipIcons.tsx';
import type { EditRun } from './history.ts';
import { useNames } from './names.ts';
import type { PinchCount } from './pointer.ts';
import { progressPoints, snapTenth, type TimelineRow } from './timelineMath.ts';
import { useLaneDrag } from './useLaneDrag.ts';

/** The height of the progress strip of an action, in CSS pixels. */
const STRIP = 8;

export function ActionBlocks(props: {
  row: TimelineRow;
  duration: number;
  /** The length of the timeline, which an action can be moved to. */
  length: number;
  pps: number;
  selected: string | null;
  onSelect(actionId: string, t: number): void;
  onMove(actionId: string, t: number, run: EditRun): void;
  onMoveDone(): void;
  pinches: PinchCount;
  onCancel(run: EditRun): void;
}) {
  const names = useNames();
  const actions = sortedActions(props.row.actions);
  const drag = useLaneDrag<Action>({
    pinches: props.pinches,
    onMove: (a, dx, run) =>
      props.onMove(
        a.id,
        clamp(snapTenth(a.t + dx / props.pps), 0, props.length),
        run,
      ),
    onTap: (a) => props.onSelect(a.id, a.t),
    onDone: props.onMoveDone,
    onCancel: (_, run) => props.onCancel(run),
  });

  return actions.map((a, i) => {
    const end = Math.min(actions[i + 1]?.t ?? props.duration, props.duration);
    const color = CLIP_COLORS[a.clip];
    const width = Math.max((end - a.t) * props.pps - 2, 6);
    const points = progressPoints({
      length: end - a.t,
      pps: props.pps,
      height: STRIP,
      walk: props.row.walkTimes.get(a.id),
      loop: clipOf(props.row.kind, a.clip).duration / actionSpeed(a),
      phase: clipStartOf(a),
    });
    return (
      <button
        key={a.id}
        type="button"
        className="action-block"
        aria-pressed={props.selected === a.id}
        style={{
          left: a.t * props.pps,
          width,
          background: color,
          color: a.clip === 'idle' ? 'var(--text)' : 'var(--on-accent)',
        }}
        {...drag.handlers(a)}
        onClick={drag.click()}
      >
        {names.clip(props.row.kind, a.clip)}
        {/* The strip fills up with a darker shade of the clip color as the
            clip plays, once for each loop or once over a whole walk. */}
        <svg
          className="action-progress"
          width={width}
          height={STRIP}
          aria-hidden
        >
          <polygon
            points={points.map(([x, y]) => `${x},${y}`).join(' ')}
            fill={`color-mix(in srgb, ${color} 60%, #000000)`}
          />
        </svg>
      </button>
    );
  });
}
