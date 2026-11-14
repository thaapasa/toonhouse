import type { Group } from '@toonhouse/api';

import { sql } from '../db.ts';

/** The groups that a user belongs to, by name. */
export function getUserGroups(userId: string): Promise<Group[]> {
  return sql<Group[]>`
    SELECT g.id, g.name
    FROM groups g
    JOIN group_members m ON m.group_id = g.id
    WHERE m.user_id = ${userId}
    ORDER BY g.name
  `;
}

export async function isMember(
  userId: string,
  groupId: string,
): Promise<boolean> {
  const [row] = await sql`
    SELECT 1 FROM group_members WHERE user_id = ${userId} AND group_id = ${groupId}
  `;
  return !!row;
}
