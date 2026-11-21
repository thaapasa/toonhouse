import type { SavedContent } from '@toonhouse/api';
import type { CartoonContent } from '@toonhouse/model';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../api.ts';
import {
  createSaver,
  failure,
  RETRY_DELAY,
  SAVE_DELAY,
  type SaveState,
} from './saver.ts';
import { newScene } from './sceneEdit.ts';

const content = (n: number): CartoonContent => ({
  version: 1,
  scenes: [{ ...newScene(), id: `s${n}` }],
});

const conflict = () =>
  new ApiError(409, { error: 'x', reason: 'revision' as const });

/** A fake server that answers each save when the test says so. */
function setup(start = content(0)) {
  const server: SavedContent = { revision: 0, content: start };
  const sent: SavedContent[] = [];
  const answers: {
    resolve(): void;
    reject(e: unknown): void;
    lose(): void;
  }[] = [];
  let kept: SavedContent | null = null;
  const states: SaveState[] = [];
  const reload = vi.fn();
  const saver = createSaver(
    {
      send: (body) =>
        new Promise<number>((resolve, reject) => {
          const save = JSON.parse(body) as SavedContent;
          sent.push(save);
          const store = () => {
            server.revision += 1;
            server.content = save.content;
          };
          answers.push({
            resolve: () => {
              if (save.revision !== server.revision) return reject(conflict());
              store();
              resolve(server.revision);
            },
            reject,
            // The server stores the save, but the answer doesn't arrive.
            lose: () => {
              store();
              reject(new TypeError('Load failed'));
            },
          });
        }),
      load: () => Promise.resolve(structuredClone(server)),
      keep: (s) => {
        kept = s;
        return true;
      },
      clearKept: () => {
        kept = null;
      },
      onState: (s) => states.push(s),
      onSaved: () => {},
      reload,
    },
    start,
    0,
    false,
  );
  const answer = async () => {
    answers.shift()!.resolve();
    await vi.advanceTimersByTimeAsync(0);
  };
  return {
    saver,
    server,
    sent,
    answers,
    answer,
    reload,
    kept: () => kept,
    state: () => states.at(-1)?.status,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('saver', () => {
  it('saves the edits made during a save right after it', async () => {
    const t = setup();
    t.saver.update(content(1));
    await vi.advanceTimersByTimeAsync(SAVE_DELAY);
    t.saver.update(content(2));
    await t.answer();
    await vi.advanceTimersByTimeAsync(SAVE_DELAY);
    await t.answer();
    expect(t.server).toEqual({ revision: 2, content: content(2) });
    expect(t.state()).toBe('saved');
  });

  it('sends a flush asked for during a save at once after it', async () => {
    const t = setup();
    t.saver.update(content(1));
    void t.saver.save();
    t.saver.update(content(2));
    void t.saver.save(true);
    expect(t.sent).toHaveLength(1);
    await t.answer();
    expect(t.sent).toHaveLength(2);
    await t.answer();
    expect(t.server.content).toEqual(content(2));
  });

  it('keeps the edits after a lost login, also the later ones', async () => {
    const t = setup();
    t.saver.update(content(1));
    void t.saver.save();
    t.answers.shift()!.reject(new ApiError(401));
    await vi.advanceTimersByTimeAsync(0);
    expect(t.state()).toBe('loggedOut');
    t.saver.update(content(2));
    await vi.advanceTimersByTimeAsync(RETRY_DELAY);
    expect(t.sent).toHaveLength(1);
    expect(t.kept()).toEqual({ revision: 0, content: content(2) });
  });

  it('tells the user of a save from elsewhere and keeps the edits', async () => {
    const t = setup();
    t.server.revision = 5;
    t.server.content = content(9);
    t.saver.update(content(1));
    void t.saver.save();
    await t.answer();
    expect(t.state()).toBe('conflict');
    expect(t.kept()).toEqual({ revision: 0, content: content(1) });

    void t.saver.keepMine();
    await vi.advanceTimersByTimeAsync(0);
    await t.answer();
    expect(t.server).toEqual({ revision: 6, content: content(1) });
    expect(t.kept()).toBeNull();
  });

  it('takes a save whose answer was lost as its own', async () => {
    const t = setup();
    t.saver.update(content(1));
    void t.saver.save();
    t.answers.shift()!.lose();
    await vi.advanceTimersByTimeAsync(0);
    expect(t.state()).toBe('error');
    t.saver.update(content(2));
    await vi.advanceTimersByTimeAsync(SAVE_DELAY);
    // The save of revision 0 gets 409, since the server is at 1.
    await t.answer();
    await vi.advanceTimersByTimeAsync(SAVE_DELAY);
    await t.answer();
    expect(t.server).toEqual({ revision: 2, content: content(2) });
    expect(t.state()).toBe('saved');
  });

  it('keeps the unsaved edits when the editor closes, and tries no more', async () => {
    const t = setup();
    t.saver.update(content(1));
    t.saver.close();
    expect(t.kept()).toEqual({ revision: 0, content: content(1) });
    t.answers.shift()!.reject(new TypeError('Load failed'));
    await vi.advanceTimersByTimeAsync(RETRY_DELAY * 2);
    expect(t.sent).toHaveLength(1);
    expect(t.kept()).not.toBeNull();
  });

  it('tells a newer revision from an old format', () => {
    expect(failure(conflict())).toBe('revision');
    expect(failure(new ApiError(409, { error: 'x', reason: 'version' }))).toBe(
      'version',
    );
  });
});
