import { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/api/apiError';

/** Only failures that might succeed on a second try are retried; a 4xx won't change by retrying. */
export function isRetryableError(error: unknown): boolean {
  return error instanceof ApiError && ['network', 'timeout', 'server'].includes(error.kind);
}

/** TanStack Query defaults (docs/02 §7.6). Tests create their own instance per test. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) => failureCount < 2 && isRetryableError(error),
        refetchOnWindowFocus: true,
      },
      mutations: {
        retry: 0, // never repeat a write automatically
      },
    },
  });
}
