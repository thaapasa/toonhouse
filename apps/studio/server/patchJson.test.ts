import { describe, expect, it } from 'vitest';

import { patchJson, patchNumbers } from './patchJson.ts';

const text = `{
  "kind": "cutout",
  "parts": {
    "head": { "svg": "head.svg", "pivot": { "x": 165, "y": 345 } }
  },
  "list": [1, -2.5, 3e2],
  "flag": true,
  "none": null
}
`;

describe('patchNumbers', () => {
  it('changes only the numbers that differ', () => {
    const next = JSON.parse(text);
    next.parts.head.pivot.x = 185;
    next.list[1] = 4;
    expect(patchNumbers(text, next)).toBe(
      text.replace('"x": 165', '"x": 185').replace('-2.5', '4'),
    );
  });

  it('keeps the text when nothing changes', () => {
    expect(patchNumbers(text, JSON.parse(text))).toBe(text);
  });

  it('gives null when more than the numbers change', () => {
    const next = JSON.parse(text);
    next.parts.head.svg = 'other.svg';
    expect(patchNumbers(text, next)).toBeNull();
    expect(patchNumbers(text, { ...JSON.parse(text), extra: 1 })).toBeNull();
  });

  it('handles escapes in strings', () => {
    const t = '{ "a\\"b": "c\\\\", "n": 1 }';
    expect(patchNumbers(t, { 'a"b': 'c\\', n: 2 })).toBe(
      '{ "a\\"b": "c\\\\", "n": 2 }',
    );
  });
});

describe('patchJson', () => {
  const parsed = () => JSON.parse(text) as Record<string, unknown>;
  const same = (out: string | null, next: unknown) =>
    expect(JSON.parse(out!)).toEqual(next);

  it('adds, replaces and removes top-level arrays', () => {
    const added = { ...parsed(), order: ['b', 'a'] };
    const withOrder = patchJson(text, added)!;
    same(withOrder, added);
    expect(
      withOrder.startsWith(text.slice(0, text.lastIndexOf('}')).trimEnd()),
    ).toBe(true);

    const changed = { ...added, order: ['a', 'b'], list: [1] };
    same(patchJson(withOrder, changed), changed);

    const removed = parsed();
    same(patchJson(withOrder, removed), removed);
  });

  it('removes the first member', () => {
    const next = parsed();
    delete next.kind;
    delete next.parts;
    same(patchJson(text, next), next);
  });

  it('keeps the layout of the numbers next to a new member', () => {
    const next: Record<string, unknown> = { ...parsed(), order: ['a'] };
    (next.parts as { head: { pivot: { x: number } } }).head.pivot.x = 1;
    const out = patchJson(text, next)!;
    same(out, next);
    expect(out).toContain('"pivot": { "x": 1, "y": 345 }');
  });

  it('gives null when a nested string changes', () => {
    const next = parsed();
    (next.parts as { head: { svg: string } }).head.svg = 'other.svg';
    expect(patchJson(text, next)).toBeNull();
  });
});
