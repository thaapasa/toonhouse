/** The database that `docker compose up` starts at the repo root. */
export const devDatabaseUrl =
  'postgres://toonhouse:toonhouse@localhost:10732/toonhouse';

export const isProduction = process.env.NODE_ENV === 'production';

export const port = Number(process.env.SERVER_PORT ?? 10700);

/** In production, `DATABASE_URL` must be set, so that the server never uses the dev database. */
export function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (url) return url;
  if (isProduction) throw new Error('DATABASE_URL is not set');
  return devDatabaseUrl;
}

/**
 * The origin of the public address of the app, such as
 * `https://piirretyt.pomeranssi.fi`, from `PUBLIC_URL`. The CSRF check compares
 * the `Origin` of a change to it, because behind a proxy the server sees its own
 * URL as `http://`. Without `PUBLIC_URL`, the check compares to the URL of the
 * request, which works in development. In production, `PUBLIC_URL` must be set.
 */
export function publicOrigin(): string | undefined {
  const value = process.env.PUBLIC_URL;
  if (!value) {
    if (isProduction) throw new Error('PUBLIC_URL is not set');
    return undefined;
  }
  const url = new URL(value);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`PUBLIC_URL must be an http or https address: ${value}`);
  }
  return url.origin;
}
