import { apiClient } from '@/api/client';
import { type UserLookup } from '@/types/api';

/** UsersController. Phase 13 adds profile and admin user management. */
export const usersApi = {
  /**
   * GET /api/users/lookup (Admin or Manager, verified email): up to `limit` ACTIVE users matching the
   * search (≥ 2 characters), ordered by name. Built for member pickers (backend Phase 16, gap G1).
   */
  lookup: async (search: string, limit = 10, signal?: AbortSignal) =>
    (
      await apiClient.get<UserLookup[]>('/api/users/lookup', {
        params: { Search: search, Limit: limit },
        signal,
      })
    ).data,
};

export const userKeys = {
  all: ['users'] as const,
  lookup: (search: string) => [...userKeys.all, 'lookup', search] as const,
};
