import type { Cartoon, Sharing } from '@toonhouse/api';
import { beforeEach, describe, expect, it } from 'vitest';

import { app } from '../app.ts';
import { sql } from '../db.ts';
import { login, origin, request } from '../test/api.ts';
import { createGroup, createUser, resetDatabase } from '../test/db.ts';
import { maxCartoonsPerUser } from './repository.ts';

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

  it('rejects a title that the database cannot store', async () => {
    const res = await request('/api/app/cartoons', {
      method: 'POST',
      json: { title: 'Kana\u0000' },
      cookie: owner,
    });
    expect(res.status).toBe(400);
  });

  it('refuses a cartoon over the limit of the user', async () => {
    const first = await create();
    await sql`
      INSERT INTO cartoons (owner_id, title, content)
      SELECT ${first.owner.id}, 'X', '{"version": 1, "scenes": []}'
      FROM generate_series(2, ${maxCartoonsPerUser})
    `;
    const res = await request('/api/app/cartoons', {
      method: 'POST',
      json: { title: 'X' },
      cookie: owner,
    });
    expect(res.status).toBe(409);
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
        background: 'sunny/meadow',
        sky: { start: 18, changes: [{ id: 'c1', t: 2, length: 4, to: 22 }] },
        weather: { start: { rain: 0.5 }, changes: [] },
        actors: [
          {
            id: 'a1',
            asset: { kind: 'character', id: 'sunny/blond-boy' },
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

  const editor = crypto.randomUUID();
  const save = (id: string, json: unknown, cookie = owner, revision = 0) =>
    request(`/api/app/cartoons/${id}/content`, {
      method: 'PUT',
      json: { revision, editor, content: json },
      cookie,
    });
  const load = (id: string, cookie = owner) =>
    request(`/api/app/cartoons/${id}/content`, { cookie });

  it('starts with no scenes', async () => {
    const { id } = await create();
    expect(await (await load(id)).json()).toEqual({
      revision: 0,
      editor: null,
      content: { version: 1, cast: [], scenes: [] },
    });
  });

  it('saves the scenes and gives them back', async () => {
    const { id } = await create();
    const res = await save(id, content);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ revision: 1 });
    expect(await (await load(id)).json()).toEqual({
      revision: 1,
      editor,
      content,
    });
  });

  // A key with an underscore also checks that the keys in the JSON keep their
  // names.
  it('keeps the fields that it does not know', async () => {
    const { id } = await create();
    const newer = {
      ...content,
      future: true,
      scenes: [{ ...content.scenes[0], new_field: 'calm' }],
    };
    expect((await save(id, newer)).status).toBe(200);
    expect(
      ((await (await load(id)).json()) as { content: unknown }).content,
    ).toEqual(newer);
  });

  it('refuses a save of an old revision with 409', async () => {
    const { id } = await create();
    expect((await save(id, content, owner, 0)).status).toBe(200);
    const stale = await save(id, { ...content, scenes: [] }, owner, 0);
    expect(stale.status).toBe(409);
    expect(await stale.json()).toMatchObject({ reason: 'revision' });
    expect(
      ((await (await load(id)).json()) as { content: unknown }).content,
    ).toEqual(content);
  });

  it('refuses a save in an old format with 409', async () => {
    const { id } = await create();
    const res = await save(id, { version: 0, scenes: [] });
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ reason: 'version' });
  });

  it('refuses content that is not valid', async () => {
    const { id } = await create();
    const bad = { ...content, scenes: [{ ...content.scenes[0], actors: 'x' }] };
    expect((await save(id, bad)).status).toBe(400);
  });

  // PostgreSQL can't store these in jsonb, so without the check the save fails
  // with 500.
  it('refuses text that the database cannot store', async () => {
    const { id } = await create();
    const scene = content.scenes[0]!;
    const withName = (name: string) => ({
      ...content,
      cast: [
        {
          id: 'm1',
          name,
          asset: { kind: 'character', id: 'sunny/blond-boy' },
          settings: {},
        },
      ],
    });
    expect((await save(id, withName('a\u0000b'))).status).toBe(400);
    expect((await save(id, withName('half \ud83d'))).status).toBe(400);
    const unknown = { ...content, scenes: [{ ...scene, note: '\udc00' }] };
    expect((await save(id, unknown)).status).toBe(400);
    const key = { ...content, scenes: [{ ...scene, ['a\u0000']: 1 }] };
    expect((await save(id, key)).status).toBe(400);
    expect((await save(id, withName('Grandma 😀'))).status).toBe(200);
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

describe('preview image', () => {
  // Only the first bytes matter to the server.
  const webp = new Uint8Array([
    ...new TextEncoder().encode('RIFF'),
    1,
    2,
    3,
    4,
    ...new TextEncoder().encode('WEBPVP8 '),
  ]);
  const png = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3,
  ]);

  const upload = (id: string, body: Uint8Array, cookie = owner) =>
    request(`/api/app/cartoons/${id}/preview`, {
      method: 'PUT',
      body,
      headers: { 'content-type': 'image/webp' },
      cookie,
    });
  const preview = (id: string, cookie?: string) =>
    request(`/api/app/cartoons/${id}/preview`, cookie ? { cookie } : {});

  it('has no preview at first', async () => {
    const cartoon = await create();
    expect(cartoon.previewUpdatedAt).toBeNull();
    expect((await preview(cartoon.id, owner)).status).toBe(404);
  });

  it('stores the image and serves it with the type from its bytes', async () => {
    const { id, updatedAt } = await create();
    const res = await upload(id, png);
    expect(res.status).toBe(200);
    const cartoon = (await res.json()) as Cartoon;
    expect(cartoon.previewUpdatedAt).not.toBeNull();
    // Setting the preview doesn't count as an edit.
    expect(cartoon.updatedAt).toBe(updatedAt);

    const got = await preview(id, owner);
    expect(got.headers.get('content-type')).toBe('image/png');
    expect(new Uint8Array(await got.arrayBuffer())).toEqual(png);
  });

  it('replaces the old image', async () => {
    const { id } = await create();
    await upload(id, png);
    await upload(id, webp);
    const got = await preview(id, owner);
    expect(got.headers.get('content-type')).toBe('image/webp');
    expect(new Uint8Array(await got.arrayBuffer())).toEqual(webp);
  });

  it('refuses bytes that are not a WebP or PNG image', async () => {
    const { id } = await create();
    const svg = new TextEncoder().encode('<svg onload="alert(1)"/>');
    expect((await upload(id, svg)).status).toBe(400);
  });

  it('shows the preview only to users who can watch the cartoon', async () => {
    const { id } = await create();
    await upload(id, webp);
    expect((await preview(id, member)).status).toBe(404);
    expect((await preview(id)).status).toBe(404);
    await share(id, { visibility: 'public' });
    expect((await preview(id)).status).toBe(200);
  });

  it('lets only the owner set the preview', async () => {
    const { id } = await create();
    expect((await upload(id, webp, member)).status).toBe(404);
    await share(id, { visibility: 'public' });
    expect((await upload(id, webp, member)).status).toBe(403);
    expect((await upload(id, webp, '')).status).toBe(401);
  });

  it('caches the image only for a URL with a version', async () => {
    const { id } = await create();
    await upload(id, webp);
    expect((await preview(id, owner)).headers.get('cache-control')).toBe(
      'private, no-cache',
    );
    const versioned = await request(`/api/app/cartoons/${id}/preview?v=1`, {
      cookie: owner,
    });
    expect(versioned.headers.get('cache-control')).toContain('immutable');
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

  it('accepts a change from the public URL without Sec-Fetch-Site', async () => {
    // Behind the proxy, the request URL is http://, so only PUBLIC_URL matches.
    // Safari before 16.4 sends no Sec-Fetch-Site.
    const res = await app.request('/api/app/cartoons', {
      method: 'POST',
      headers: {
        origin,
        'content-type': 'text/plain',
        cookie: owner,
      },
      body: JSON.stringify({ title: 'X' }),
    });
    expect(res.status).not.toBe(403);
  });
});
