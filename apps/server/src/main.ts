import { serve } from '@hono/node-server';

import { app } from './app.ts';
import { port } from './config.ts';
import { migrate } from './migrate.ts';

await migrate();

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Listening on http://localhost:${info.port}`);
});
