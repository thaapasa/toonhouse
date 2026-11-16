// The time marks of one row of the timeline: a dot where each action starts,
// at the end of the scene, and a smaller one where a clip starts a new loop or
// a walk gets to its last point. A tap moves the playhead to the mark. A drag
// on the start of an action moves only the start, and a drag on the end of the
// scene changes the length of the scene. A dragged end snaps to the smaller
// marks of the action that ends there.
import { sortedActions } from '@toonhouse/renderer';
import { type PointerEvent, useRef } from 'react';

import { useI18n } from '../i18n/index.tsx';
import { released } from './pointer.ts';
import {
  formatTime,
  midPoints,
  snapToTargets,
  TAP_SLOP,
  type TimelineRow,
} from './timelineMath.ts';
import type { EditMode } from './useCartoonContent.ts';

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
  onLength(length: number, mode: EditMode): void;
  onMoveStart(actionId: string, t: number, mode: EditMode): void;
  onDragDone(): void;
}) {
  const { tr } = useI18n();
  const drag = useRef<{
    pointer: number;
    mark: Mark;
    x: number;
    moved: boolean;
  } | null>(null);
  // A drag ends with a click, which should not move the playhead.
  const dragged = useRef(false);

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

  const down = (e: PointerEvent<HTMLButtonElement>) => {
    const mark = marks[Number(e.currentTarget.dataset.mark)];
    if (drag.current || !mark || mark.type === 'mid') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { pointer: e.pointerId, mark, x: e.clientX, moved: false };
  };
  const move = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (d?.pointer !== e.pointerId) return;
    if (released(e)) return up(e);
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) < TAP_SLOP) return;
    const t = snapToTargets(d.mark.t + dx / pps, targets(d.mark), pps, fps);
    const mode = d.moved ? 'replace' : 'push';
    if (d.mark.type === 'end') props.onLength(t, mode);
    else if (d.mark.type === 'start')
      props.onMoveStart(d.mark.actionId, t, mode);
    d.moved = true;
  };
  const up = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (d?.pointer !== e.pointerId) return;
    drag.current = null;
    if (d.moved) {
      dragged.current = true;
      props.onDragDone();
    }
  };

  return marks.map((mark, i) => (
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
      onClick={(e) => {
        e.stopPropagation();
        if (dragged.current) dragged.current = false;
        else props.onSeek(mark.t);
      }}
      data-mark={i}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onLostPointerCapture={up}
    />
  ));
}
