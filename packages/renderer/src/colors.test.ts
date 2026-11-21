import type { CutoutRig, PropRig } from '@toonhouse/model';
import { describe, expect, it } from 'vitest';

import testTree from '../../../assets/fixtures/props/test-tree/rig.json';
import { colorRig, presetColors } from './colors.ts';

const rig: CutoutRig = {
  kind: 'cutout',
  colorRoles: { lid: 'skin', sleeve: 'shirt' },
  colorSettings: [
    {
      id: 'skin',
      presets: [
        { id: 'light', colors: { skin: '#fbc688' } },
        { id: 'brown', colors: { skin: '#8a5434' } },
      ],
    },
    {
      id: 'shirt',
      presets: [
        { id: 'red', colors: { shirt: '#e80000', 'shirt-pattern': '#000' } },
        { id: 'blue', colors: { shirt: '#2f6fe0', 'shirt-pattern': '#fff' } },
      ],
    },
  ],
  colors: {
    outline: '#422517',
    skin: '#fbc688',
    line: '#44260c',
    lid: '#fbc688',
    mouth: '#5a1414',
    tongue: '#e74f5a',
  },
  limbs: {
    armLength: 1,
    legLength: 1,
    armWidth: 1,
    legWidth: 1,
    outlineWidth: 1,
    sleeve: { color: '#e80000', length: 0.2, extraWidth: 1 },
  },
} as unknown as CutoutRig;

describe('color presets', () => {
  it('uses the first preset of a setting that the choice leaves out', () => {
    expect(presetColors(rig, { shirt: 'blue' })).toEqual({
      skin: '#fbc688',
      shirt: '#2f6fe0',
      'shirt-pattern': '#fff',
    });
  });

  it('uses the first preset if the choice names an unknown preset', () => {
    expect(presetColors(rig, { skin: 'green' }).skin).toBe('#fbc688');
  });

  it('gives a rig without color settings no colors', () => {
    expect(presetColors(testTree as PropRig, { skin: 'brown' })).toEqual({});
  });

  it('colors what the renderer draws from the roles', () => {
    const colored = colorRig(
      rig,
      presetColors(rig, { skin: 'brown', shirt: 'blue' }),
    );
    expect(colored.colors.skin).toBe('#8a5434');
    expect(colored.colors.lid).toBe('#8a5434');
    expect(colored.limbs.sleeve?.color).toBe('#2f6fe0');
    expect(colored.colors.outline).toBe('#422517');
    expect(colored.limbs.legColor).toBeUndefined();
    expect(rig.colors.skin).toBe('#fbc688');
  });

  it('colors the legs from the role named for them', () => {
    const trousers = { ...rig, colorRoles: { leg: 'trousers' } };
    expect(colorRig(trousers, { trousers: '#333' }).limbs.legColor).toBe(
      '#333',
    );
  });
});
