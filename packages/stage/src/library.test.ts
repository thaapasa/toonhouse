import type { Background, Rig } from '@toonhouse/model';
import { describe, expect, it } from 'vitest';

import {
  assetFolder,
  backgroundSources,
  packOf,
  resolve,
  rigSources,
  skySources,
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
    expect(resolve(dir, '../../shared/hill.svg')).toBe(
      '../../assets/packs/sunny/shared/hill.svg',
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

  it('finds the layers of a background', () => {
    const bg = {
      layers: [{ id: 'hills', svg: 'hills.svg' }],
    } as unknown as Background;
    const files = { 'b/farm/hills.svg': 'hills' };
    expect(backgroundSources(bg, 'b/farm/', files)).toEqual({ hills: 'hills' });
  });

  it('finds the drawings of the sky', () => {
    const files = Object.fromEntries(
      ['sun', 'cloud-1', 'cloud-2', 'cloud-3', 'cloud-4'].map((f) => [
        `a/sky/${f}.svg`,
        f,
      ]),
    );
    expect(skySources('a/sky/', files)).toEqual({
      'sky-sun': 'sun',
      'sky-cloud-1': 'cloud-1',
      'sky-cloud-2': 'cloud-2',
      'sky-cloud-3': 'cloud-3',
      'sky-cloud-4': 'cloud-4',
    });
    expect(() => skySources('a/', files)).toThrow('a/sun.svg');
  });
});
