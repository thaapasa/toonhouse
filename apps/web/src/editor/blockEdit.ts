// The edits of the blocks on a timeline row that don't overlap, such as the
// camera moves and the changes of the time of day and the weather. A block
// has a start `t` and a `length`, and a camera jump is a block without a
// length.
import { savedTime } from './sceneEdit.ts';

/** How long a new block is, in seconds, if there is room. */
export const NEW_BLOCK_LENGTH = 2;
/** The shortest block, in seconds. */
export const MIN_BLOCK_LENGTH = 0.1;

/**
 * The step of the times that the scene saves. Two rounded times can add up to
 * a float epsilon past a neighbor, and the renderer compares the times
 * exactly. A block that ends that epsilon after the next one still plays at
 * the time of that one, so the edits move such a time back by one step.
 */
export const TIME_STEP = 1e-4;

/** The part of a block that the user drags on the timeline. */
export type BlockDrag = 'block' | 'start' | 'end';

export interface Block {
  id: string;
  t: number;
  length?: number;
}

const blockEnd = (b: Block) => b.t + (b.length ?? 0);

/** The blocks by their start, with a block without a length first. */
const sortedBlocks = <T extends Block>(list: readonly T[]): T[] =>
  [...list].sort((a, b) => a.t - b.t || (a.length ?? 0) - (b.length ?? 0));

/**
 * Where the blocks before and after `t` leave room, leaving out the block
 * `id`. Null if `t` is inside a block.
 */
export function blockRoom(
  list: readonly Block[],
  t: number,
  id: string | null,
) {
  let lo = 0;
  let hi = Infinity;
  for (const m of sortedBlocks(list)) {
    if (m.id === id) continue;
    if (blockEnd(m) <= t) lo = Math.max(lo, blockEnd(m));
    else if (m.t >= t) hi = Math.min(hi, m.t);
    else return null;
  }
  return { lo, hi };
}

/**
 * The length of a new block at `t`: `NEW_BLOCK_LENGTH`, or less to fit before
 * the next block. Null if `t` is inside a block or the block doesn't fit.
 */
export function newBlockLength(list: readonly Block[], t: number) {
  const r = blockRoom(list, t, null);
  if (!r) return null;
  let length = savedTime(Math.min(NEW_BLOCK_LENGTH, r.hi - t));
  if (t + length > r.hi) length = savedTime(length - TIME_STEP);
  return length < MIN_BLOCK_LENGTH ? null : length;
}

/**
 * The blocks after the user drags one part of the block `id` to `t`. Dragging
 * the block moves the whole block, and dragging the start or the end moves
 * only that end. A block stops at the blocks beside it.
 */
export function dragBlock<T extends Block>(
  list: readonly T[],
  id: string,
  part: BlockDrag,
  t: number,
): T[] {
  const block = list.find((m) => m.id === id);
  if (!block) return [...list];
  const sorted = sortedBlocks(list);
  const i = sorted.indexOf(block);
  const before = sorted[i - 1];
  const after = sorted[i + 1];
  const lo = before ? blockEnd(before) : 0;
  const hi = after?.t ?? Infinity;
  const length = block.length ?? 0;
  const end = block.t + length;
  const clamp = (v: number, a: number, b: number) =>
    Math.min(Math.max(v, a), b);
  // A start rounded below `lo` steps forward, and an end past `hi` back.
  const from = (v: number) => {
    const start = savedTime(v);
    return start < lo ? savedTime(start + TIME_STEP) : start;
  };
  const upTo = (start: number, v: number) => {
    const l = savedTime(v);
    return start + l > hi ? savedTime(l - TIME_STEP) : l;
  };
  let next: T;
  if (part === 'block' || !block.length) {
    let start = from(clamp(t, lo, hi - length));
    if (start + length > hi) start = savedTime(start - TIME_STEP);
    next = { ...block, t: start };
  } else if (part === 'start') {
    const start = from(clamp(t, lo, end - MIN_BLOCK_LENGTH));
    next = { ...block, t: start, length: upTo(start, end - start) };
  } else {
    const stop = clamp(t, block.t + MIN_BLOCK_LENGTH, hi);
    next = { ...block, length: upTo(block.t, stop - block.t) };
  }
  return list.map((m) => (m.id === id ? next : m));
}
