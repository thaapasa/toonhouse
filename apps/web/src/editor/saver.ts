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

/** Whether two JSON values are the same, in any order of the keys. */
export function sameJson(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  return (
    ka.length === kb.length &&
    ka.every((k) =>
      sameJson(
        (a as Record<string, unknown>)[k],
        (b as Record<string, unknown>)[k],
      ),
    )
  );
}

export interface SaverDeps {
  /** Sends a save, the JSON of a `SavedContent`, and gives the new revision. */
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

export interface Saver {
  /** The editor shows `content` now. */
  update(content: CartoonContent): void;
  /** Saves now, or right after the save that runs. */
  save(keepalive?: boolean): Promise<void>;
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

export function createSaver(
  deps: SaverDeps,
  initial: CartoonContent,
  initialRevision: number,
  unsaved: boolean,
): Saver {
  let latest = initial;
  let saved: CartoonContent | null = unsaved ? null : initial;
  let revision = initialRevision;
  // The content that the server refused. The saver doesn't send it again.
  let refused: CartoonContent | null = null;
  // The content of a save that got no answer. The server may have it.
  let unanswered: CartoonContent | null = null;
  // Why the saver sends nothing until the user acts.
  let stopped: 'loggedOut' | 'conflict' | 'gone' | 'reloading' | null = null;
  let closed = false;
  let running: Promise<void> | null = null;
  // A save asked for while another one runs.
  let next: 'none' | 'normal' | 'keepalive' = 'none';
  let timer: ReturnType<typeof setTimeout> | undefined;
  let state: SaveState = { status: unsaved ? 'unsaved' : 'saved' };

  const set = (s: SaveState) => {
    state = s;
    deps.onState(s);
  };
  const later = (delay: number) => {
    clearTimeout(timer);
    if (!closed) timer = setTimeout(() => void save(), delay);
  };
  const keepLatest = () => deps.keep({ revision, content: latest });

  function accept(content: CartoonContent, rev: number) {
    revision = rev;
    saved = content;
    refused = null;
    unanswered = null;
    if (latest === content) {
      deps.clearKept();
      deps.onSaved({ revision, content });
      set({ status: 'saved' });
    } else {
      if (closed) keepLatest();
      set({ status: 'unsaved' });
    }
  }

  function stop(why: 'loggedOut' | 'conflict' | 'gone') {
    stopped = why;
    clearTimeout(timer);
    if (why === 'gone') {
      deps.clearKept();
      set({ status: 'gone' });
    } else if (why === 'loggedOut') {
      set({ status: 'loggedOut', kept: keepLatest() });
    } else {
      keepLatest();
      set({ status: 'conflict' });
    }
  }

  /**
   * A 409 for the revision can come from a save of this editor whose answer
   * was lost. If the server has what this editor sent, it is no conflict.
   */
  async function checkConflict(content: CartoonContent): Promise<boolean> {
    let server: SavedContent;
    try {
      server = await deps.load();
    } catch {
      set({ status: 'error' });
      later(RETRY_DELAY);
      return false;
    }
    const mine = [content, unanswered].find(
      (c) => c && sameJson(c, server.content),
    );
    if (!mine) {
      stop('conflict');
      return false;
    }
    accept(mine, server.revision);
    return true;
  }

  async function attempt(content: CartoonContent, keepalive: boolean) {
    set({ status: 'saving' });
    const body = JSON.stringify({ revision, content });
    try {
      const rev = await deps.send(
        body,
        keepalive && body.length < KEEPALIVE_LIMIT,
      );
      accept(content, rev);
      return true;
    } catch (e) {
      const why = failure(e);
      switch (why) {
        case 'error':
          unanswered = content;
          set({ status: 'error' });
          later(RETRY_DELAY);
          return false;
        case 'invalid':
        case 'tooLarge':
          refused = content;
          set({ status: 'refused', reason: why });
          return false;
        case 'revision':
          return checkConflict(content);
        case 'version':
          // A new version of the app has a new format of the cartoon.
          stopped = 'reloading';
          deps.reload();
          return false;
        default:
          stop(why);
          return false;
      }
    }
  }

  function save(keepalive = false): Promise<void> {
    clearTimeout(timer);
    if (running) {
      if (keepalive) next = 'keepalive';
      else if (next === 'none') next = 'normal';
      return running;
    }
    const content = latest;
    if (stopped || content === saved || content === refused)
      return Promise.resolve();
    running = attempt(content, keepalive).then((ok) => {
      running = null;
      const after = next;
      next = 'none';
      if (after !== 'none') void save(after === 'keepalive');
      else if (ok && latest !== saved) later(SAVE_DELAY);
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
      if (stopped === 'loggedOut') {
        const kept = keepLatest();
        if (state.status === 'loggedOut' && state.kept !== kept)
          set({ status: 'loggedOut', kept });
      } else if (stopped === 'conflict') keepLatest();
      if (stopped || running) return;
      if (content === saved) {
        clearTimeout(timer);
        if (state.status !== 'saved') set({ status: 'saved' });
      } else {
        if (state.status !== 'unsaved') set({ status: 'unsaved' });
        later(SAVE_DELAY);
      }
    },
    save,
    async prepareReload() {
      if (await settle()) return true;
      if (latest === refused) return keepLatest();
      return state.status === 'loggedOut' ? state.kept : stopped === 'conflict';
    },
    async keepMine() {
      try {
        revision = (await deps.load()).revision;
      } catch {
        set({ status: 'conflict' });
        return;
      }
      stopped = null;
      unanswered = null;
      await save();
    },
    retry() {
      if (stopped !== 'loggedOut') return Promise.resolve();
      stopped = null;
      return save();
    },
    loadSaved() {
      stopped = 'reloading';
      deps.clearKept();
      deps.reload();
    },
    open() {
      closed = false;
    },
    close() {
      closed = true;
      clearTimeout(timer);
      if (!stopped && latest !== saved) keepLatest();
      void save(true);
    },
  };
}
