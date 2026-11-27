import { z } from 'zod';

import { Group } from './groups.ts';
import { StorableText } from './text.ts';

/**
 * Who can watch a cartoon, besides its owner: anyone (`public`), every
 * logged-in user (`users`), the members of one group (`group`) or nobody else
 * (`private`).
 */
export const Visibility = z.enum(['public', 'users', 'group', 'private']);
export type Visibility = z.infer<typeof Visibility>;

/** A visibility with its group. Only `group` has one. */
export const Sharing = z.discriminatedUnion('visibility', [
  z.object({ visibility: z.literal('public') }),
  z.object({ visibility: z.literal('users') }),
  z.object({ visibility: z.literal('group'), groupId: z.uuid() }),
  z.object({ visibility: z.literal('private') }),
]);
export type Sharing = z.infer<typeof Sharing>;

export const CartoonTitle = StorableText().trim().min(1).max(200);

export const Cartoon = z.object({
  id: z.uuid(),
  title: z.string(),
  owner: z.object({ id: z.uuid(), displayName: z.string() }),
  visibility: Visibility,
  group: Group.nullable(),
  /** Whether the user who asked can edit the cartoon. Only the owner can. */
  canEdit: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  /** When the preview image was set, or `null` if the cartoon has none. */
  previewUpdatedAt: z.iso.datetime().nullable(),
});
export type Cartoon = z.infer<typeof Cartoon>;

export const CreateCartoonRequest = z.object({ title: CartoonTitle });
export type CreateCartoonRequest = z.infer<typeof CreateCartoonRequest>;

export const UpdateCartoonRequest = z.object({ title: CartoonTitle });
export type UpdateCartoonRequest = z.infer<typeof UpdateCartoonRequest>;
