// The actions of one row of the timeline, as blocks from their start until
// the next action. A tap selects an action, and a drag moves the whole action.
import type { Action } from '@toonhouse/model';
import { clipOf, sortedActions } from '@toonhouse/renderer';
import { type PointerEvent, useRef } from 'react';

import { CLIP_COLORS } from './clipIcons.tsx';
import { useNames } from './names.ts';
import {
  progressPoints,
  snapTenth,
  TAP_SLOP,
  type TimelineRow,
} from './timelineMath.ts';
import type { EditMode } from './useCartoonContent.ts';

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
  onMove(actionId: string, t: number, mode: EditMode): void;
  onMoveDone(): void;
}) {
  const names = useNames();
  const drag = useRef<{
    pointer: number;
    id: string;
    x: number;
    t: number;
    moved: boolean;
  } | null>(null);
  const actions = sortedActions(props.row.actions);

  const down = (e: PointerEvent<HTMLButtonElement>, a: Action) => {
    e.stopPropagation();
    if (drag.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      pointer: e.pointerId,
      id: a.id,
      x: e.clientX,
      t: a.t,
      moved: false,
    };
  };
  const move = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (d?.pointer !== e.pointerId) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) < TAP_SLOP) return;
    const t = snapTenth(d.t + dx / props.pps);
    props.onMove(
      d.id,
      Math.min(Math.max(t, 0), props.length),
      d.moved ? 'replace' : 'push',
    );
    d.moved = true;
  };
  const up = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (d?.pointer !== e.pointerId) return;
    drag.current = null;
    if (d.moved) props.onMoveDone();
    else if (e.type === 'pointerup') props.onSelect(d.id, d.t);
  };

  return actions.map((a, i) => {
    const end = Math.min(actions[i + 1]?.t ?? props.duration, props.duration);
    const color = CLIP_COLORS[a.clip];
    const width = Math.max((end - a.t) * props.pps - 2, 6);
    const points = progressPoints({
      length: end - a.t,
      pps: props.pps,
      height: STRIP,
      walk: props.row.walkTimes.get(a.id),
      loop: clipOf(props.row.kind, a.clip).duration,
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
        onPointerDown={(e) => down(e, a)}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onClick={(e) => e.stopPropagation()}
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
