import { describe, expect, it } from 'vitest';

import { editorCommand } from './keys.ts';

const press = (key: string, mods: Partial<KeyboardEvent> = {}) =>
  editorCommand({
    key,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    ...mods,
  });

describe('editorCommand', () => {
  it('plays and moves the playhead with plain keys', () => {
    expect(press(' ')).toBe('play');
    expect(press('ArrowLeft')).toBe('back');
    expect(press('ArrowRight')).toBe('forward');
    expect(press('ArrowUp')).toBe('start');
    expect(press('ArrowDown')).toBe('end');
  });

  it('leaves the keys with modifier keys to the browser', () => {
    expect(press(' ', { metaKey: true })).toBeNull();
    expect(press('ArrowLeft', { shiftKey: true })).toBeNull();
    expect(press('ArrowUp', { altKey: true })).toBeNull();
  });

  it('undoes and redoes with Cmd or Ctrl and Z', () => {
    expect(press('z', { metaKey: true })).toBe('undo');
    expect(press('z', { ctrlKey: true })).toBe('undo');
    expect(press('Z', { metaKey: true, shiftKey: true })).toBe('redo');
    expect(press('z')).toBeNull();
  });
});
