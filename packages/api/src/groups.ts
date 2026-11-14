import { z } from 'zod';

export const Group = z.object({
  id: z.uuid(),
  name: z.string(),
});
export type Group = z.infer<typeof Group>;
