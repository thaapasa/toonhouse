// The scenes of the cartoon that the editor edits, with undo and redo. The
// saver in saver.ts saves them on the server.
import { useQueryClient } from '@tanstack/react-query';
import type { CartoonContent } from '@toonhouse/model';
import { useCallback, useEffect, useState } from 'react';

import { contentQuery, fetchContent, saveContent } from '../api.ts';
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
import { createSaver, type SaveState } from './saver.ts';

export type { SaveState } from './saver.ts';

/** How many edits undo can go back. */
const HISTORY_LIMIT = 100;

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
  /** After a conflict, saves the content of the editor over the saved one. */
  keepMine(): void;
  /** After a conflict, drops the edits and loads the saved content. */
  loadSaved(): void;
  /** After a lost login, saves again, such as after a login in another tab. */
  retry(): void;
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
  const [saveState, setSaveState] = useState<SaveState>({
    status: unsaved ? 'unsaved' : 'saved',
  });
  const [saver] = useState(() =>
    createSaver(
      {
        send: (body, keepalive) => saveContent(cartoonId, body, keepalive),
        load: () => fetchContent(cartoonId),
        keep: (saved) => keepContent(cartoonId, saved),
        clearKept: () => clearKeptContent(cartoonId),
        onState: setSaveState,
        onSaved: (saved) =>
          queryClient.setQueryData(contentQuery(cartoonId).queryKey, saved),
        reload: () => location.reload(),
      },
      initial,
      revision,
      unsaved,
    ),
  );

  useEffect(() => saver.update(history.present), [saver, history.present]);

  useEffect(() => {
    saver.open();
    const flush = () => {
      if (document.visibilityState === 'hidden') void saver.save(true);
    };
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', flush);
    // A new version of the app loads only when no edit is lost by it.
    const removeSaver = saveBeforeReload(() => saver.prepareReload());
    return () => {
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('pagehide', flush);
      removeSaver();
      saver.close();
    };
  }, [saver]);

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
    keepMine: () => void saver.keepMine(),
    loadSaved: () => saver.loadSaved(),
    retry: () => void saver.retry(),
  };
}
