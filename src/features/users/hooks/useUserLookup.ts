import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useDebouncedValue } from '@/hooks/useDebouncedValue';

import { userKeys, usersApi } from '../api/usersApi';

/** The backend requires at least 2 characters (shorter searches are a 400). */
export const LOOKUP_MIN_LENGTH = 2;

/**
 * Debounced user search for pickers. Doesn't call the API until the (trimmed) text has ≥ 2 characters
 * and the user has paused typing; keeps the previous results visible while the next ones load.
 */
export function useUserLookup(search: string) {
  const term = useDebouncedValue(search.trim(), 300);
  const enabled = term.length >= LOOKUP_MIN_LENGTH;

  const query = useQuery({
    queryKey: userKeys.lookup(term),
    queryFn: ({ signal }) => usersApi.lookup(term, 10, signal),
    enabled,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  return { ...query, term, enabled, isDebouncing: search.trim() !== term };
}
