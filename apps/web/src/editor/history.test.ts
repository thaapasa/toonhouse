import { describe, expect, it } from 'vitest';

import {
  applyEdit,
  type History,
  newHistory,
  redoStep,
  revertRun,
  undoStep,
} from './history.ts';

const set =
  (key: string, value: number) =>
  (c: Record<string, number>): Record<string, number> => ({
    ...c,
    [key]: value,
  });
const edit = (
  h: History<Record<string, number>>,
  key: string,
  value: number,
  run?: object,
) => applyEdit(h, set(key, value), run, 100);

describe('applyEdit', () => {
  it('makes one undo step for a run', () => {
    const run = {};
    let h = edit(newHistory({}), 'a', 1, run);
    h = edit(h, 'a', 2, run);
    h = edit(h, 'a', 3, run);
    expect(h.present).toEqual({ a: 3 });
    expect(h.past).toEqual([{}]);
  });

  it('goes on in a new step after another edit', () => {
    const run = {};
    let h = edit(newHistory({}), 'a', 1, run);
    h = edit(h, 'b', 1);
    h = edit(h, 'a', 2, run);
    expect(h.present).toEqual({ a: 2, b: 1 });
    expect(h.past).toEqual([{}, { a: 1 }, { a: 1, b: 1 }]);
  });

  it('goes on in a new step after another run', () => {
    const text = {};
    const drag = {};
    let h = edit(newHistory({}), 'a', 1, text);
    h = edit(h, 'b', 1, drag);
    h = edit(h, 'a', 2, text);
    expect(h.present).toEqual({ a: 2, b: 1 });
  });

  it('makes no step for an edit that changes nothing', () => {
    let h = edit(newHistory({}), 'a', 1);
    h = undoStep(h);
    expect(applyEdit(h, (c) => c, undefined, 100)).toBe(h);
  });

  it('goes on in a new step after an undo or a redo', () => {
    const run = {};
    let h = edit(newHistory({}), 'b', 1);
    h = edit(h, 'a', 1, run);
    h = undoStep(h);
    h = edit(h, 'a', 2, run);
    expect(h.present).toEqual({ a: 2, b: 1 });
    expect(h.past).toEqual([{}, { b: 1 }]);

    h = undoStep(h);
    h = redoStep(h);
    h = edit(h, 'a', 3, run);
    expect(h.past.at(-1)).toEqual({ a: 2, b: 1 });
  });
});

describe('revertRun', () => {
  it('takes away the step of the run', () => {
    const run = {};
    let h = edit(newHistory({}), 'b', 1);
    h = edit(h, 'a', 1, run);
    h = edit(h, 'a', 2, run);
    h = revertRun(h, run);
    expect(h.present).toEqual({ b: 1 });
    expect(h.past).toEqual([{}]);
  });

  it('keeps an edit that came after the run', () => {
    const run = {};
    let h = edit(newHistory({}), 'a', 1, run);
    h = edit(h, 'b', 1);
    expect(revertRun(h, run)).toBe(h);
  });
});
