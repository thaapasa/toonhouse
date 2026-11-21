import { describe, expect, it } from 'vitest';

import { locationSearch, readLocation } from './location.ts';

const known = {
  characters: ['sunny/blond-boy', 'adventure/captain'],
  props: ['sunny/oak'],
  backgrounds: ['adventure/harbor'],
};

describe('location', () => {
  it('reads a character, a prop and a background', () => {
    expect(readLocation('?character=adventure/captain', known)).toEqual({
      rig: 'adventure/captain',
      background: null,
    });
    expect(
      readLocation('?prop=sunny/oak&background=adventure/harbor', known),
    ).toEqual({
      rig: 'sunny/oak',
      background: 'adventure/harbor',
    });
  });

  it('skips unknown ids', () => {
    expect(readLocation('?character=nobody&background=moon', known)).toEqual({
      rig: 'sunny/blond-boy',
      background: null,
    });
    expect(readLocation('', known)).toEqual({
      rig: 'sunny/blond-boy',
      background: null,
    });
  });

  it('writes what it reads', () => {
    for (const loc of [
      { rig: 'adventure/captain', background: null },
      { rig: 'sunny/oak', background: 'adventure/harbor' },
    ]) {
      expect(readLocation(locationSearch(loc, known), known)).toEqual(loc);
    }
    expect(locationSearch({ rig: 'sunny/oak', background: null }, known)).toBe(
      '?prop=sunny%2Foak',
    );
  });
});
