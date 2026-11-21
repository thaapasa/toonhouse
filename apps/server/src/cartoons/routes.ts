import { zValidator } from '@hono/zod-validator';
import {
  CartoonContent,
  CreateCartoonRequest,
  SaveContentRequest,
  Sharing,
  UpdateCartoonRequest,
} from '@toonhouse/api';
import { CARTOON_VERSION } from '@toonhouse/model';
import { type Context, Hono } from 'hono';
import { z } from 'zod';

import { type AuthEnv, requireUser } from '../auth/routes.ts';
import { isMember } from '../groups/repository.ts';
import {
  createCartoon,
  deleteCartoon,
  getCartoon,
  getContent,
  getPreview,
  listCartoons,
  type PreviewType,
  setContent,
  setPreview,
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

/**
 * The type of a preview image, from its first bytes. The server checks the
 * bytes instead of trusting the `content-type` of the upload, because it sends
 * the image back to other users with that type.
 */
function previewType(bytes: Uint8Array): PreviewType | null {
  const ascii = (from: number, to: number) =>
    String.fromCharCode(...bytes.subarray(from, to));
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  if (bytes[0] === 0x89 && ascii(1, 8) === 'PNG\r\n\x1a\n') return 'image/png';
  return null;
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
      if (!id) return c.json({ error: 'Too many cartoons' }, 409);
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
  .get(
    '/:id/content',
    zValidator('param', IdParam, (r, c) =>
      r.success ? undefined : notFound(c),
    ),
    async (c) => {
      const content = await getContent(
        c.req.valid('param').id,
        c.var.user?.id ?? null,
      );
      return content ? c.json(content) : notFound(c);
    },
  )
  // A web app that knows an older format gets 409, and it then loads the new
  // version of the web app.
  .put(
    '/:id/content',
    requireUser,
    zValidator('param', IdParam),
    zValidator('json', SaveContentRequest),
    async (c) => {
      const { id } = c.req.valid('param');
      const userId = c.var.user.id;
      const body = c.req.valid('json');
      if (body.version !== CARTOON_VERSION) {
        return c.json({ error: 'Old version of the cartoon format' }, 409);
      }
      const content = CartoonContent.safeParse(body);
      if (!content.success) {
        return c.json({ error: 'Invalid content' }, 400);
      }
      if (!(await setContent(id, userId, content.data)))
        return refuse(c, id, userId);
      return c.body(null, 204);
    },
  )
  // The web app adds the time of the preview to the URL, so that a new preview
  // gets a new URL and the browser can keep the old one.
  .get(
    '/:id/preview',
    zValidator('param', IdParam, (r, c) =>
      r.success ? undefined : notFound(c),
    ),
    async (c) => {
      const preview = await getPreview(
        c.req.valid('param').id,
        c.var.user?.id ?? null,
      );
      if (!preview) return notFound(c);
      return c.body(preview.image, 200, {
        'content-type': preview.contentType,
        'x-content-type-options': 'nosniff',
        // Private, because the cartoon may be visible only to some users.
        'cache-control': c.req.query('v')
          ? 'private, max-age=31536000, immutable'
          : 'private, no-cache',
      });
    },
  )
  .put('/:id/preview', requireUser, zValidator('param', IdParam), async (c) => {
    const { id } = c.req.valid('param');
    const userId = c.var.user.id;
    const image = new Uint8Array(await c.req.arrayBuffer());
    const type = previewType(image);
    if (!type) return c.json({ error: 'Not a WebP or PNG image' }, 400);
    if (!(await setPreview(id, userId, image, type)))
      return refuse(c, id, userId);
    return c.json(await getCartoon(id, userId));
  })
  .delete('/:id', requireUser, zValidator('param', IdParam), async (c) => {
    const { id } = c.req.valid('param');
    const userId = c.var.user.id;
    if (!(await deleteCartoon(id, userId))) return refuse(c, id, userId);
    return c.body(null, 204);
  });
