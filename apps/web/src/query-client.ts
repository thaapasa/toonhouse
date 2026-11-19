import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { ApiError } from './api.ts';

/**
 * Logs a failed request. A page shows only a general message when a request
 * fails, so the console shows the error itself. A schema error lists each
 * field that failed, since its stack shows only its name.
 */
function logError(what: string, key: unknown, error: Error) {
  if (error instanceof z.ZodError) {
    console.error(what, key, `\n${z.prettifyError(error)}`, error.issues);
  } else console.error(what, key, error);
}

export const queryClient = new QueryClient({
  // A query logs once, after its last retry.
  queryCache: new QueryCache({
    onError: (error, query) => logError('Query failed', query.queryKey, error),
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) =>
      logError('Mutation failed', mutation.options.mutationKey, error),
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // An answer such as 404 doesn't change when asked again.
      retry: (count, error) =>
        !(error instanceof ApiError && error.status < 500) && count < 2,
    },
  },
});
