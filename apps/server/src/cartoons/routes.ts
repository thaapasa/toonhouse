import { zValidator } from '@hono/zod-validator';
import {
  CreateCartoonRequest,
  Sharing,
  UpdateCartoonRequest,
} from '@toonhouse/api';
import { type Context, Hono } from 'hono';
import { z } from 'zod';

import { type AuthEnv, requireUser } from '../auth/routes.ts';
import { isMember } from '../groups/repository.ts';
import {
  createCartoon,
  deleteCartoon,
  getCartoon,
  listCartoons,
  setSharing,
  setTitle,
} from './repository.ts';

const IdParam = z.object({ id: z.uuid() });

// The same response for a cartoon that doesn't exist and for one that the user
// can't watch, so that the user doesn't learn that it exists.
const notFound = (c: Context) => c.json({ error: 'Not found' }, 404);

/**
 * Tells why an owner-only change to a cartoon matched nothing: the cartoon is
 * not there for the user, or the user can watch it but is not the owner.
 */
async function refuse(c: Context, id: string, userId: string) {
  return (await getCartoon(id, userId))
    ? c.json({ error: 'Forbidden' }, 403)
    : notFound(c);
}

/** Anyone can list and watch the cartoons they can see. Only the owner can change a cartoon. */
export const cartoonRoutes = new Hono<AuthEnv>()
  .get('/', async (c) => c.json(await listCartoons(c.var.user?.id ?? null)))
  .get(
    '/:id',
    zValidator('param', IdParam, (r, c) =>
      r.success ? undefined : notFound(c),
    ),
    async (c) => {
      const cartoon = await getCartoon(
        c.req.valid('param').id,
        c.var.user?.id ?? null,
      );
      return cartoon ? c.json(cartoon) : notFound(c);
    },
  )
  .post(
    '/',
    requireUser,
    zValidator('json', CreateCartoonRequest),
    async (c) => {
      const userId = c.var.user.id;
      const id = await createCartoon(userId, c.req.valid('json').title);
      return c.json(await getCartoon(id, userId), 201);
    },
  )
  .patch(
    '/:id',
    requireUser,
    zValidator('param', IdParam),
    zValidator('json', UpdateCartoonRequest),
    async (c) => {
      const { id } = c.req.valid('param');
      const userId = c.var.user.id;
      if (!(await setTitle(id, userId, c.req.valid('json').title)))
        return refuse(c, id, userId);
      return c.json(await getCartoon(id, userId));
    },
  )
  .put(
    '/:id/sharing',
    requireUser,
    zValidator('param', IdParam),
    zValidator('json', Sharing),
    async (c) => {
      const { id } = c.req.valid('param');
      const userId = c.var.user.id;
      const sharing = c.req.valid('json');
      if (
        sharing.visibility === 'group' &&
        !(await isMember(userId, sharing.groupId))
      ) {
        return c.json({ error: 'Not a member of the group' }, 400);
      }
      if (!(await setSharing(id, userId, sharing)))
        return refuse(c, id, userId);
      return c.json(await getCartoon(id, userId));
    },
  )
  .delete('/:id', requireUser, zValidator('param', IdParam), async (c) => {
    const { id } = c.req.valid('param');
    const userId = c.var.user.id;
    if (!(await deleteCartoon(id, userId))) return refuse(c, id, userId);
    return c.body(null, 204);
  });
