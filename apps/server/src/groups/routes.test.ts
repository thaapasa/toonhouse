import { beforeEach, describe, expect, it } from 'vitest';

import { login, request } from '../test/api.ts';
import { createGroup, createUser, resetDatabase } from '../test/db.ts';

beforeEach(resetDatabase);

describe('GET /api/app/groups', () => {
  it('returns the groups of the user, by name', async () => {
    const artist = await createUser('artist');
    const other = await createUser('other');
    await createGroup('Zebras', [artist]);
    await createGroup('Ants', [artist, other]);
    await createGroup('Others', [other]);

    const res = await request('/api/app/groups', {
      cookie: await login('artist'),
    });
    expect((await res.json()) as { name: string }[]).toMatchObject([
      { name: 'Ants' },
      { name: 'Zebras' },
    ]);
  });

  it('requires a login', async () => {
    expect((await request('/api/app/groups')).status).toBe(401);
  });
});
