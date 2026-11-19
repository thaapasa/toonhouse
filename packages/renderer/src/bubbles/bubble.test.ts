import type { Bubble, Scene } from '@toonhouse/model';
import { describe, expect, it } from 'vitest';

import { sceneLength } from '../scene.ts';
import {
  type BubbleContext,
  bubbleLength,
  bubbleOffset,
  bubblePoint,
  placeBubbles,
  textLength,
} from './bubble.ts';
import { layoutText } from './text.ts';

const bubble = (more: Partial<Bubble> = {}): Bubble => ({
  id: 'b',
  t: 1,
  text: 'Hei',
  at: { x: 800, y: 300 },
  width: 400,
  shape: 'speech',
  tail: true,
  fontSize: 40,
  color: '#000000',
  fill: '#ffffff',
  border: 'solid',
  borderColor: '#000000',
  borderWidth: 4,
  ...more,
});

const ctx = (more: Partial<BubbleContext> = {}): BubbleContext => ({
  width: 1600,
  height: 900,
  anchors: new Map(),
  fontOf: () => 'comic-relief',
  ...more,
});

describe('bubble length', () => {
  it('gives time to read the text, and at least 2 seconds', () => {
    expect(textLength('Hei')).toBe(2);
    expect(textLength('yksi kaksi kolme neljä viisi kuusi')).toBeCloseTo(3.4);
  });

  it('keeps the length that the user set', () => {
    expect(bubbleLength(bubble({ length: 7 }))).toBe(7);
  });

  it('makes the scene last until the last bubble ends', () => {
    const scene: Scene = {
      id: 's',
      background: null,
      backgroundActions: [],
      actors: [],
      bubbles: [bubble({ t: 20, length: 5 })],
    };
    expect(sceneLength(scene, null, () => null)).toBeGreaterThanOrEqual(25);
  });
});

describe('text layout', () => {
  it('wraps the text to the width of the bubble', () => {
    const text = 'yksi kaksi kolme neljä viisi kuusi seitsemän';
    const wide = layoutText(bubble({ text, width: 5000 }), 'comic-relief');
    const narrow = layoutText(bubble({ text, width: 200 }), 'comic-relief');
    expect(wide.lines).toHaveLength(1);
    expect(narrow.lines.length).toBeGreaterThan(2);
    for (const line of narrow.lines)
      expect(line.width).toBeLessThanOrEqual(200);
  });

  it('keeps the line breaks of the text', () => {
    const text = layoutText(bubble({ text: 'a\nb\n\nc' }), 'bangers');
    expect(text.lines.map((l) => l.text)).toEqual(['a', 'b', '', 'c']);
  });

  it('breaks a word that is too long for a line', () => {
    const text = layoutText(
      bubble({
        text: 'lentokonesuihkuturbiinimoottoriapumekaanikkoaliupseerioppilas',
        width: 200,
      }),
      'shantell-sans',
    );
    expect(text.lines.length).toBeGreaterThan(1);
  });

  it('shows the text in capitals when the bubble says so', () => {
    expect(layoutText(bubble({ caps: true }), 'chewy').lines[0]!.text).toBe(
      'HEI',
    );
  });
});

describe('placing bubbles', () => {
  it('shows a bubble only for its length', () => {
    const b = bubble({ length: 2 });
    expect(placeBubbles([b], 0.5, ctx())).toHaveLength(0);
    expect(placeBubbles([b], 2, ctx())).toHaveLength(1);
    expect(placeBubbles([b], 3, ctx())).toHaveLength(0);
  });

  it('draws the bubble that starts later in front', () => {
    const placed = placeBubbles(
      [bubble({ id: 'late', t: 2 }), bubble({ id: 'early', t: 1 })],
      2.5,
      ctx(),
    );
    expect(placed.map((p) => p.bubble.id)).toEqual(['early', 'late']);
  });

  it('follows its actor at an offset that grows with the actor', () => {
    const anchor = {
      at: { x: 500, y: 600 },
      size: 2,
      head: { x: 500, y: 300 },
    };
    const b = bubble({ actorId: 'a', at: { x: 50, y: -200 } });
    const [placed] = placeBubbles(
      [b],
      2,
      ctx({ anchors: new Map([['a', anchor]]) }),
    );
    expect(placed!.center).toEqual({ x: 600, y: 200 });
    expect(bubbleOffset(bubblePoint(b.at, anchor), anchor)).toEqual(b.at);
  });

  it('leaves out a bubble whose actor is gone', () => {
    expect(placeBubbles([bubble({ actorId: 'gone' })], 2, ctx())).toHaveLength(
      0,
    );
  });

  it('stays inside the frame', () => {
    const [placed] = placeBubbles(
      [bubble({ at: { x: -300, y: 2000 } })],
      2,
      ctx(),
    );
    expect(placed!.box.x).toBeGreaterThanOrEqual(0);
    expect(placed!.box.y + placed!.box.height).toBeLessThanOrEqual(900);
  });

  it('points the tail at the head of the actor', () => {
    const anchor = {
      at: { x: 500, y: 600 },
      size: 1,
      head: { x: 500, y: 450 },
    };
    const [placed] = placeBubbles(
      [bubble({ actorId: 'a', at: { x: 0, y: -400 } })],
      2,
      ctx({ anchors: new Map([['a', anchor]]) }),
    );
    expect(placed!.tip!.x).toBeCloseTo(500);
    expect(placed!.tip!.y).toBeLessThan(450);
    expect(placed!.tip!.y).toBeGreaterThan(placed!.center.y);
  });

  it('has no tail when the tail is off', () => {
    const [placed] = placeBubbles([bubble({ tail: false })], 2, ctx());
    expect(placed!.tip).toBeNull();
  });
});

describe('popping', () => {
  it('starts small and grows, unless the caller turns the pop off', () => {
    const b = bubble({ t: 1, length: 3 });
    const at = (t: number, pop?: boolean) =>
      placeBubbles([b], t, ctx(), pop)[0]!.node;
    const scaleOf = (n: ReturnType<typeof at>) =>
      n.type === 'group' ? n.transform![0] : 0;
    expect(scaleOf(at(1))).toBeLessThan(0.5);
    expect(scaleOf(at(2))).toBe(1);
    expect(scaleOf(at(1, false))).toBe(1);
    expect(scaleOf(at(1, true))).toBeLessThan(0.5);
    const off = placeBubbles([{ ...b, pop: false }], 1, ctx())[0]!.node;
    expect(scaleOf(off)).toBe(1);
  });
});
