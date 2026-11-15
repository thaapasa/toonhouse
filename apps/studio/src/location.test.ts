import { describe, expect, it } from 'vitest';

import { locationSearch, readLocation } from './location.ts';

const known = {
  characters: ['boy', 'captain'],
  props: ['tree'],
  backgrounds: ['harbor'],
};

describe('location', () => {
  it('reads a character, a prop and a background', () => {
    expect(readLocation('?character=captain', known)).toEqual({
      rig: 'captain',
      background: null,
    });
    expect(readLocation('?prop=tree&background=harbor', known)).toEqual({
      rig: 'tree',
      background: 'harbor',
    });
  });

  it('skips unknown ids', () => {
    expect(readLocation('?character=nobody&background=moon', known)).toEqual({
      rig: 'boy',
      background: null,
    });
    expect(readLocation('', known)).toEqual({ rig: 'boy', background: null });
  });

  it('writes what it reads', () => {
    for (const loc of [
      { rig: 'captain', background: null },
      { rig: 'tree', background: 'harbor' },
    ]) {
      expect(readLocation(locationSearch(loc, known), known)).toEqual(loc);
    }
    expect(locationSearch({ rig: 'tree', background: null }, known)).toBe(
      '?prop=tree',
    );
  });
});
