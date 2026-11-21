// The time marks of one row of the timeline: a dot where each action starts,
// at the end of the scene, and a smaller one where a clip starts a new loop or
// a walk gets to its last point. A tap moves the playhead to the mark. A drag
// on the start of an action moves only the start, and a drag on the end of the
// scene changes the length of the scene. A dragged end snaps to the smaller
// marks of the action that ends there.
import { sortedActions } from '@toonhouse/renderer';

import { useI18n } from '../i18n/index.tsx';
import type { EditRun } from './history.ts';
import type { PinchCount } from './pointer.ts';
import {
  formatTime,
  midPoints,
  snapToTargets,
  type TimelineRow,
} from './timelineMath.ts';
import { useLaneDrag } from './useLaneDrag.ts';

type Mark =
  | { type: 'start'; t: number; actionId: string }
  | { type: 'mid'; t: number; actionId: string; n: number }
  | { type: 'end'; t: number };

const LABELS = {
  start: 'editor.actionStart',
  mid: 'editor.timeMark',
  end: 'editor.sceneEnd',
} as const;

export function TimeMarks(props: {
  row: TimelineRow;
  /** Where the end of the scene snaps to, from the last actions of all rows. */
  endTargets: readonly number[];
  duration: number;
  fps: number;
  pps: number;
  onSeek(t: number): void;
  onLength(length: number, run: EditRun): void;
  onMoveStart(actionId: string, t: number, run: EditRun): void;
  onDragDone(): void;
  pinches: PinchCount;
  onCancel(run: EditRun): void;
}) {
  const { tr } = useI18n();
  const { row, pps, fps } = props;
  const actions = sortedActions(row.actions);
  const frame = (t: number) => Math.round(t * fps) / fps;
  // The end of an action is the start of the next one, so only the last
  // action has a mark at its end, which is the end of the scene.
  const marks: Mark[] = [];
  actions.forEach((a, i) => {
    marks.push({ type: 'start', t: frame(a.t), actionId: a.id });
    const end = Math.min(actions[i + 1]?.t ?? props.duration, props.duration);
    midPoints(a, row, end - 1e-6, pps).forEach((t, n) =>
      marks.push({ type: 'mid', t: frame(t), actionId: a.id, n }),
    );
  });
  if (actions.length > 0) marks.push({ type: 'end', t: frame(props.duration) });

  /** The marks that a dragged mark snaps to. */
  const targets = (mark: Mark): readonly number[] => {
    if (mark.type === 'end') return props.endTargets;
    if (mark.type === 'mid') return [];
    const before =
      actions[actions.findIndex((a) => a.id === mark.actionId) - 1];
    return before ? midPoints(before, row, Infinity, pps) : [];
  };

  const drag = useLaneDrag<Mark>({
    pinches: props.pinches,
    canDrag: (mark) => mark.type !== 'mid',
    onMove: (mark, dx, run) => {
      const t = snapToTargets(mark.t + dx / pps, targets(mark), pps, fps);
      if (mark.type === 'end') props.onLength(t, run);
      else if (mark.type === 'start') props.onMoveStart(mark.actionId, t, run);
    },
    onDone: props.onDragDone,
    onCancel: (_, run) => props.onCancel(run),
  });

  return marks.map((mark) => (
    <button
      // A mark keeps its key while it moves, so that the drag goes on.
      key={
        mark.type === 'end'
          ? 'end'
          : mark.type === 'start'
            ? `start-${mark.actionId}`
            : `mid-${mark.actionId}-${mark.n}`
      }
      type="button"
      className={`time-mark ${mark.type}`}
      style={{ left: mark.t * pps }}
      aria-label={tr(LABELS[mark.type], { time: formatTime(mark.t) })}
      title={formatTime(mark.t)}
      onClick={drag.click(() => props.onSeek(mark.t))}
      {...drag.handlers(mark)}
    />
  ));
}
