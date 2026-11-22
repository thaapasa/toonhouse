import type { Bubble, Scene } from '@toonhouse/model';
import { bubblePoint } from '@toonhouse/renderer';
import { describe, expect, it } from 'vitest';

import { attachBubble, newBubble, setOptional } from './bubbles.ts';
import { removeActor } from './sceneEdit.ts';

const anchors = new Map([
  ['a', { at: { x: 100, y: 800 }, size: 0.5, head: { x: 100, y: 600 } }],
  ['b', { at: { x: 900, y: 700 }, size: 2, head: { x: 900, y: 300 } }],
]);

const bubble = newBubble(
  'x',
  1,
  { x: 0, y: 0 },
  {
    actorId: 'a',
    anchor: anchors.get('a')!,
    top: 550,
  },
);

describe('bubbles in the editor', () => {
  it('puts a new attached bubble above the actor, with a tail', () => {
    const at = bubblePoint(bubble.at, anchors.get('a')!);
    expect(at.y).toBeLessThan(550);
    expect(bubble.tail).toBe(true);
    expect(bubble.actorId).toBe('a');
  });

  it('keeps a bubble in place when it moves to another actor or becomes free', () => {
    const where = bubblePoint(bubble.at, anchors.get('a')!);
    const moved = attachBubble(bubble, 'b', anchors);
    expect(moved.actorId).toBe('b');
    expect(bubblePoint(moved.at, anchors.get('b')!)).toEqual(where);
    const free = attachBubble(bubble, null, anchors);
    expect('actorId' in free).toBe(false);
    expect(free.at).toEqual(where);
  });

  it('leaves out an optional field that is set to undefined', () => {
    const b: Bubble = { ...bubble, bold: true };
    expect('bold' in setOptional(b, 'bold', undefined)).toBe(false);
    expect(setOptional(b, 'align', 'left').align).toBe('left');
  });

  it('removes the bubbles of an actor with the actor', () => {
    const scene: Scene = {
      id: 's',
      background: null,
      actors: [],
      bubbles: [
        bubble,
        { ...setOptional(bubble, 'actorId', undefined), id: 'free' },
      ],
    };
    expect(removeActor(scene, 'a').bubbles!.map((b) => b.id)).toEqual(['free']);
  });
});
