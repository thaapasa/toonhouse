import type { User } from '@toonhouse/api';

import { sql } from '../db.ts';
import { hashToken, newToken } from './tokens.ts';

export const sessionDays = 90;
// Extend the session at most once a day, not on every request.
const extendAfterMs = 24 * 60 * 60 * 1000;

/** Creates a session and returns the token for the cookie. */
export async function createSession(userId: string): Promise<string> {
  const token = newToken();
  await sql`DELETE FROM sessions WHERE expires_at < now()`;
  await sql`
    INSERT INTO sessions (token_hash, user_id, expires_at)
    VALUES (${hashToken(token)}, ${userId}, now() + make_interval(days => ${sessionDays}))
  `;
  return token;
}

/**
 * Returns the user of a valid session, and extends the session. `extended`
 * tells whether it did, so that the cookie can be extended too.
 */
export async function getSession(
  token: string,
): Promise<{ user: User; extended: boolean } | null> {
  const tokenHash = hashToken(token);
  const [row] = await sql<(User & { expiresAt: Date })[]>`
    SELECT u.id, u.username, u.display_name, s.expires_at
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ${tokenHash} AND s.expires_at > now()
  `;
  if (!row) return null;

  const fullExpiry = Date.now() + sessionDays * 24 * 60 * 60 * 1000;
  const extended = fullExpiry - row.expiresAt.getTime() > extendAfterMs;
  if (extended) {
    await sql`
      UPDATE sessions SET expires_at = now() + make_interval(days => ${sessionDays})
      WHERE token_hash = ${tokenHash}
    `;
  }
  const user = {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
  };
  return { user, extended };
}

export async function deleteSession(token: string): Promise<void> {
  await sql`DELETE FROM sessions WHERE token_hash = ${hashToken(token)}`;
}
