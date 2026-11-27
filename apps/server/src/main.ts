import { serve } from '@hono/node-server';

import { app } from './app.ts';
import { port } from './config.ts';
import { sql } from './db.ts';
import { migrate } from './migrate.ts';

// The time that the requests in progress get to finish when the server stops.
const stopTimeoutMs = 5000;

await migrate();

const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Listening on http://localhost:${info.port}`);
});

// In the container, Node is PID 1, which gets no default handler for the
// signals. Without these, `docker stop` waits 10 seconds and then kills it.
let stopping = false;
async function stop(signal: string) {
  if (stopping) return;
  stopping = true;
  console.log(`Got ${signal}, stopping`);
  setTimeout(() => {
    console.error('The server did not stop in time, exiting');
    process.exit(1);
  }, stopTimeoutMs).unref();
  await new Promise((resolve) => server.close(resolve));
  await sql.end({ timeout: stopTimeoutMs / 1000 });
  process.exit(0);
}
process.on('SIGTERM', () => void stop('SIGTERM'));
process.on('SIGINT', () => void stop('SIGINT'));
