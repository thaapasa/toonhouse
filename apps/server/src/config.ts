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
