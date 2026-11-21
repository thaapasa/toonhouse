import type { Background, Rig } from '@toonhouse/model';
import { describe, expect, it } from 'vitest';

import {
  assetFolder,
  backgroundSources,
  packOf,
  resolve,
  rigSources,
} from './library.ts';

describe('library files', () => {
  it('finds the folder and the id of an asset', () => {
    expect(assetFolder('../../assets/packs/sunny/props/oak/rig.json')).toEqual({
      dir: '../../assets/packs/sunny/props/oak/',
      id: 'sunny/oak',
    });
    expect(packOf('sunny/oak')).toBe('sunny');
  });

  it('resolves a file against a folder', () => {
    const dir = '../../assets/packs/sunny/backgrounds/farm/';
    expect(resolve(dir, 'sky.svg')).toBe(
      '../../assets/packs/sunny/backgrounds/farm/sky.svg',
    );
    expect(resolve(dir, './sky.svg')).toBe(
      '../../assets/packs/sunny/backgrounds/farm/sky.svg',
    );
    expect(resolve(dir, '../../shared/sun.svg')).toBe(
      '../../assets/packs/sunny/shared/sun.svg',
    );
  });

  it('finds the layers of a rig, also in another folder', () => {
    const rig = {
      parts: {
        head: {
          svg: 'head.svg',
          layers: [{ id: 'hair', svg: '../shared/hair.svg' }],
        },
      },
    } as unknown as Rig;
    const files = {
      'a/boy/head.svg': 1,
      'a/shared/hair.svg': 2,
    };
    expect(rigSources(rig, 'a/boy/', files)).toEqual({
      head: 1,
      'head.hair': 2,
    });
    expect(() => rigSources(rig, 'a/girl/', files)).toThrow('a/girl/head.svg');
  });

  it('finds the layers and the parts of a background', () => {
    const bg = {
      layers: [{ id: 'sky', svg: 'sky.svg' }],
      parts: { sun: { svg: '../shared/sun.svg' } },
    } as unknown as Background;
    const files = { 'b/farm/sky.svg': 'sky', 'b/shared/sun.svg': 'sun' };
    expect(backgroundSources(bg, 'b/farm/', files)).toEqual({
      sky: 'sky',
      sun: 'sun',
    });
  });
});
