// Creates a user, or gives an existing user a new display name and password.
// The password is generated and printed once.
// Usage: pnpm set-user <username> <display name> [--sql]
//        pnpm set-user --prompt [--sql]
// --sql prints an SQL statement for manual use instead of writing to the database.
// --prompt asks for the username, the display name and the password on the
// terminal. The password doesn't go on the command line, where other processes
// could see it. If it is left empty, the command generates one.
import { parseArgs } from 'node:util';

import { generatePassword, hashPassword } from '../auth/password.ts';
import { ask, askSecret } from './prompt.ts';
import { sqlString } from './sql-literal.ts';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    sql: { type: 'boolean', default: false },
    prompt: { type: 'boolean', default: false },
  },
});

// The login form takes at most 200 characters.
const maxPasswordLength = 200;

const { username, displayName, password, generated } = values.prompt
  ? await askUser()
  : fromArgs();

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
if (generated) console.error(`Password: ${password}`);

function fromArgs() {
  const [username, displayName] = positionals.map((p) => p.trim());
  if (!username || !displayName || positionals.length > 2) {
    console.error(
      'Usage: pnpm set-user <username> <display name> [--sql]\n' +
        '       pnpm set-user --prompt [--sql]',
    );
    process.exit(1);
  }
  return {
    username,
    displayName,
    password: generatePassword(),
    generated: true,
  };
}

async function askUser() {
  if (positionals.length > 0) {
    console.error('--prompt asks for the username and the display name');
    process.exit(1);
  }
  let username = '';
  while (!username) username = await ask('Username: ');
  let displayName = '';
  while (!displayName) displayName = await ask('Display name: ');
  for (;;) {
    const password = await askSecret('Password (empty to generate one): ');
    if (!password) {
      return {
        username,
        displayName,
        password: generatePassword(),
        generated: true,
      };
    }
    if (password.length > maxPasswordLength) {
      console.error(
        `The password can have at most ${maxPasswordLength} characters.`,
      );
      continue;
    }
    if ((await askSecret('Password again: ')) === password) {
      return { username, displayName, password, generated: false };
    }
    console.error('The passwords differ. Try again.');
  }
}
