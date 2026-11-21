import postgres from 'postgres';

import { databaseUrl } from './config.ts';

export const sql = postgres(databaseUrl(), {
  // Only the column names, because `postgres.camel` would also rename the
  // keys inside the JSON of a cartoon.
  transform: { column: postgres.camel.column },
  onnotice: () => {},
});
