import type { Cartoon, Sharing } from '@toonhouse/api';
import { beforeEach, describe, expect, it } from 'vitest';

import { app } from '../app.ts';
import { login, request } from '../test/api.ts';
import { createGroup, createUser, resetDatabase } from '../test/db.ts';

let owner: string;
let member: string;
let outsider: string;
let groupId: string;
let otherGroupId: string;

beforeEach(async () => {
  await resetDatabase();
  const ownerId = await createUser('owner');
  const memberId = await createUser('member');
  const outsiderId = await createUser('outsider');
  groupId = await createGroup('Family', [ownerId, memberId]);
  otherGroupId = await createGroup('Others', [outsiderId]);
  owner = await login('owner');
  member = await login('member');
  outsider = await login('outsider');
});

async function create(title = 'Kana ja kettu'): Promise<Cartoon> {
  const res = await request('/api/app/cartoons', {
    method: 'POST',
    json: { title },
    cookie: owner,
  });
  expect(res.status).toBe(201);
  return (await res.json()) as Cartoon;
}

function share(id: string, sharing: Sharing, cookie = owner) {
  return request(`/api/app/cartoons/${id}/sharing`, {
    method: 'PUT',
    json: sharing,
    cookie,
  });
}

/** The titles of the cartoons that the user with the cookie sees in the list. */
async function listed(cookie?: string): Promise<string[]> {
  const res = await request('/api/app/cartoons', cookie ? { cookie } : {});
  return ((await res.json()) as Cartoon[]).map((c) => c.title);
}

async function canWatch(id: string, cookie?: string): Promise<boolean> {
  const res = await request(
    `/api/app/cartoons/${id}`,
    cookie ? { cookie } : {},
  );
  expect([200, 404]).toContain(res.status);
  return res.status === 200;
}

describe('creating', () => {
  it('makes a private cartoon that the owner can edit', async () => {
    const cartoon = await create();
    expect(cartoon).toMatchObject({
      title: 'Kana ja kettu',
      owner: { displayName: 'owner display' },
      visibility: 'private',
      group: null,
      canEdit: true,
    });
  });

  it('requires a login', async () => {
    const res = await request('/api/app/cartoons', {
      method: 'POST',
      json: { title: 'X' },
    });
    expect(res.status).toBe(401);
  });

  it('rejects an empty title', async () => {
    const res = await request('/api/app/cartoons', {
      method: 'POST',
      json: { title: ' ' },
      cookie: owner,
    });
    expect(res.status).toBe(400);
  });
});

describe('visibility', () => {
  it('shows a private cartoon only to the owner', async () => {
    const { id } = await create();
    expect(await canWatch(id, owner)).toBe(true);
    expect(await canWatch(id, member)).toBe(false);
    expect(await canWatch(id)).toBe(false);
    expect(await listed(owner)).toEqual(['Kana ja kettu']);
    expect(await listed(member)).toEqual([]);
  });

  it('shows a public cartoon to everyone, also without a login', async () => {
    const { id } = await create();
    expect((await share(id, { visibility: 'public' })).status).toBe(200);
    expect(await canWatch(id)).toBe(true);
    expect(await canWatch(id, outsider)).toBe(true);
    expect(await listed()).toEqual(['Kana ja kettu']);
  });

  it('shows a cartoon for logged-in users to every logged-in user only', async () => {
    const { id } = await create();
    await share(id, { visibility: 'users' });
    expect(await canWatch(id, outsider)).toBe(true);
    expect(await canWatch(id)).toBe(false);
    expect(await listed()).toEqual([]);
  });

  it('shows a group cartoon to the members of the group only', async () => {
    const { id } = await create();
    const res = await share(id, { visibility: 'group', groupId });
    expect(await res.json()).toMatchObject({
      visibility: 'group',
      group: { id: groupId, name: 'Family' },
    });
    expect(await canWatch(id, member)).toBe(true);
    expect(await canWatch(id, outsider)).toBe(false);
    expect(await canWatch(id)).toBe(false);
    expect(await listed(member)).toEqual(['Kana ja kettu']);
    expect(await listed(outsider)).toEqual([]);
  });

  it('lets the owner share only with a group they belong to', async () => {
    const { id } = await create();
    const res = await share(id, { visibility: 'group', groupId: otherGroupId });
    expect(res.status).toBe(400);
  });

  it('needs a group for the group visibility and no other', async () => {
    const { id } = await create();
    expect((await share(id, { visibility: 'group' } as Sharing)).status).toBe(
      400,
    );
  });

  it('makes a shared cartoon private again', async () => {
    const { id } = await create();
    await share(id, { visibility: 'group', groupId });
    const res = await share(id, { visibility: 'private' });
    expect(await res.json()).toMatchObject({
      visibility: 'private',
      group: null,
    });
    expect(await canWatch(id, member)).toBe(false);
  });

  it('answers 404 for a cartoon that does not exist or has a bad id', async () => {
    expect(await canWatch('019a0000-0000-7000-8000-000000000000', owner)).toBe(
      false,
    );
    expect(await canWatch('not-an-id', owner)).toBe(false);
  });
});

describe('editing', () => {
  it('lets the owner change the title', async () => {
    const { id } = await create();
    const res = await request(`/api/app/cartoons/${id}`, {
      method: 'PATCH',
      json: { title: 'Uusi nimi' },
      cookie: owner,
    });
    expect(await res.json()).toMatchObject({ title: 'Uusi nimi' });
  });

  it('refuses a user who can watch the cartoon but is not the owner', async () => {
    const { id } = await create();
    await share(id, { visibility: 'public' });
    const viewer = (await (
      await request(`/api/app/cartoons/${id}`, { cookie: member })
    ).json()) as Cartoon;
    expect(viewer.canEdit).toBe(false);

    const patch = await request(`/api/app/cartoons/${id}`, {
      method: 'PATCH',
      json: { title: 'Hacked' },
      cookie: member,
    });
    expect(patch.status).toBe(403);
    expect((await share(id, { visibility: 'private' }, member)).status).toBe(
      403,
    );
    const del = await request(`/api/app/cartoons/${id}`, {
      method: 'DELETE',
      cookie: member,
    });
    expect(del.status).toBe(403);
    expect(await listed(owner)).toEqual(['Kana ja kettu']);
  });

  it('answers 404 to a user who can not watch the cartoon', async () => {
    const { id } = await create();
    const patch = await request(`/api/app/cartoons/${id}`, {
      method: 'PATCH',
      json: { title: 'Hacked' },
      cookie: outsider,
    });
    expect(patch.status).toBe(404);
  });

  it('requires a login for every change', async () => {
    const { id } = await create();
    await share(id, { visibility: 'public' });
    const patch = await request(`/api/app/cartoons/${id}`, {
      method: 'PATCH',
      json: { title: 'X' },
    });
    expect(patch.status).toBe(401);
    expect((await share(id, { visibility: 'private' }, '')).status).toBe(401);
    expect(
      (await request(`/api/app/cartoons/${id}`, { method: 'DELETE' })).status,
    ).toBe(401);
  });

  it('lets the owner delete the cartoon', async () => {
    const { id } = await create();
    const res = await request(`/api/app/cartoons/${id}`, {
      method: 'DELETE',
      cookie: owner,
    });
    expect(res.status).toBe(204);
    expect(await listed(owner)).toEqual([]);
  });
});

describe('content', () => {
  const content = {
    version: 1,
    scenes: [
      {
        id: 's1',
        background: 'meadow',
        backgroundActions: [{ id: 'b1', t: 0, clip: 'day' }],
        actors: [
          {
            id: 'a1',
            asset: { kind: 'character', id: 'boy' },
            at: { x: 100, y: 900 },
            facing: 1,
            scale: 1,
            actions: [
              { id: 'x1', t: 1.5, clip: 'walk', path: [{ x: 600, y: 950 }] },
            ],
          },
        ],
      },
    ],
  };

  const save = (id: string, json: unknown, cookie = owner) =>
    request(`/api/app/cartoons/${id}/content`, { method: 'PUT', json, cookie });
  const load = (id: string, cookie = owner) =>
    request(`/api/app/cartoons/${id}/content`, { cookie });

  it('starts with no scenes', async () => {
    const { id } = await create();
    expect(await (await load(id)).json()).toEqual({ version: 1, scenes: [] });
  });

  it('saves the scenes and gives them back', async () => {
    const { id } = await create();
    expect((await save(id, content)).status).toBe(204);
    expect(await (await load(id)).json()).toEqual(content);
  });

  it('refuses a save in an old format with 409', async () => {
    const { id } = await create();
    expect((await save(id, { version: 0, scenes: [] })).status).toBe(409);
  });

  it('refuses content that is not valid', async () => {
    const { id } = await create();
    const bad = { ...content, scenes: [{ ...content.scenes[0], actors: 'x' }] };
    expect((await save(id, bad)).status).toBe(400);
  });

  it('lets only the owner save, and hides private content', async () => {
    const { id } = await create();
    expect((await load(id, member)).status).toBe(404);
    expect((await save(id, content, member)).status).toBe(404);
    await share(id, { visibility: 'group', groupId });
    expect((await load(id, member)).status).toBe(200);
    expect((await save(id, content, member)).status).toBe(403);
  });
});

describe('cross-site requests', () => {
  it('refuses a form post from another site', async () => {
    // A form on another site can post text/plain without a CORS preflight.
    const res = await app.request('/api/app/cartoons', {
      method: 'POST',
      headers: {
        origin: 'https://evil.example',
        'content-type': 'text/plain',
        cookie: owner,
      },
      body: JSON.stringify({ title: 'X' }),
    });
    expect(res.status).toBe(403);
    expect(await listed(owner)).toEqual([]);
  });
});
