import type { Cartoon, Sharing, Visibility } from '@toonhouse/api';

import { sql } from '../db.ts';

type Row = {
  id: string;
  title: string;
  ownerId: string;
  ownerName: string;
  visibility: Visibility;
  groupId: string | null;
  groupName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * The condition for the cartoons that a user can watch. `userId` is `null` for
 * a visitor who is not logged in. The query must name the cartoons table `c`.
 */
function canWatch(userId: string | null) {
  if (!userId) return sql`c.visibility = 'public'`;
  return sql`(
    c.owner_id = ${userId}
    OR c.visibility IN ('public', 'users')
    OR (c.visibility = 'group' AND EXISTS (
      SELECT 1 FROM group_members m WHERE m.group_id = c.group_id AND m.user_id = ${userId}
    ))
  )`;
}

function selectCartoons(userId: string | null, where = sql``) {
  return sql<Row[]>`
    SELECT c.id, c.title, c.owner_id, u.display_name AS owner_name, c.visibility,
      c.group_id, g.name AS group_name, c.created_at, c.updated_at
    FROM cartoons c
    JOIN users u ON u.id = c.owner_id
    LEFT JOIN groups g ON g.id = c.group_id
    WHERE ${canWatch(userId)} ${where}
    ORDER BY c.updated_at DESC
  `;
}

function toCartoon(row: Row, userId: string | null): Cartoon {
  return {
    id: row.id,
    title: row.title,
    owner: { id: row.ownerId, displayName: row.ownerName },
    visibility: row.visibility,
    group:
      row.groupId && row.groupName
        ? { id: row.groupId, name: row.groupName }
        : null,
    canEdit: row.ownerId === userId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** The cartoons that a user can watch, the most recently changed first. */
export async function listCartoons(userId: string | null): Promise<Cartoon[]> {
  return (await selectCartoons(userId)).map((row) => toCartoon(row, userId));
}

/** Returns a cartoon, or `null` if it doesn't exist or the user can't watch it. */
export async function getCartoon(
  id: string,
  userId: string | null,
): Promise<Cartoon | null> {
  const [row] = await selectCartoons(userId, sql`AND c.id = ${id}`);
  return row ? toCartoon(row, userId) : null;
}

/** Creates a private cartoon and returns its id. */
export async function createCartoon(
  ownerId: string,
  title: string,
): Promise<string> {
  const [row] = await sql<{ id: string }[]>`
    INSERT INTO cartoons (owner_id, title) VALUES (${ownerId}, ${title}) RETURNING id
  `;
  return row!.id;
}

/** The changes below match the owner too, so that only the owner can make them. */
export async function setTitle(
  id: string,
  ownerId: string,
  title: string,
): Promise<boolean> {
  const rows = await sql`
    UPDATE cartoons SET title = ${title}, updated_at = now()
    WHERE id = ${id} AND owner_id = ${ownerId}
  `;
  return rows.count > 0;
}

export async function setSharing(
  id: string,
  ownerId: string,
  sharing: Sharing,
): Promise<boolean> {
  const groupId = sharing.visibility === 'group' ? sharing.groupId : null;
  const rows = await sql`
    UPDATE cartoons SET visibility = ${sharing.visibility}, group_id = ${groupId},
      updated_at = now()
    WHERE id = ${id} AND owner_id = ${ownerId}
  `;
  return rows.count > 0;
}

export async function deleteCartoon(
  id: string,
  ownerId: string,
): Promise<boolean> {
  const rows =
    await sql`DELETE FROM cartoons WHERE id = ${id} AND owner_id = ${ownerId}`;
  return rows.count > 0;
}
