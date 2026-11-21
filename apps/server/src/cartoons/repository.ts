import type {
  Cartoon,
  CartoonContent,
  SavedContent,
  Sharing,
  Visibility,
} from '@toonhouse/api';
import { emptyContent } from '@toonhouse/model';

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
  previewUpdatedAt: Date | null;
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
      c.group_id, g.name AS group_name, c.created_at, c.updated_at,
      p.updated_at AS preview_updated_at
    FROM cartoons c
    JOIN users u ON u.id = c.owner_id
    LEFT JOIN groups g ON g.id = c.group_id
    LEFT JOIN cartoon_previews p ON p.cartoon_id = c.id
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
    previewUpdatedAt: row.previewUpdatedAt?.toISOString() ?? null,
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

/**
 * The most cartoons that one user can have. Each cartoon can hold up to 10 MB
 * of content and 3 MB of preview image, so without a limit one user could fill
 * the disk of the database. The limit is there for disk space only, so it is far
 * above what anyone makes by hand. At the limit, one user can still store about
 * 13 GB in the worst case.
 */
export const maxCartoonsPerUser = 1000;

/**
 * Creates a private cartoon and returns its ID, or `null` if the user has too
 * many.
 */
export async function createCartoon(
  ownerId: string,
  title: string,
): Promise<string | null> {
  // Parallel requests can go a few over the limit, which doesn't matter for
  // disk space.
  const [row] = await sql<{ id: string }[]>`
    INSERT INTO cartoons (owner_id, title, content)
    SELECT ${ownerId}, ${title}, ${sql.json(emptyContent())}
    WHERE (SELECT count(*) FROM cartoons WHERE owner_id = ${ownerId}) < ${maxCartoonsPerUser}
    RETURNING id
  `;
  return row?.id ?? null;
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

/** The scenes of a cartoon, or `null` if it doesn't exist or the user can't watch it. */
export async function getContent(
  id: string,
  userId: string | null,
): Promise<SavedContent | null> {
  const [row] = await sql<
    {
      content: CartoonContent;
      contentRevision: number;
      contentEditor: string | null;
    }[]
  >`
    SELECT c.content, c.content_revision, c.content_editor FROM cartoons c
    WHERE c.id = ${id} AND ${canWatch(userId)}
  `;
  return row
    ? {
        revision: row.contentRevision,
        editor: row.contentEditor,
        content: row.content,
      }
    : null;
}

/**
 * Saves the scenes of a cartoon if they still have the revision that the save
 * edited. Gives the new revision, `'conflict'` if the revision has changed,
 * or `null` if the user doesn't own the cartoon.
 */
export async function setContent(
  id: string,
  ownerId: string,
  save: { revision: number; editor: string; content: CartoonContent },
): Promise<number | 'conflict' | null> {
  const [row] = await sql<{ contentRevision: number }[]>`
    UPDATE cartoons SET content = ${sql.json(save.content)},
      content_revision = content_revision + 1,
      content_editor = ${save.editor}, updated_at = now()
    WHERE id = ${id} AND owner_id = ${ownerId}
      AND content_revision = ${save.revision}
    RETURNING content_revision
  `;
  if (row) return row.contentRevision;
  const [owned] = await sql`
    SELECT 1 FROM cartoons WHERE id = ${id} AND owner_id = ${ownerId}
  `;
  return owned ? 'conflict' : null;
}

export type PreviewType = 'image/webp' | 'image/png';

/**
 * Sets the preview image. It doesn't change `updated_at` of the cartoon, so
 * that the cartoon keeps its place in the list.
 */
export async function setPreview(
  id: string,
  ownerId: string,
  image: Uint8Array,
  contentType: PreviewType,
): Promise<boolean> {
  const rows = await sql`
    INSERT INTO cartoon_previews (cartoon_id, image, content_type)
    SELECT c.id, ${image}, ${contentType} FROM cartoons c
    WHERE c.id = ${id} AND c.owner_id = ${ownerId}
    ON CONFLICT (cartoon_id) DO UPDATE
      SET image = excluded.image, content_type = excluded.content_type,
        updated_at = now()
  `;
  return rows.count > 0;
}

/** Returns the preview image, or `null` if there is none or the user can't watch the cartoon. */
export async function getPreview(
  id: string,
  userId: string | null,
): Promise<{
  image: Uint8Array<ArrayBuffer>;
  contentType: PreviewType;
} | null> {
  const [row] = await sql<
    { image: Uint8Array<ArrayBuffer>; contentType: PreviewType }[]
  >`
    SELECT p.image, p.content_type FROM cartoon_previews p
    JOIN cartoons c ON c.id = p.cartoon_id
    WHERE c.id = ${id} AND ${canWatch(userId)}
  `;
  return row ?? null;
}
