// The speech bubbles of one actor, or the free bubbles, on the timeline: a bar
// for each bubble from its start to its end, with as much of its text as fits.
// Bubbles that overlap in time go on separate lines of the lane. A tap selects
// a bubble, a drag moves it, and a drag on the mark at its end changes its
// length. A tap on a mark moves the playhead there.
import { CONTENT_LIMITS } from '@toonhouse/api';
import type { Bubble } from '@toonhouse/model';
import { bubbleEnd, bubbleLength, sortedBubbles } from '@toonhouse/renderer';
import { type PointerEvent, useRef } from 'react';

import { useI18n } from '../i18n/index.tsx';
import type { EditRun } from './history.ts';
import { type PinchCount, released } from './pointer.ts';
import { formatTime, snapTenth, TAP_SLOP } from './timelineMath.ts';

/** The height of one line of a bubble lane, in CSS pixels. */
export const BUBBLE_LINE = 24;
/** The shortest length that a drag gives a bubble, in seconds. */
const MIN_LENGTH = CONTENT_LIMITS.bubbleLength.min;

/**
 * The line of the lane for each bubble, so that the bubbles on a line don't
 * overlap in time. Each bubble goes on the first line that is free at its
 * start.
 */
export function bubbleLines(bubbles: readonly Bubble[]): Map<string, number> {
  const ends: number[] = [];
  const lines = new Map<string, number>();
  for (const b of sortedBubbles(bubbles)) {
    let line = ends.findIndex((end) => end <= b.t);
    if (line < 0) line = ends.length;
    ends[line] = bubbleEnd(b);
    lines.set(b.id, line);
  }
  return lines;
}

type Grab = 'move' | 'end';

export function BubbleLane(props: {
  bubbles: readonly Bubble[];
  /** The length of the timeline, which a bubble can be moved to. */
  length: number;
  pps: number;
  fps: number;
  selected: string | null;
  onSelect(id: string, t: number): void;
  onSeek(t: number): void;
  onMove(id: string, t: number, run: EditRun): void;
  onLength(id: string, length: number, run: EditRun): void;
  onDragDone(): void;
  pinches: PinchCount;
  onCancel(run: EditRun): void;
}) {
  const { tr } = useI18n();
  const { pps } = props;
  const drag = useRef<{
    pointer: number;
    bubble: Bubble;
    grab: Grab;
    x: number;
    moved: boolean;
    pinch: number;
  } | null>(null);
  // A drag ends with a click, which should not move the playhead.
  const dragged = useRef(false);
  const lines = bubbleLines(props.bubbles);
  const frame = (t: number) => Math.round(t * props.fps) / props.fps;

  const down = (e: PointerEvent<HTMLElement>, bubble: Bubble, grab: Grab) => {
    e.stopPropagation();
    if (drag.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      pointer: e.pointerId,
      bubble,
      grab,
      x: e.clientX,
      moved: false,
      pinch: props.pinches.current,
    };
  };
  /** A pinch cancels the drag, and the drag leaves no undo step. */
  const cancel = (d: NonNullable<typeof drag.current>) => {
    drag.current = null;
    if (d.moved) props.onCancel(d);
  };

  const move = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (d?.pointer !== e.pointerId) return;
    if (d.pinch !== props.pinches.current) return cancel(d);
    if (released(e)) return up(e);
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) < TAP_SLOP) return;
    d.moved = true;
    const b = d.bubble;
    if (d.grab === 'move') {
      const t = snapTenth(b.t + dx / pps);
      props.onMove(b.id, Math.min(Math.max(t, 0), props.length), d);
    } else {
      const end = snapTenth(bubbleEnd(b) + dx / pps);
      props.onLength(b.id, Math.max(end - b.t, MIN_LENGTH), d);
    }
  };
  const up = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (d?.pointer !== e.pointerId) return;
    if (d.pinch !== props.pinches.current) return cancel(d);
    drag.current = null;
    if (d.moved) {
      dragged.current = true;
      props.onDragDone();
    } else if (e.type === 'pointerup' && d.grab === 'move')
      props.onSelect(d.bubble.id, d.bubble.t);
  };
  const handlers = (bubble: Bubble, grab: Grab) => ({
    onPointerDown: (e: PointerEvent<HTMLElement>) => down(e, bubble, grab),
    onPointerMove: move,
    onPointerUp: up,
    onPointerCancel: up,
    onLostPointerCapture: up,
  });
  /** A tap on a mark moves the playhead, unless it ends a drag. */
  const markClick = (t: number) => (e: { stopPropagation(): void }) => {
    e.stopPropagation();
    if (dragged.current) dragged.current = false;
    else props.onSeek(t);
  };

  return sortedBubbles(props.bubbles).map((b) => {
    const top = (lines.get(b.id) ?? 0) * BUBBLE_LINE;
    const start = frame(b.t);
    const end = frame(bubbleEnd(b));
    const text = b.text.trim() || tr('bubble.empty');
    return (
      <div key={b.id} className="bubble-bar-wrap" style={{ top }}>
        <button
          type="button"
          className="bubble-bar"
          aria-pressed={props.selected === b.id}
          aria-label={tr('bubble.onTimeline', { text })}
          style={{
            left: b.t * pps,
            width: Math.max(bubbleLength(b) * pps - 2, 6),
          }}
          onClick={(e) => e.stopPropagation()}
          {...handlers(b, 'move')}
        >
          {text}
        </button>
        <button
          type="button"
          className="time-mark start bubble-mark"
          style={{ left: start * pps }}
          aria-label={tr('bubble.start', { time: formatTime(start) })}
          title={formatTime(start)}
          onClick={markClick(start)}
          {...handlers(b, 'move')}
        />
        <button
          type="button"
          className="time-mark end bubble-mark"
          style={{ left: end * pps }}
          aria-label={tr('bubble.end', { time: formatTime(end) })}
          title={formatTime(end)}
          onClick={markClick(end)}
          {...handlers(b, 'end')}
        />
      </div>
    );
  });
}
