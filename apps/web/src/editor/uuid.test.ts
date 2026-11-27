import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { randomUuid } from './uuid.ts';

describe('randomUuid', () => {
  it('makes version 4 UUIDs that the API accepts', () => {
    for (let i = 0; i < 100; i++) {
      const id = randomUuid();
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
      expect(z.uuid().safeParse(id).success).toBe(true);
    }
  });

  it('makes a new UUID each time', () => {
    expect(randomUuid()).not.toBe(randomUuid());
  });
});
