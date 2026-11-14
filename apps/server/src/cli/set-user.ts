// Creates a user, or gives an existing user a new display name and password.
// The password is generated and printed once.
// Usage: pnpm set-user <username> <display name> [--sql]
// --sql prints an SQL statement for manual use instead of writing to the database.
import { parseArgs } from 'node:util';

import { generatePassword, hashPassword } from '../auth/password.ts';
import { sqlString } from './sql-literal.ts';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { sql: { type: 'boolean', default: false } },
});
const [username, displayName] = positionals.map((p) => p.trim());
if (!username || !displayName || positionals.length > 2) {
  console.error('Usage: pnpm set-user <username> <display name> [--sql]');
  process.exit(1);
}

const password = generatePassword();
const passwordHash = await hashPassword(password);

if (values.sql) {
  console.log(
    `INSERT INTO users (username, display_name, password_hash)\n` +
      `VALUES (${sqlString(username)}, ${sqlString(displayName)}, ${sqlString(passwordHash)})\n` +
      `ON CONFLICT (username) DO UPDATE\n` +
      `SET display_name = excluded.display_name, password_hash = excluded.password_hash,\n` +
      `    password_changed_at = now();`,
  );
} else {
  // Imported here, so that --sql works without a database.
  const { sql } = await import('../db.ts');
  await sql.begin(async (tx) => {
    const [user] = await tx<{ id: string }[]>`
      INSERT INTO users (username, display_name, password_hash)
      VALUES (${username}, ${displayName}, ${passwordHash})
      ON CONFLICT (username) DO UPDATE
      SET display_name = excluded.display_name, password_hash = excluded.password_hash,
          password_changed_at = now()
      RETURNING id
    `;
    // The old password no longer logs in, so the old logins end too.
    await tx`DELETE FROM sessions WHERE user_id = ${user!.id}`;
  });
  console.error(`Saved user ${username}`);
  await sql.end();
}
console.error(`Password: ${password}`);
