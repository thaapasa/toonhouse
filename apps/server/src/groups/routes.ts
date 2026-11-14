import { Hono } from 'hono';

import { type AuthEnv, requireUser } from '../auth/routes.ts';
import { getUserGroups } from './repository.ts';

/** The groups of the logged-in user, for the profile page and for sharing a cartoon. */
export const groupRoutes = new Hono<AuthEnv>()
  .use(requireUser)
  .get('/', async (c) => c.json(await getUserGroups(c.var.user.id)));
