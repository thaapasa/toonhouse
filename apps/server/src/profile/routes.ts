import { zValidator } from '@hono/zod-validator';
import { ResetPasswordRequest, UpdateProfileRequest } from '@toonhouse/api';
import { Hono } from 'hono';

import {
  giveBackPasswordCheck,
  loginRetryAfterSeconds,
  takePasswordCheck,
} from '../auth/login-limit.ts';
import { type AuthEnv, getSessionToken, requireUser } from '../auth/routes.ts';
import {
  checkPassword,
  getProfile,
  resetPassword,
  setDisplayName,
} from './repository.ts';

export const profileRoutes = new Hono<AuthEnv>()
  .use(requireUser)
  .get('/', async (c) => {
    const profile = await getProfile(c.var.user.id);
    return profile ? c.json(profile) : c.json({ error: 'Not found' }, 404);
  })
  .patch('/', zValidator('json', UpdateProfileRequest), async (c) => {
    const user = await setDisplayName(
      c.var.user.id,
      c.req.valid('json').displayName,
    );
    return user ? c.json(user) : c.json({ error: 'Not found' }, 404);
  })
  .post('/password', zValidator('json', ResetPasswordRequest), async (c) => {
    const userId = c.var.user.id;
    if (!takePasswordCheck(userId)) {
      c.header('retry-after', String(loginRetryAfterSeconds));
      return c.json({ error: 'Too many attempts' }, 429);
    }
    if (!(await checkPassword(userId, c.req.valid('json').currentPassword))) {
      // 403 and not 401, so that the client can tell a wrong password from a lost session.
      return c.json({ error: 'Wrong password' }, 403);
    }
    giveBackPasswordCheck(userId);
    return c.json({
      password: await resetPassword(userId, getSessionToken(c)!),
    });
  });
