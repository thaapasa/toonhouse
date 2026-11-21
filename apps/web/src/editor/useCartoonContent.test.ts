import { describe, expect, it } from 'vitest';

import { ApiError } from '../api.ts';
import { failedSave } from './useCartoonContent.ts';

describe('failed save', () => {
  it('tries again only without an answer or after a server error', () => {
    expect(failedSave(new TypeError('Failed to fetch'))).toBe('error');
    expect(failedSave(new ApiError(503))).toBe('error');
    expect(failedSave(new ApiError(400))).toBe('refused');
    expect(failedSave(new ApiError(413))).toBe('tooLarge');
    expect(failedSave(new ApiError(401))).toBe('loggedOut');
  });

  it('tells a newer revision from an old format', () => {
    const revision = { error: 'x', reason: 'revision' };
    expect(failedSave(new ApiError(409, revision))).toBe('conflict');
    expect(
      failedSave(new ApiError(409, { error: 'x', reason: 'version' })),
    ).toBe('reload');
  });
});
