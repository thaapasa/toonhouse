import type { SaveContentRequest, SavedContent } from '@toonhouse/api';
import type { CartoonContent } from '@toonhouse/model';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../api.ts';
import {
  createSaver,
  failure,
  RETRY_DELAY,
  SAVE_DELAY,
  type SaveState,
  startFrom,
} from './saver.ts';
import { newScene } from './sceneEdit.ts';

const content = (n: number): CartoonContent => ({
  version: 1,
  scenes: [{ ...newScene(), id: `s${n}` }],
});

const conflict = () =>
  new ApiError(409, { error: 'x', reason: 'revision' as const });
const offline = () => new TypeError('Load failed');

/** A fake server that answers each save when the test says so. */
function setup(keptBy: string | null = null) {
  const server: SavedContent = {
    revision: 0,
    editor: null,
    content: content(0),
  };
  const sent: SaveContentRequest[] = [];
  const answers: {
    resolve(): void;
    reject(e: unknown): void;
    lose(): void;
  }[] = [];
  let kept: SavedContent | null = null;
  const states: SaveState[] = [];
  const saver = createSaver(
    {
      send: (body) =>
        new Promise<number>((resolve, reject) => {
          const save = JSON.parse(body) as SaveContentRequest;
          sent.push(save);
          const store = () => {
            server.revision += 1;
            server.editor = save.editor;
            server.content = save.content as unknown as CartoonContent;
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
              reject(offline());
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
      reload: () => {},
    },
    { content: content(0), revision: 0, unsaved: false, keptBy, ask: false },
  );
  const settle = () => vi.advanceTimersByTimeAsync(0);
  const answer = async (how: 'resolve' | 'lose' = 'resolve') => {
    answers.shift()![how]();
    await settle();
  };
  const fail = async (e: unknown) => {
    answers.shift()!.reject(e);
    await settle();
  };
  return {
    saver,
    server,
    sent,
    answer,
    fail,
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
    expect(t.server.content).toEqual(content(2));
    expect(t.state()).toBe('saved');
  });

  it('saves an edit made during a save that the server refuses', async () => {
    const t = setup();
    t.saver.update(content(1));
    void t.saver.save();
    t.saver.update(content(2));
    await t.fail(new ApiError(400));
    await vi.advanceTimersByTimeAsync(SAVE_DELAY);
    await t.answer();
    expect(t.server.content).toEqual(content(2));
  });

  it('sends a flush asked for during a save at once after it', async () => {
    const t = setup();
    t.saver.update(content(1));
    void t.saver.save();
    t.saver.update(content(2));
    t.saver.hide();
    expect(t.kept()?.content).toEqual(content(2));
    expect(t.sent).toHaveLength(1);
    await t.answer();
    expect(t.sent).toHaveLength(2);
    await t.answer();
    expect(t.server.content).toEqual(content(2));
    expect(t.kept()).toBeNull();
  });

  it('keeps the edits after a lost login, also the later ones', async () => {
    const t = setup();
    t.saver.update(content(1));
    void t.saver.save();
    await t.fail(new ApiError(401));
    expect(t.state()).toBe('loggedOut');
    t.saver.update(content(2));
    await vi.advanceTimersByTimeAsync(RETRY_DELAY);
    expect(t.sent).toHaveLength(1);
    expect(t.kept()?.content).toEqual(content(2));
  });

  it('goes on from its own save after answers were lost', async () => {
    const t = setup();
    t.saver.update(content(1));
    void t.saver.save();
    await t.answer('lose');
    // The network stays down for two more tries.
    t.saver.update(content(2));
    await vi.advanceTimersByTimeAsync(SAVE_DELAY);
    await t.fail(offline());
    t.saver.update(content(3));
    await vi.advanceTimersByTimeAsync(SAVE_DELAY);
    await t.fail(offline());
    await vi.advanceTimersByTimeAsync(RETRY_DELAY);
    // The server is at revision 1 from the lost answer, so this gets 409.
    await t.answer();
    await vi.advanceTimersByTimeAsync(SAVE_DELAY);
    await t.answer();
    expect(t.server).toMatchObject({ revision: 2, content: content(3) });
    expect(t.state()).toBe('saved');
  });

  it('counts the saves of the editor that it goes on from as its own', async () => {
    const before = crypto.randomUUID();
    const t = setup(before);
    Object.assign(t.server, { revision: 1, editor: before });
    t.saver.update(content(1));
    await vi.advanceTimersByTimeAsync(SAVE_DELAY);
    await t.answer();
    await vi.advanceTimersByTimeAsync(SAVE_DELAY);
    await t.answer();
    expect(t.server).toMatchObject({ revision: 2, content: content(1) });
  });

  it('counts no newer save of the editor that it goes on from as its own', async () => {
    // A second window opened from the kept edits of the first one, and then
    // the first one saved newer edits.
    const before = crypto.randomUUID();
    const t = setup(before);
    Object.assign(t.server, {
      revision: 1,
      editor: before,
      content: content(5),
    });
    t.saver.update(content(1));
    await vi.advanceTimersByTimeAsync(SAVE_DELAY);
    await t.answer();
    expect(t.state()).toBe('conflict');
    expect(t.server.content).toEqual(content(5));
  });

  it('asks the user after a save of another editor, and keeps the edits', async () => {
    const t = setup();
    Object.assign(t.server, {
      revision: 5,
      editor: crypto.randomUUID(),
      content: content(9),
    });
    t.saver.update(content(1));
    void t.saver.save();
    await t.answer();
    expect(t.state()).toBe('conflict');
    expect(t.kept()?.content).toEqual(content(1));

    // After an undo back to the content that it started from.
    t.saver.update(content(0));
    void t.saver.keepMine();
    await vi.advanceTimersByTimeAsync(0);
    await t.answer();
    expect(t.server).toMatchObject({ revision: 6, content: content(0) });
    expect(t.kept()).toBeNull();
  });

  it('keeps the unsaved edits when the editor closes, and tries no more', async () => {
    const t = setup();
    t.saver.update(content(1));
    t.saver.close();
    expect(t.kept()?.content).toEqual(content(1));
    await t.fail(offline());
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

describe('start of the editor', () => {
  const editor = crypto.randomUUID();
  const kept = { revision: 3, editor, content: content(1) };

  it('goes on with the kept edits of the same revision', () => {
    const server = { revision: 3, editor: null, content: content(0) };
    expect(startFrom(server, kept)).toMatchObject({
      content: content(1),
      unsaved: true,
      keptBy: editor,
      ask: false,
    });
  });

  it('drops kept edits that their editor saved as it closed', () => {
    const server = { revision: 4, editor, content: content(1) };
    expect(startFrom(server, kept)).toMatchObject({
      content: content(1),
      unsaved: false,
      dropKept: true,
    });
  });

  it('asks about kept edits that differ from a later save of their editor', () => {
    // A delayed save of older edits landed after the editor kept newer ones.
    const server = { revision: 4, editor, content: content(0) };
    expect(startFrom(server, kept)).toMatchObject({
      content: content(1),
      ask: true,
      dropKept: false,
    });
  });

  it('asks about kept edits older than a save from elsewhere', () => {
    // The laptop kept edits, and then the iPad saved.
    const server = {
      revision: 5,
      editor: crypto.randomUUID(),
      content: content(2),
    };
    expect(startFrom(server, kept)).toMatchObject({
      content: content(1),
      ask: true,
    });
  });
});
