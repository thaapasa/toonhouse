// Helpers for the drags of the editor, which capture the pointer.
import type { PointerEvent } from 'react';

/**
 * A pointer that moves less than this, in CSS pixels, taps. A finger on a
 * touch screen moves a few pixels while it taps, and 8 is the touch slop that
 * Android uses, in dp.
 */
export const TAP_SLOP = 8;

/**
 * True if the buttons are up although no `pointerup` came, such as after the
 * user let go of the mouse outside the browser window. A drag ends then.
 */
export const released = (e: PointerEvent) => e.buttons === 0;

/**
 * Counts the pinches on the timeline. A drag keeps the count from when it
 * started, and a new count means that a second finger came and the drag ends.
 */
export interface PinchCount {
  readonly current: number;
}
