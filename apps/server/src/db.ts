import postgres from 'postgres';

import { databaseUrl } from './config.ts';

export const sql = postgres(databaseUrl(), {
  transform: postgres.camel,
  onnotice: () => {},
});
