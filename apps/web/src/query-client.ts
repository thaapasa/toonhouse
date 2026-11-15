import { QueryClient } from '@tanstack/react-query';

import { ApiError } from './api.ts';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // An answer such as 404 doesn't change when asked again.
      retry: (count, error) =>
        !(error instanceof ApiError && error.status < 500) && count < 2,
    },
  },
});
