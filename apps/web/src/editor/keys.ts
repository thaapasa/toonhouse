// Helpers for the keyboard shortcuts of the editor.

/**
 * True if the key goes to a text that the user is typing, such as the title
 * of the cartoon or the text of a speech bubble. Then the shortcuts are off.
 */
export function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target.isContentEditable
  );
}

export type EditorCommand =
  'play' | 'back' | 'forward' | 'start' | 'end' | 'undo' | 'redo';

type Key = Pick<
  KeyboardEvent,
  'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'
>;

/** The keys that work without modifier keys. */
const PLAIN_KEYS: Partial<Record<string, EditorCommand>> = {
  ' ': 'play',
  ArrowLeft: 'back',
  ArrowRight: 'forward',
  ArrowUp: 'start',
  ArrowDown: 'end',
};

/** The command of a key press in the editor, or null if it has none. */
export function editorCommand(e: Key): EditorCommand | null {
  if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'z')
    return e.shiftKey ? 'redo' : 'undo';
  if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return null;
  return PLAIN_KEYS[e.key] ?? null;
}
