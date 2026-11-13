import { describe, expect, it } from 'vitest';

import { patchNumbers } from './patchJson.ts';

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
