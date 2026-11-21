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
import {
  applyEdit,
  type EditRun,
  type History,
  newHistory,
  redoStep,
  revertRun,
  undoStep,
} from './history.ts';

/** How long to wait after an edit before saving it, in milliseconds. */
const SAVE_DELAY = 800;
/** How long to wait before trying again after a failed save. */
const RETRY_DELAY = 5000;
/** Browsers refuse a `keepalive` request with a body larger than 64 kB. */
const KEEPALIVE_LIMIT = 60_000;
/** How many edits undo can go back. */
const HISTORY_LIMIT = 100;

export type SaveState = 'saved' | 'unsaved' | 'saving' | 'error';

export interface CartoonContentState {
  content: CartoonContent;
  /** Makes an undo step, or with `run`, see `applyEdit`. */
  edit(fn: (c: CartoonContent) => CartoonContent, run?: EditRun): void;
  /** Takes away the step of `run`, such as when a pinch cancels a drag. */
  revert(run: EditRun): void;
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
  const [history, setHistory] = useState<History<CartoonContent>>(() =>
    newHistory(initial),
  );
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
    (fn: (c: CartoonContent) => CartoonContent, run?: EditRun) =>
      setHistory((h) => applyEdit(h, fn, run, HISTORY_LIMIT)),
    [],
  );
  const revert = useCallback(
    (run: EditRun) => setHistory((h) => revertRun(h, run)),
    [],
  );
  const undo = useCallback(() => setHistory(undoStep), []);
  const redo = useCallback(() => setHistory(redoStep), []);

  return {
    content: history.present,
    edit,
    revert,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    saveState,
  };
}
