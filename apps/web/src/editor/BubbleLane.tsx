// The speech bubbles of one actor, or the free bubbles, on the timeline: a bar
// for each bubble from its start to its end, with as much of its text as fits.
// Bubbles that overlap in time go on separate lines of the lane. A tap selects
// a bubble, a drag moves it, and a drag on the mark at its end changes its
// length. A tap on a mark moves the playhead there.
import { CONTENT_LIMITS } from '@toonhouse/api';
import type { Bubble } from '@toonhouse/model';
import {
  bubbleEnd,
  bubbleLength,
  clamp,
  sortedBubbles,
} from '@toonhouse/renderer';

import { useI18n } from '../i18n/index.tsx';
import type { EditRun } from './history.ts';
import type { PinchCount } from './pointer.ts';
import { formatTime, snapTenth } from './timelineMath.ts';
import { useLaneDrag } from './useLaneDrag.ts';

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
  const lines = bubbleLines(props.bubbles);
  const frame = (t: number) => Math.round(t * props.fps) / props.fps;

  const drag = useLaneDrag<{ bubble: Bubble; grab: Grab }>({
    pinches: props.pinches,
    onMove: ({ bubble: b, grab }, dx, run) => {
      if (grab === 'move') {
        const t = snapTenth(b.t + dx / pps);
        props.onMove(b.id, clamp(t, 0, props.length), run);
      } else {
        const end = snapTenth(bubbleEnd(b) + dx / pps);
        props.onLength(b.id, Math.max(end - b.t, MIN_LENGTH), run);
      }
    },
    onTap: ({ bubble: b, grab }) => {
      if (grab === 'move') props.onSelect(b.id, b.t);
    },
    onDone: props.onDragDone,
    onCancel: (_, run) => props.onCancel(run),
  });
  const handlers = (bubble: Bubble, grab: Grab) =>
    drag.handlers({ bubble, grab });

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
          onClick={drag.click()}
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
          onClick={drag.click(() => props.onSeek(start))}
          {...handlers(b, 'move')}
        />
        <button
          type="button"
          className="time-mark end bubble-mark"
          style={{ left: end * pps }}
          aria-label={tr('bubble.end', { time: formatTime(end) })}
          title={formatTime(end)}
          onClick={drag.click(() => props.onSeek(end))}
          {...handlers(b, 'end')}
        />
      </div>
    );
  });
}
