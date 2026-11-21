// The sideways drags of the timeline, such as of an action block, a bubble or
// a time mark. A pointer that moves less than `TAP_SLOP` taps. The moves of
// one drag make one undo step, and a second finger cancels the drag.
import { type PointerEvent, useRef } from 'react';

import type { EditRun } from './history.ts';
import { type PinchCount, released, TAP_SLOP } from './pointer.ts';

interface Options<T> {
  pinches: PinchCount;
  /** Whether a pointer down on `item` starts a drag. By default it does. */
  canDrag?(item: T): boolean;
  /**
   * Moves the drag at once on the pointer down, with `dx` 0, as the ruler
   * moves the playhead on the first touch. Such a drag never taps.
   */
  moveOnDown?: boolean;
  /**
   * The pointer moved `dx` CSS pixels from where the drag started. Pass `run`
   * with the edit, so that the whole drag is one undo step.
   */
  onMove(item: T, dx: number, run: EditRun, e: PointerEvent<HTMLElement>): void;
  /** The pointer went up without moving. */
  onTap?(item: T): void;
  /** A drag that moved ended. */
  onDone?(item: T): void;
  /** A pinch cancelled a drag that moved, so its edit should go away. */
  onCancel?(item: T, run: EditRun): void;
}

interface Drag<T> {
  pointer: number;
  item: T;
  x: number;
  moved: boolean;
  pinch: number;
}

export function useLaneDrag<T>(opts: Options<T>) {
  // The drag is also the edit run of its moves.
  const drag = useRef<Drag<T> | null>(null);
  // A drag ends with a click, which should not do what a tap does.
  const dragged = useRef(false);

  const cancel = (d: Drag<T>) => {
    drag.current = null;
    if (d.moved) opts.onCancel?.(d.item, d);
  };
  const down = (e: PointerEvent<HTMLElement>, item: T) => {
    e.stopPropagation();
    if (drag.current || (opts.canDrag && !opts.canDrag(item))) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragged.current = false;
    const d: Drag<T> = {
      pointer: e.pointerId,
      item,
      x: e.clientX,
      moved: false,
      pinch: opts.pinches.current,
    };
    drag.current = d;
    if (opts.moveOnDown) {
      d.moved = true;
      opts.onMove(item, 0, d, e);
    }
  };
  const move = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (d?.pointer !== e.pointerId) return;
    if (d.pinch !== opts.pinches.current) return cancel(d);
    if (released(e)) return up(e);
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) < TAP_SLOP) return;
    d.moved = true;
    opts.onMove(d.item, dx, d, e);
  };
  const up = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (d?.pointer !== e.pointerId) return;
    if (d.pinch !== opts.pinches.current) return cancel(d);
    drag.current = null;
    if (d.moved) {
      dragged.current = true;
      opts.onDone?.(d.item);
    } else if (e.type === 'pointerup') opts.onTap?.(d.item);
  };

  return {
    /** The pointer handlers of an element that drags `item`. */
    handlers: (item: T) => ({
      onPointerDown: (e: PointerEvent<HTMLElement>) => down(e, item),
      onPointerMove: move,
      onPointerUp: up,
      onPointerCancel: up,
      onLostPointerCapture: up,
    }),
    /**
     * A click handler that runs `tap`, unless the click ends a drag. It stops
     * the click, so that the lane under it doesn't move the playhead.
     */
    click: (tap?: () => void) => (e: { stopPropagation(): void }) => {
      e.stopPropagation();
      if (dragged.current) dragged.current = false;
      else tap?.();
    },
  };
}
