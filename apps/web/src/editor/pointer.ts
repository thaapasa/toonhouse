// Helpers for the drags of the editor, which capture the pointer.
import type { PointerEvent } from 'react';

/**
 * True if the buttons are up although no `pointerup` came, such as after the
 * user let go of the mouse outside the browser window. A drag ends then.
 */
export const released = (e: PointerEvent) => e.buttons === 0;
