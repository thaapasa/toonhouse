import type { Profile } from '@toonhouse/api';
import { beforeEach, describe, expect, it } from 'vitest';

import { login, request } from '../test/api.ts';
import { createUser, resetDatabase } from '../test/db.ts';

let cookie: string;

beforeEach(async () => {
  await resetDatabase();
  await createUser('artist');
  cookie = await login('artist');
});

function resetPassword(json: unknown, session = cookie) {
  return request('/api/app/profile/password', {
    method: 'POST',
    json,
    cookie: session,
  });
}

function patchProfile(json: unknown, session = cookie) {
  return request('/api/app/profile', {
    method: 'PATCH',
    json,
    cookie: session,
  });
}

describe('authentication', () => {
  it('rejects requests without a session', async () => {
    expect((await request('/api/app/profile')).status).toBe(401);
    expect((await patchProfile({ displayName: 'X' }, '')).status).toBe(401);
    expect(
      (await resetPassword({ currentPassword: 'secret' }, '')).status,
    ).toBe(401);
  });

  it('rejects a reset with a wrong current password and changes nothing', async () => {
    const res = await resetPassword({ currentPassword: 'wrong' });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Wrong password' });
    await login('artist');
  });
});

describe('validation', () => {
  it('rejects an empty display name', async () => {
    for (const displayName of ['', '   ']) {
      expect((await patchProfile({ displayName })).status).toBe(400);
    }
  });

  it('rejects a missing current password', async () => {
    expect((await resetPassword({})).status).toBe(400);
    expect((await resetPassword({ currentPassword: '' })).status).toBe(400);
  });
});

describe('profile', () => {
  it('returns the profile and changes the display name', async () => {
    const res = await patchProfile({ displayName: ' Piirtäjä ' });
    expect(await res.json()).toMatchObject({
      username: 'artist',
      displayName: 'Piirtäjä',
    });

    const profile = (await (
      await request('/api/app/profile', { cookie })
    ).json()) as Profile;
    expect(profile).toMatchObject({
      username: 'artist',
      displayName: 'Piirtäjä',
    });
  });

  it('resets the password, so that only the new one logs in', async () => {
    const other = await login('artist');
    const res = await resetPassword({ currentPassword: 'secret' });
    expect(res.status).toBe(200);
    const { password } = (await res.json()) as { password: string };
    expect(password).toMatch(/^[A-Za-z0-9]{20}$/);

    await login('artist', password);
    await expect(login('artist', 'secret')).rejects.toThrow('401');

    // The session that reset the password stays, and the other sessions end.
    const me = await request('/api/app/auth/me', { cookie });
    expect(await me.json()).toMatchObject({ user: { username: 'artist' } });
    const otherMe = await request('/api/app/auth/me', { cookie: other });
    expect(await otherMe.json()).toEqual({ user: null });
  });
});
