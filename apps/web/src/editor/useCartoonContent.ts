// The scenes of the cartoon that the editor edits, with undo and redo. The
// edits are saved on the server a moment after the user stops editing, and
// at once when the page goes to the background.
import { useQueryClient } from '@tanstack/react-query';
import { ContentConflict } from '@toonhouse/api';
import type { CartoonContent } from '@toonhouse/model';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { ApiError, contentQuery, saveContent } from '../api.ts';
import { saveBeforeReload } from '../update-check.ts';
import {
  applyEdit,
  type EditRun,
  type History,
  newHistory,
  redoStep,
  revertRun,
  undoStep,
} from './history.ts';
import { clearKeptContent, keepContent } from './keptContent.ts';

/** How long to wait after an edit before saving it, in milliseconds. */
const SAVE_DELAY = 800;
/** How long to wait before trying again after a failed save. */
const RETRY_DELAY = 5000;
/** Browsers refuse a `keepalive` request with a body larger than 64 kB. */
const KEEPALIVE_LIMIT = 60_000;
/** How many edits undo can go back. */
const HISTORY_LIMIT = 100;

/**
 * `error` is a failed save that the editor tries again, such as one without
 * a network. The others need the user to do something, and the editor tries
 * again only after it:
 *
 * - `refused`: the server doesn't accept the content. The next edit tries
 *   again.
 * - `tooLarge`: the content is larger than the server saves. The next edit
 *   tries again.
 * - `loggedOut`: the login has ended. The editor keeps the edits in the
 *   browser and saves them after the user logs in again.
 * - `conflict`: someone saved the cartoon in another window or on another
 *   device. The editor saves nothing until the page loads again.
 */
export type SaveState =
  | 'saved'
  | 'unsaved'
  | 'saving'
  | 'error'
  | 'refused'
  | 'tooLarge'
  | 'loggedOut'
  | 'conflict';

/**
 * What a failed save leads to. Only a failure without an answer, such as one
 * without a network, or a failure of the server tries the same content
 * again. `reload` loads the new version of the web app.
 */
export function failedSave(
  e: unknown,
): 'error' | 'refused' | 'tooLarge' | 'loggedOut' | 'conflict' | 'reload' {
  if (!(e instanceof ApiError)) return 'error';
  switch (e.status) {
    case 400:
      return 'refused';
    case 401:
      return 'loggedOut';
    case 409:
      return ContentConflict.safeParse(e.body).data?.reason === 'revision'
        ? 'conflict'
        : 'reload';
    case 413:
      return 'tooLarge';
    default:
      return 'error';
  }
}

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

/**
 * Edits `initial`, which has the revision `revision` on the server. With
 * `unsaved`, the server doesn't have `initial` yet, such as for the edits kept
 * over a login, and the editor saves it at once.
 */
export function useCartoonContent(
  cartoonId: string,
  initial: CartoonContent,
  revision: number,
  unsaved = false,
): CartoonContentState {
  const queryClient = useQueryClient();
  const [history, setHistory] = useState<History<CartoonContent>>(() =>
    newHistory(initial),
  );
  const [saveState, setSaveState] = useState<SaveState>(
    unsaved ? 'unsaved' : 'saved',
  );
  const latest = useRef(initial);
  const saved = useRef<CartoonContent | null>(unsaved ? null : initial);
  const savedRevision = useRef(revision);
  // The content that the server refused. The editor doesn't send it again.
  const refused = useRef<CartoonContent | null>(null);
  // After a lost login or a conflict, the editor saves nothing more.
  const stopped = useRef<'loggedOut' | 'conflict' | null>(null);
  // The save that runs now, and whether to save again at once after it, with
  // `keepalive` or without.
  const running = useRef<Promise<void> | null>(null);
  const flushAfter = useRef<boolean | null>(null);
  const timer = useRef<number | undefined>(undefined);
  // The latest `save`, for the timers that call it again later.
  const saveRef = useRef<(keepalive?: boolean) => Promise<void>>(
    async () => {},
  );
  const saveLater = useCallback((delay: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void saveRef.current(), delay);
  }, []);

  /** Sends `content` once. Tells whether the next save may follow at once. */
  const send = useCallback(
    async (content: CartoonContent, keepalive: boolean): Promise<boolean> => {
      setSaveState('saving');
      const body = { revision: savedRevision.current, content };
      try {
        const size = JSON.stringify(body).length;
        const next = await saveContent(
          cartoonId,
          body,
          keepalive && size < KEEPALIVE_LIMIT,
        );
        savedRevision.current = next;
        saved.current = content;
        refused.current = null;
        clearKeptContent(cartoonId);
        // A later edit is not on the server yet, so the player must not get
        // this one as the latest.
        if (latest.current === content) {
          queryClient.setQueryData(contentQuery(cartoonId).queryKey, {
            revision: next,
            content,
          });
          setSaveState('saved');
        } else setSaveState('unsaved');
        return true;
      } catch (e) {
        const outcome = failedSave(e);
        if (outcome === 'reload') {
          // A new version of the app has a new format of the cartoon.
          stopped.current = 'conflict';
          location.reload();
          return false;
        }
        if (outcome === 'conflict') {
          stopped.current = 'conflict';
          clearKeptContent(cartoonId);
        } else if (outcome === 'refused' || outcome === 'tooLarge') {
          refused.current = content;
        } else if (outcome === 'loggedOut') {
          stopped.current = 'loggedOut';
          keepContent(cartoonId, {
            revision: body.revision,
            content: latest.current,
          });
        } else saveLater(RETRY_DELAY);
        setSaveState(outcome);
        return false;
      }
    },
    [cartoonId, queryClient, saveLater],
  );

  /**
   * Saves the latest content. A save asked for while another one runs goes
   * right after that one, so that a flush when the page closes isn't lost.
   */
  const save = useCallback(
    (keepalive = false): Promise<void> => {
      window.clearTimeout(timer.current);
      if (running.current) {
        flushAfter.current = (flushAfter.current ?? false) || keepalive;
        return running.current;
      }
      const content = latest.current;
      if (
        stopped.current ||
        content === saved.current ||
        content === refused.current
      )
        return Promise.resolve();
      const run = send(content, keepalive).then((ok) => {
        running.current = null;
        const flush = flushAfter.current;
        flushAfter.current = null;
        if (flush !== null) void saveRef.current(flush);
        else if (ok && latest.current !== saved.current) saveLater(SAVE_DELAY);
      });
      running.current = run;
      return run;
    },
    [send, saveLater],
  );
  useLayoutEffect(() => {
    saveRef.current = save;
  }, [save]);

  useEffect(() => {
    latest.current = history.present;
    // The edits after the login ended are kept too.
    if (stopped.current === 'loggedOut') {
      keepContent(cartoonId, {
        revision: savedRevision.current,
        content: history.present,
      });
    }
    if (history.present === saved.current || stopped.current) return;
    setSaveState((s) => (s === 'saving' ? s : 'unsaved'));
    if (!running.current) saveLater(SAVE_DELAY);
  }, [cartoonId, history.present, saveLater]);

  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === 'hidden') void save(true);
    };
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', flush);
    // A new version of the app loads only after the edits are saved.
    const removeSaver = saveBeforeReload(async () => {
      await save();
      while (running.current) await running.current;
      return latest.current === saved.current;
    });
    return () => {
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('pagehide', flush);
      removeSaver();
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
