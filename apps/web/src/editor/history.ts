// The undo history of the editor. A run of edits, such as the moves of one
// drag or the letters that the user types into one field, is one undo step.

/**
 * A run of edits. The caller makes one object for each run, such as the state
 * of a drag, and passes it with each edit of the run.
 */
export type EditRun = object;

export interface History<T> {
  past: T[];
  present: T;
  future: T[];
  /** The run that made the latest step, if any. */
  run: EditRun | null;
}

export const newHistory = <T>(present: T): History<T> => ({
  past: [],
  present,
  future: [],
  run: null,
});

/**
 * Makes a new step, or makes the latest step again from the state before it
 * when the same `run` made that step. So a drag computes every move from
 * where the drag started, and it can pass over other things without changing
 * them. If anything else came between, such as another edit or an undo, the
 * run goes on in a new step, so that it doesn't overwrite the other edit.
 */
export function applyEdit<T>(
  h: History<T>,
  fn: (c: T) => T,
  run: EditRun | undefined,
  limit: number,
): History<T> {
  const before = h.past.at(-1);
  if (run && h.run === run && before !== undefined)
    return { ...h, present: fn(before), future: [] };
  return {
    past: [...h.past, h.present].slice(-limit),
    present: fn(h.present),
    future: [],
    run: run ?? null,
  };
}

/** Takes away the step of `run`, if it is the latest step. */
export function revertRun<T>(h: History<T>, run: EditRun): History<T> {
  const before = h.past.at(-1);
  if (h.run !== run || before === undefined) return h;
  return { past: h.past.slice(0, -1), present: before, future: [], run: null };
}

export function undoStep<T>(h: History<T>): History<T> {
  const before = h.past.at(-1);
  if (before === undefined) return h;
  return {
    past: h.past.slice(0, -1),
    present: before,
    future: [h.present, ...h.future],
    run: null,
  };
}

export function redoStep<T>(h: History<T>): History<T> {
  const next = h.future[0];
  if (next === undefined) return h;
  return {
    past: [...h.past, h.present],
    present: next,
    future: h.future.slice(1),
    run: null,
  };
}
