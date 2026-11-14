import { hashPassword } from '../auth/password.ts';
import { sql } from '../db.ts';

/** Empties every table except `migrations`. Refuses to run outside a test database. */
export async function resetDatabase(): Promise<void> {
  const [row] = await sql<
    { name: string }[]
  >`SELECT current_database() AS name`;
  if (!row?.name.endsWith('_test')) {
    throw new Error(`Refusing to empty database ${row?.name}`);
  }
  const tables = await sql<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'migrations'
  `;
  if (!tables.length) return;
  await sql`TRUNCATE ${sql(tables.map((t) => t.tablename))} CASCADE`;
}

/** Adds a user and returns its id. */
export async function createUser(
  username: string,
  password = 'secret',
): Promise<string> {
  const [row] = await sql<{ id: string }[]>`
    INSERT INTO users (username, display_name, password_hash)
    VALUES (${username}, ${`${username} display`}, ${await hashPassword(password)})
    RETURNING id
  `;
  return row!.id;
}

/** Adds a group with the given members and returns its id. */
export async function createGroup(
  name: string,
  memberIds: string[],
): Promise<string> {
  const [row] = await sql<
    { id: string }[]
  >`INSERT INTO groups (name) VALUES (${name}) RETURNING id`;
  for (const userId of memberIds) {
    await sql`INSERT INTO group_members (group_id, user_id) VALUES (${row!.id}, ${userId})`;
  }
  return row!.id;
}
