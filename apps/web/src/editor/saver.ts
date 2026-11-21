// Saves the content of the editor on the server: a moment after each edit, at
// once when asked, one save at a time. It has no React in it, so that the
// tests can drive it with a fake server.
import { ContentConflict, type SavedContent } from '@toonhouse/api';
import type { CartoonContent } from '@toonhouse/model';

import { ApiError } from '../api.ts';

/** How long to wait after an edit before saving it, in milliseconds. */
export const SAVE_DELAY = 800;
/** How long to wait before trying again after a failed save. */
export const RETRY_DELAY = 5000;
/** Browsers refuse a `keepalive` request with a body larger than 64 kB. */
const KEEPALIVE_LIMIT = 60_000;

/**
 * `error` is a failed save that the saver tries again, such as one without a
 * network. The others need the user to do something:
 *
 * - `refused`: the server doesn't accept the content. The next edit tries
 *   again.
 * - `loggedOut`: the login has ended. The edits are kept in the browser, if
 *   `kept`, and saved after the user logs in again.
 * - `conflict`: someone else saved the cartoon after the revision that the
 *   editor edited. The user keeps their version or loads the saved one.
 * - `gone`: the cartoon was removed, or the user is not its owner.
 */
export type SaveState =
  | { status: 'saved' | 'unsaved' | 'saving' | 'error' | 'conflict' | 'gone' }
  | { status: 'refused'; reason: 'invalid' | 'tooLarge' }
  | { status: 'loggedOut'; kept: boolean };

type Failure =
  | 'error'
  | 'invalid'
  | 'tooLarge'
  | 'loggedOut'
  | 'gone'
  | 'revision'
  | 'version';

/** What a failed save means. Only `error` tries the same content again. */
export function failure(e: unknown): Failure {
  if (!(e instanceof ApiError)) return 'error';
  switch (e.status) {
    case 400:
      return 'invalid';
    case 401:
      return 'loggedOut';
    case 403:
    case 404:
      return 'gone';
    case 409:
      return ContentConflict.safeParse(e.body).data?.reason === 'revision'
        ? 'revision'
        : 'version';
    case 413:
      return 'tooLarge';
    default:
      return 'error';
  }
}

/** How often a stopped saver keeps the edits in the browser, at most. */
const KEEP_DELAY = 1000;

export interface SaverDeps {
  /** Sends a save, the JSON of a `SaveContentRequest`, and gives the new revision. */
  send(body: string, keepalive: boolean): Promise<number>;
  /** Loads the content on the server. */
  load(): Promise<SavedContent>;
  /** Keeps unsaved content in the browser. Tells whether it could. */
  keep(saved: SavedContent): boolean;
  clearKept(): void;
  onState(state: SaveState): void;
  /** The latest content is saved. */
  onSaved(saved: SavedContent): void;
  /** Loads the page again, such as for a new version of the app. */
  reload(): void;
}

export interface SaverStart {
  content: CartoonContent;
  revision: number;
  /** The server doesn't have `content` yet, such as for kept edits. */
  unsaved: boolean;
  /**
   * The editor that kept the edits this editor starts from. Its saves count
   * as this editor's own.
   */
  keptBy: string | null;
}

export interface Saver {
  /** The editor shows `content` now. */
  update(content: CartoonContent): void;
  /** Saves now, or right after the save that runs. */
  save(keepalive?: boolean): Promise<void>;
  /**
   * The page goes to the background and may never come back. The saver keeps
   * what is not saved in the browser and saves it.
   */
  hide(): void;
  /**
   * Gets ready for a reload of the page: saves, or keeps what can't be saved
   * in the browser. Tells whether nothing is lost by the reload.
   */
  prepareReload(): Promise<boolean>;
  /** After a conflict, saves the content of the editor over the saved one. */
  keepMine(): Promise<void>;
  /** After a conflict, drops the edits and loads the saved content. */
  loadSaved(): void;
  /** After a lost login, saves again. */
  retry(): Promise<void>;
  /** The editor opens. A saver can open again after it closes. */
  open(): void;
  /**
   * The editor closes. The saver keeps what is not saved in the browser, for
   * the next editor, and sends it once more without trying again.
   */
  close(): void;
}

export function createSaver(deps: SaverDeps, start: SaverStart): Saver {
  // Each save names this editor. A 409 for a revision that this editor, or
  // the one whose edits it goes on with, saved last is no conflict: the
  // answer to that save was lost.
  const editor = crypto.randomUUID();
  const mine = new Set([editor, start.keptBy].filter((id) => id !== null));
  let latest = start.content;
  let saved: CartoonContent | null = start.unsaved ? null : start.content;
  let revision = start.revision;
  // The content that the server refused. The saver doesn't send it again.
  let refused: CartoonContent | null = null;
  // Why the saver sends nothing until the user acts.
  let stopped: 'loggedOut' | 'conflict' | 'gone' | 'reloading' | null = null;
  let closed = false;
  let running: Promise<void> | null = null;
  // A save asked for while another one runs.
  let next: 'none' | 'normal' | 'keepalive' = 'none';
  let timer: ReturnType<typeof setTimeout> | undefined;
  let keepTimer: ReturnType<typeof setTimeout> | undefined;
  let state: SaveState = { status: start.unsaved ? 'unsaved' : 'saved' };

  const set = (s: SaveState) => {
    state = s;
    deps.onState(s);
  };
  const cancel = () => {
    clearTimeout(timer);
    timer = undefined;
  };
  const later = (delay: number) => {
    cancel();
    if (closed) return;
    timer = setTimeout(() => {
      timer = undefined;
      void save();
    }, delay);
  };

  /** Keeps the latest content in the browser, now. */
  function keepNow() {
    clearTimeout(keepTimer);
    keepTimer = undefined;
    const kept = deps.keep({ revision, editor, content: latest });
    if (state.status === 'loggedOut' && state.kept !== kept)
      set({ status: 'loggedOut', kept });
    return kept;
  }
  /** Keeps the latest content soon, so that a drag doesn't write on each move. */
  function keepSoon() {
    keepTimer ??= setTimeout(keepNow, KEEP_DELAY);
  }
  const unsaved = () => !stopped && latest !== saved;

  function accept(content: CartoonContent, rev: number) {
    revision = rev;
    saved = content;
    refused = null;
    if (latest === content) {
      clearTimeout(keepTimer);
      keepTimer = undefined;
      deps.clearKept();
      deps.onSaved({ revision, editor, content });
      set({ status: 'saved' });
    } else {
      if (closed) keepNow();
      set({ status: 'unsaved' });
    }
  }

  function stop(why: 'loggedOut' | 'conflict' | 'gone') {
    stopped = why;
    cancel();
    if (why === 'gone') {
      deps.clearKept();
      set({ status: 'gone' });
    } else if (why === 'loggedOut') {
      set({
        status: 'loggedOut',
        kept: deps.keep({ revision, editor, content: latest }),
      });
    } else {
      keepNow();
      set({ status: 'conflict' });
    }
  }

  /**
   * After a 409 for the revision, tells whether the newer revision is this
   * editor's own. Then the saver goes on from it and saves the latest content
   * again.
   */
  async function checkConflict(): Promise<boolean> {
    let server: SavedContent;
    try {
      server = await deps.load();
    } catch {
      set({ status: 'error' });
      later(RETRY_DELAY);
      return false;
    }
    if (!server.editor || !mine.has(server.editor)) {
      stop('conflict');
      return false;
    }
    revision = server.revision;
    saved = null;
    set({ status: 'unsaved' });
    return true;
  }

  async function attempt(content: CartoonContent, keepalive: boolean) {
    set({ status: 'saving' });
    const body = JSON.stringify({ revision, editor, content });
    try {
      const rev = await deps.send(
        body,
        keepalive && body.length < KEEPALIVE_LIMIT,
      );
      accept(content, rev);
    } catch (e) {
      const why = failure(e);
      switch (why) {
        case 'error':
          set({ status: 'error' });
          later(RETRY_DELAY);
          break;
        case 'invalid':
        case 'tooLarge':
          refused = content;
          set({ status: 'refused', reason: why });
          break;
        case 'revision':
          await checkConflict();
          break;
        case 'version':
          // A new version of the app has a new format of the cartoon.
          stopped = 'reloading';
          deps.reload();
          break;
        default:
          stop(why);
      }
    }
  }

  function save(keepalive = false): Promise<void> {
    cancel();
    if (running) {
      if (keepalive) next = 'keepalive';
      else if (next === 'none') next = 'normal';
      return running;
    }
    const content = latest;
    if (!unsaved() || content === refused) return Promise.resolve();
    running = attempt(content, keepalive).then(() => {
      running = null;
      const after = next;
      next = 'none';
      if (after !== 'none') void save(after === 'keepalive');
      // An edit made during the save, unless a retry is planned already.
      else if (!timer && unsaved() && latest !== refused) later(SAVE_DELAY);
    });
    return running;
  }

  async function settle() {
    await save();
    while (running) await running;
    return latest === saved;
  }

  return {
    update(content) {
      latest = content;
      if (stopped === 'loggedOut' || stopped === 'conflict') keepSoon();
      if (stopped || running) return;
      if (content === saved) {
        cancel();
        if (state.status !== 'saved') set({ status: 'saved' });
      } else {
        if (state.status !== 'unsaved') set({ status: 'unsaved' });
        later(SAVE_DELAY);
      }
    },
    save,
    hide() {
      if (unsaved() || stopped === 'loggedOut' || stopped === 'conflict')
        keepNow();
      void save(true);
    },
    async prepareReload() {
      if (await settle()) return true;
      if (latest === refused) return keepNow();
      if (stopped === 'loggedOut' || stopped === 'conflict') return keepNow();
      return false;
    },
    async keepMine() {
      try {
        revision = (await deps.load()).revision;
      } catch {
        set({ status: 'conflict' });
        return;
      }
      stopped = null;
      // The latest content may be the one saved last, after an undo.
      saved = null;
      await save();
    },
    retry() {
      if (stopped !== 'loggedOut') return Promise.resolve();
      stopped = null;
      return save();
    },
    loadSaved() {
      stopped = 'reloading';
      clearTimeout(keepTimer);
      deps.clearKept();
      deps.reload();
    },
    open() {
      closed = false;
    },
    close() {
      closed = true;
      cancel();
      if (unsaved() || stopped === 'loggedOut' || stopped === 'conflict')
        keepNow();
      void save(true);
    },
  };
}
