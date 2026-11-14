import path from 'node:path';

import { serveStatic } from '@hono/node-server/serve-static';
import { Hono, type MiddlewareHandler } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { csrf } from 'hono/csrf';

import { type AuthEnv, authRoutes, sessionMiddleware } from './auth/routes.ts';
import { cartoonRoutes } from './cartoons/routes.ts';
import { sql } from './db.ts';
import { groupRoutes } from './groups/routes.ts';
import { profileRoutes } from './profile/routes.ts';

/** The build of the web app. */
const webDir =
  process.env.WEB_DIR ?? path.join(import.meta.dirname, '../../web/dist');

export const app = new Hono<AuthEnv>();

app.get('/health', async (c) => {
  await sql`SELECT 1`;
  return c.json({ status: 'ok' });
});

// Without a limit, a few large requests without a login could use up the memory
// of the server.
app.use(
  '/api/*',
  bodyLimit({
    maxSize: 1024 * 1024,
    onError: (c) => c.json({ error: 'Request body is too large' }, 413),
  }),
);

// The API of the web app, which authenticates with the session cookie.
app.use('/api/app/*', csrf(), sessionMiddleware);
app.route('/api/app/auth', authRoutes);
app.route('/api/app/profile', profileRoutes);
app.route('/api/app/groups', groupRoutes);
app.route('/api/app/cartoons', cartoonRoutes);

app.all('/api/*', (c) => c.notFound());

// Built files have a content hash in the file name, so they never change.
app.use(
  '/assets/*',
  cacheControl('public, max-age=31536000, immutable'),
  serveStatic({ root: webDir }),
);
app.all('/assets/*', (c) => c.notFound());

// The web app loads version.json to see whether a new version is deployed, and
// then loads index.html again to get it. Neither may come from a cache.
app.get(
  '/version.json',
  cacheControl('no-cache'),
  serveStatic({ root: webDir }),
);
app.all('/version.json', (c) => c.notFound());
app.use('/*', cacheControl('no-cache'), serveStatic({ root: webDir }));
// The routes of the web app get the app shell.
app.get(
  '*',
  cacheControl('no-cache'),
  serveStatic({ path: path.join(webDir, 'index.html') }),
);

/**
 * Sets `cache-control` on successful responses. The `onFound` option of
 * `serveStatic` runs after the response is built, so headers set there are lost.
 */
function cacheControl(value: string): MiddlewareHandler {
  return async (c, next) => {
    await next();
    if (c.res.ok) c.header('cache-control', value);
  };
}
