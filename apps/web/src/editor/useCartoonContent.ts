// The scenes of the cartoon that the editor edits, with undo and redo. The
// edits are saved on the server a moment after the user stops editing, and
// at once when the page goes to the background.
import { useQueryClient } from '@tanstack/react-query';
import type { CartoonContent } from '@toonhouse/model';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { ApiError, contentQuery, saveContent } from '../api.ts';

/** How long to wait after an edit before saving it, in milliseconds. */
const SAVE_DELAY = 800;
/** How long to wait before trying again after a failed save. */
const RETRY_DELAY = 5000;
/** Browsers refuse a `keepalive` request with a body larger than 64 kB. */
const KEEPALIVE_LIMIT = 60_000;
/** How many edits undo can go back. */
const HISTORY_LIMIT = 100;

export type SaveState = 'saved' | 'unsaved' | 'saving' | 'error';

/**
 * `push` makes a new step for undo. `replace` makes the latest step again
 * from the state before it, such as for each move of a drag after the first
 * one. So a drag computes every move from where the drag started, and it can
 * pass over other things without changing them.
 */
export type EditMode = 'push' | 'replace';

interface History {
  past: CartoonContent[];
  present: CartoonContent;
  future: CartoonContent[];
}

export interface CartoonContentState {
  content: CartoonContent;
  edit(fn: (c: CartoonContent) => CartoonContent, mode?: EditMode): void;
  undo(): void;
  redo(): void;
  canUndo: boolean;
  canRedo: boolean;
  saveState: SaveState;
}

export function useCartoonContent(
  cartoonId: string,
  initial: CartoonContent,
): CartoonContentState {
  const queryClient = useQueryClient();
  const [history, setHistory] = useState<History>({
    past: [],
    present: initial,
    future: [],
  });
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const latest = useRef(initial);
  const saved = useRef(initial);
  const saving = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  // The latest `save`, for the timers that call it again later.
  const saveRef = useRef<() => Promise<void>>(async () => {});
  const saveLater = useCallback((delay: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void saveRef.current(), delay);
  }, []);

  const save = useCallback(
    async (keepalive = false) => {
      window.clearTimeout(timer.current);
      const content = latest.current;
      if (saving.current || content === saved.current) return;
      saving.current = true;
      setSaveState('saving');
      try {
        const body = JSON.stringify(content);
        await saveContent(
          cartoonId,
          content,
          keepalive && body.length < KEEPALIVE_LIMIT,
        );
        saved.current = content;
        queryClient.setQueryData(contentQuery(cartoonId).queryKey, content);
        setSaveState(latest.current === content ? 'saved' : 'unsaved');
      } catch (e) {
        // A new version of the app has a new format of the cartoon.
        if (e instanceof ApiError && e.status === 409) location.reload();
        setSaveState('error');
        saveLater(RETRY_DELAY);
        return;
      } finally {
        saving.current = false;
      }
      if (latest.current !== saved.current) saveLater(SAVE_DELAY);
    },
    [cartoonId, queryClient, saveLater],
  );
  useLayoutEffect(() => {
    saveRef.current = save;
  }, [save]);

  useEffect(() => {
    latest.current = history.present;
    if (history.present === saved.current) return;
    setSaveState((s) => (s === 'saving' ? s : 'unsaved'));
    if (!saving.current) saveLater(SAVE_DELAY);
  }, [history.present, saveLater]);

  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === 'hidden') void save(true);
    };
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('pagehide', flush);
      // Leaving the editor saves what is left.
      void save(true);
    };
  }, [save]);

  const edit = useCallback(
    (fn: (c: CartoonContent) => CartoonContent, mode: EditMode = 'push') =>
      setHistory((h) => {
        const before = h.past.at(-1);
        if (mode === 'replace' && before)
          return { ...h, present: fn(before), future: [] };
        const present = fn(h.present);
        return {
          past: [...h.past, h.present].slice(-HISTORY_LIMIT),
          present,
          future: [],
        };
      }),
    [],
  );
  const undo = useCallback(
    () =>
      setHistory((h) =>
        h.past.length === 0
          ? h
          : {
              past: h.past.slice(0, -1),
              present: h.past.at(-1)!,
              future: [h.present, ...h.future],
            },
      ),
    [],
  );
  const redo = useCallback(
    () =>
      setHistory((h) =>
        h.future.length === 0
          ? h
          : {
              past: [...h.past, h.present],
              present: h.future[0]!,
              future: h.future.slice(1),
            },
      ),
    [],
  );

  return {
    content: history.present,
    edit,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    saveState,
  };
}
