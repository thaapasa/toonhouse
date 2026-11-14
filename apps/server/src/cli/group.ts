// Manages the groups that users can share cartoons with.
// Usage:
//   pnpm group list
//   pnpm group create <group>
//   pnpm group add <group> <username>
//   pnpm group remove <group> <username>
import { sql } from '../db.ts';

const usage = `Usage:
  pnpm group list
  pnpm group create <group>
  pnpm group add <group> <username>
  pnpm group remove <group> <username>`;

const [command, group, username, ...rest] = process.argv.slice(2);

try {
  process.exitCode = await run();
} finally {
  await sql.end();
}

async function run(): Promise<number> {
  if (rest.length) return fail(usage);
  if (command === 'list' && !group) {
    const rows = await sql<{ name: string; members: string[] }[]>`
      SELECT g.name, coalesce(array_agg(u.username ORDER BY u.username)
        FILTER (WHERE u.username IS NOT NULL), '{}') AS members
      FROM groups g
      LEFT JOIN group_members m ON m.group_id = g.id
      LEFT JOIN users u ON u.id = m.user_id
      GROUP BY g.id ORDER BY g.name
    `;
    for (const row of rows)
      console.log(`${row.name}: ${row.members.join(', ')}`);
    return 0;
  }
  if (command === 'create' && group && !username) {
    await sql`INSERT INTO groups (name) VALUES (${group})`;
    console.log(`Created group ${group}`);
    return 0;
  }
  if ((command === 'add' || command === 'remove') && group && username) {
    const [ids] = await sql<
      { groupId: string | null; userId: string | null }[]
    >`
      SELECT (SELECT id FROM groups WHERE name = ${group}) AS group_id,
        (SELECT id FROM users WHERE username = ${username}) AS user_id
    `;
    if (!ids?.groupId) return fail(`No group ${group}`);
    if (!ids.userId) return fail(`No user ${username}`);
    if (command === 'add') {
      await sql`
        INSERT INTO group_members (group_id, user_id) VALUES (${ids.groupId}, ${ids.userId})
        ON CONFLICT DO NOTHING
      `;
      console.log(`Added ${username} to ${group}`);
    } else {
      await sql`
        DELETE FROM group_members WHERE group_id = ${ids.groupId} AND user_id = ${ids.userId}
      `;
      console.log(`Removed ${username} from ${group}`);
    }
    return 0;
  }
  return fail(usage);
}

function fail(message: string): number {
  console.error(message);
  return 1;
}
