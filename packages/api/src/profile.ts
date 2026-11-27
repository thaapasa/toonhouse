import { z } from 'zod';

import { StorableText } from './text.ts';

export const Profile = z.object({
  username: z.string(),
  displayName: z.string(),
  createdAt: z.iso.datetime(),
  passwordChangedAt: z.iso.datetime(),
});
export type Profile = z.infer<typeof Profile>;

export const UpdateProfileRequest = z.object({
  displayName: StorableText().trim().min(1).max(100),
});
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequest>;

/** Resetting the password needs the current password. */
export const ResetPasswordRequest = z.object({
  currentPassword: z.string().min(1).max(200),
});
export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequest>;

/** The new password. The server shows it only once. */
export const ResetPasswordResponse = z.object({ password: z.string() });
export type ResetPasswordResponse = z.infer<typeof ResetPasswordResponse>;
