import { z } from 'zod';

import { StorableText } from './text.ts';

export const LoginRequest = z.object({
  username: StorableText().trim().min(1).max(100),
  password: z.string().min(1).max(200),
});
export type LoginRequest = z.infer<typeof LoginRequest>;

export const User = z.object({
  id: z.uuid(),
  username: z.string(),
  displayName: z.string(),
});
export type User = z.infer<typeof User>;

export const MeResponse = z.object({ user: User.nullable() });
export type MeResponse = z.infer<typeof MeResponse>;
