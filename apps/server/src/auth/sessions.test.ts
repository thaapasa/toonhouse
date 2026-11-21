import { beforeEach, describe, expect, it } from 'vitest';

import { sql } from '../db.ts';
import { createUser, resetDatabase } from '../test/db.ts';
import { createSession, deleteSession, getSession } from './sessions.ts';
import { hashToken } from './tokens.ts';

let userId: string;

beforeEach(async () => {
  await resetDatabase();
  userId = await createUser('artist');
});

async function setExpiry(token: string, days: number) {
  await sql`
    UPDATE sessions SET expires_at = now() + ${days} * interval '1 day'
    WHERE token_hash = ${hashToken(token)}
  `;
}

async function daysLeft(token: string): Promise<number> {
  const [row] = await sql<{ days: number }[]>`
    SELECT extract(epoch FROM expires_at - now()) / 86400 AS days
    FROM sessions WHERE token_hash = ${hashToken(token)}
  `;
  return Number(row!.days);
}

describe('sessions', () => {
  it('returns the user of a session', async () => {
    const token = await createSession(userId);
    expect(await getSession(token)).toEqual({
      user: { id: userId, username: 'artist', displayName: 'artist display' },
      extended: false,
    });
  });

  it('stores only a hash of the token', async () => {
    const token = await createSession(userId);
    const [row] = await sql<
      { tokenHash: Buffer }[]
    >`SELECT token_hash FROM sessions`;
    expect(row!.tokenHash.equals(hashToken(token))).toBe(true);
    expect(row!.tokenHash.toString('base64url')).not.toBe(token);
  });

  it('returns null for an unknown token', async () => {
    expect(await getSession('nope')).toBeNull();
  });

  it('returns null for an expired session', async () => {
    const token = await createSession(userId);
    await setExpiry(token, -1);
    expect(await getSession(token)).toBeNull();
  });

  it('extends a session that was last extended over a day ago', async () => {
    const token = await createSession(userId);
    await setExpiry(token, 80);
    expect((await getSession(token))?.extended).toBe(true);
    expect(await daysLeft(token)).toBeCloseTo(90, 1);
  });

  it('does not extend a session on every request', async () => {
    const token = await createSession(userId);
    await setExpiry(token, 89.5);
    expect((await getSession(token))?.extended).toBe(false);
    expect(await daysLeft(token)).toBeCloseTo(89.5, 1);
  });

  it('ends a deleted session', async () => {
    const token = await createSession(userId);
    await deleteSession(token);
    expect(await getSession(token)).toBeNull();
  });

  it('removes expired sessions when a new session is created', async () => {
    const old = await createSession(userId);
    await setExpiry(old, -1);
    await createSession(userId);
    const [row] = await sql<{ count: string }[]>`SELECT count(*) FROM sessions`;
    expect(Number(row!.count)).toBe(1);
  });
});
