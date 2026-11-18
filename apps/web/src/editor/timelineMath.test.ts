import type { Action } from '@toonhouse/model';
import { clipOf } from '@toonhouse/renderer';
import { describe, expect, it } from 'vitest';

import {
  anchoredScroll,
  formatTime,
  midPoints,
  progressPoints,
  rulerTicks,
  snapToTargets,
  timelineLength,
  type TimelineRow,
  zoomSteps,
} from './timelineMath.ts';

const wave = (id: string, t: number): Action => ({ id, t, clip: 'wave' });
const row = (actions: Action[], walks: [string, number][] = []) =>
  ({
    kind: 'cutout',
    actions,
    walkTimes: new Map(walks),
  }) satisfies TimelineRow;
const loop = clipOf('cutout', 'wave').duration;

describe('timeline length', () => {
  it('goes on past the end of the scene', () => {
    expect(timelineLength(10)).toBe(15);
    expect(timelineLength(40)).toBe(50);
  });
});

describe('ruler', () => {
  it('shows seconds, or tenths when zoomed in', () => {
    expect(rulerTicks(3, 60).map((t) => t.label)).toEqual([
      '0:00',
      '0:01',
      '0:02',
      '0:03',
    ]);
    expect(rulerTicks(0.4, 600).map((t) => t.label)).toEqual([
      '0:00.0',
      '0:00.1',
      '0:00.2',
      '0:00.3',
      '0:00.4',
    ]);
  });

  it('formats a time as minutes, seconds and tenths', () => {
    expect(formatTime(75.35)).toBe('1:15.3');
  });
});

describe('zoom', () => {
  it('steps through the levels and stops at the deepest zoom', () => {
    expect(zoomSteps(1, 20)).toEqual({ in: 1.5, out: undefined });
    expect(zoomSteps(2.5, 20)).toEqual({ in: 3, out: 2 });
    expect(zoomSteps(16, 20)).toEqual({ in: 20, out: 12 });
    expect(zoomSteps(20, 20)).toEqual({ in: undefined, out: 16 });
  });

  it('keeps the time under the pointer in place', () => {
    // At 10 px/s, 100 px into a view scrolled by 200 px is 30 s, which is at
    // 600 px at 20 px/s.
    expect(anchoredScroll(200, 100, 10, 20)).toBe(500);
    expect(anchoredScroll(0, 100, 20, 10)).toBe(0);
  });
});

describe('middle points', () => {
  it('are the loops of a clip', () => {
    const a = wave('a', 1);
    expect(midPoints(a, row([a]), 1 + loop * 2.5, 100)).toEqual([
      1 + loop,
      1 + loop * 2,
    ]);
  });

  it('come sooner when the clip starts in the middle', () => {
    const a = { ...wave('a', 1), clipStart: 0.5 };
    expect(midPoints(a, row([a]), 1 + loop * 2, 100)).toEqual([
      1 + loop * 0.5,
      1 + loop * 1.5,
    ]);
  });

  it('are none when the loops are too close', () => {
    const a = wave('a', 1);
    expect(midPoints(a, row([a]), 100, 1)).toEqual([]);
  });

  it('are the end of a walk', () => {
    const a: Action = { id: 'w', t: 2, clip: 'walk', path: [] };
    expect(midPoints(a, row([a], [['w', 3]]), 10, 100)).toEqual([5]);
    expect(midPoints(a, row([a], [['w', 3]]), 4, 100)).toEqual([]);
  });
});

describe('snapping', () => {
  it('snaps to a close target, on a whole frame', () => {
    expect(snapToTargets(2.04, [2.0333], 100, 30)).toBeCloseTo(61 / 30);
  });

  it('goes to the nearest tenth with no close target', () => {
    expect(snapToTargets(2.04, [3], 100, 30)).toBe(2);
    expect(snapToTargets(-1, [], 100, 30)).toBe(0);
  });
});

describe('progress strip', () => {
  const opts = { pps: 10, height: 8, walk: undefined, loop: 1 };

  it('rises once for each loop', () => {
    expect(progressPoints({ ...opts, length: 2.5 })).toEqual([
      [0, 8],
      [10, 0],
      [10, 8],
      [20, 0],
      [20, 8],
      [25, 4],
      [25, 8],
      [25, 8],
    ]);
  });

  it('starts part of the way up when the clip starts in the middle', () => {
    expect(progressPoints({ ...opts, length: 1.5, phase: 0.5 })).toEqual([
      [0, 8],
      [0, 4],
      [5, 0],
      [5, 8],
      [15, 0],
      [15, 8],
      [15, 8],
    ]);
  });

  it('rises once over a walk and is empty after it', () => {
    expect(progressPoints({ ...opts, length: 5, walk: 2 })).toEqual([
      [0, 8],
      [20, 0],
      [20, 8],
      [50, 8],
    ]);
  });

  it('is flat when the loops are too narrow', () => {
    expect(progressPoints({ ...opts, length: 5, loop: 0.1 })).toEqual([
      [0, 8],
      [0, 4],
      [50, 4],
      [50, 8],
    ]);
  });
});
