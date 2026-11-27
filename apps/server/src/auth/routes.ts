import { zValidator } from '@hono/zod-validator';
import { LoginRequest, type User } from '@toonhouse/api';
import type { Context } from 'hono';
import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';

import { isProduction } from '../config.ts';
import { sql } from '../db.ts';
import {
  clientIp,
  giveBackLoginAttempt,
  loginRetryAfterSeconds,
  takeLoginAttempt,
} from './login-limit.ts';
import { hashPassword, verifyPassword } from './password.ts';
import {
  createSession,
  deleteSession,
  getSession,
  sessionDays,
} from './sessions.ts';

export type AuthEnv = { Variables: { user: User | null } };
export type UserEnv = { Variables: { user: User } };

// The `__Host-` prefix makes the browser refuse the cookie unless it is Secure,
// has `Path=/` and has no `Domain`, so another subdomain can't set it. Browsers
// refuse such a cookie over plain HTTP, so development uses a plain name.
const cookieName = isProduction ? '__Host-session' : 'session';

// Verified against when the username does not exist, so that response time
// does not reveal which usernames exist.
const dummyHash = hashPassword(crypto.randomUUID());

/** Returns the session token from the cookie. */
export function getSessionToken(c: Context): string | undefined {
  return getCookie(c, cookieName);
}

/**
 * Sets `c.var.user` from the session cookie. When the server extends the
 * session, it sends the cookie again with the new expiry, because the browser
 * would otherwise drop the cookie 90 days after the login.
 */
export const sessionMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const token = getSessionToken(c);
  const session = token ? await getSession(token) : null;
  c.set('user', session?.user ?? null);
  if (token && session?.extended) setSessionCookie(c, token);
  await next();
});

/** Rejects requests without a logged-in user. The routes after it can rely on `c.var.user`. */
export const requireUser = createMiddleware<UserEnv>(async (c, next) => {
  if (!c.var.user) return c.json({ error: 'Unauthorized' }, 401);
  await next();
});

function setSessionCookie(c: Context, token: string) {
  setCookie(c, cookieName, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'Lax',
    path: '/',
    maxAge: sessionDays * 24 * 60 * 60,
  });
}

export const authRoutes = new Hono<AuthEnv>()
  .post('/login', zValidator('json', LoginRequest), async (c) => {
    const { username, password } = c.req.valid('json');
    if (!takeLoginAttempt(c, username)) {
      console.warn(
        `Too many login attempts for ${JSON.stringify(username)} from ${clientIp(c)}`,
      );
      c.header('retry-after', String(loginRetryAfterSeconds));
      return c.json({ error: 'Too many login attempts' }, 429);
    }
    const [row] = await sql<(User & { passwordHash: string })[]>`
      SELECT id, username, display_name, password_hash FROM users WHERE username = ${username}
    `;
    const valid = await verifyPassword(
      password,
      row?.passwordHash ?? (await dummyHash),
    );
    if (!row || !valid) {
      console.warn(
        `Failed login for ${JSON.stringify(username)} from ${clientIp(c)}`,
      );
      return c.json({ error: 'Invalid username or password' }, 401);
    }
    giveBackLoginAttempt(c, username);
    setSessionCookie(c, await createSession(row.id));
    return c.json({
      id: row.id,
      username: row.username,
      displayName: row.displayName,
    });
  })
  .post('/logout', async (c) => {
    const token = getSessionToken(c);
    if (token) await deleteSession(token);
    deleteCookie(c, cookieName, { path: '/', secure: isProduction });
    return c.body(null, 204);
  })
  .get('/me', (c) => c.json({ user: c.var.user }));
