import path from 'node:path';

import { serveStatic } from '@hono/node-server/serve-static';
import { type Context, Hono, type MiddlewareHandler } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { csrf } from 'hono/csrf';
import { secureHeaders } from 'hono/secure-headers';

import { type AuthEnv, authRoutes, sessionMiddleware } from './auth/routes.ts';
import { cartoonRoutes } from './cartoons/routes.ts';
import { sql } from './db.ts';
import { groupRoutes } from './groups/routes.ts';
import { profileRoutes } from './profile/routes.ts';

/** The build of the web app. */
const webDir =
  process.env.WEB_DIR ?? path.join(import.meta.dirname, '../../web/dist');

export const app = new Hono<AuthEnv>();

// The web app draws inline SVG with style attributes, adds the `@font-face`
// rules in a `<style>` element, and makes the preview image from a `blob:` URL
// with the fonts as `data:` URLs. Browsers ignore HSTS over plain HTTP, so it
// does no harm in development.
app.use(
  secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      fontSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
    },
    xFrameOptions: 'DENY',
  }),
);

// The API answers depend on the session, and a cartoon can stop being public at
// any time, so no cache may keep them. A route can set its own value, as the
// preview image does.
app.use('/api/*', async (c, next) => {
  await next();
  if (!c.res.headers.has('cache-control'))
    c.header('cache-control', 'no-store');
});

app.get('/health', async (c) => {
  await sql`SELECT 1`;
  return c.json({ status: 'ok' });
});

// Without a limit, a few large requests without a login could use up the memory
// of the server. The content of a cartoon can be much larger than the other
// requests, so its save has a limit of its own.
const tooLarge = (c: Context) =>
  c.json({ error: 'Request body is too large' }, 413);
const smallBody = bodyLimit({ maxSize: 1024 * 1024, onError: tooLarge });
const contentBody = bodyLimit({ maxSize: 10 * 1024 * 1024, onError: tooLarge });
app.use('/api/*', (c, next) =>
  c.req.method === 'PUT' &&
  /^\/api\/app\/cartoons\/[^/]+\/content$/.test(c.req.path)
    ? contentBody(c, next)
    : smallBody(c, next),
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
