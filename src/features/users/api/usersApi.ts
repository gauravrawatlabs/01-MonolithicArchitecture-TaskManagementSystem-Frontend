import { apiClient } from '@/api/client';
import { type Role } from '@/constants/roles';
import {
  type PagedUsers,
  type UpdateProfileRequest,
  type UserLookup,
  type UserProfile,
  type UserQuery,
} from '@/types/api';

/**
 * UsersController. Other people's accounts are ADMIN-ONLY (list, details, roles, status); anyone may read
 * and edit their OWN profile. Every write needs a verified email.
 */
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

  /** Admin, verified: paged directory. Search (email/first/last name), Role, IsActive, SortBy, paging. */
  getUsers: async (query: UserQuery, signal?: AbortSignal) =>
    (await apiClient.get<PagedUsers>('/api/users', { params: query, signal })).data,

  /** Admin (any account) or yourself; anyone else → 403. */
  getUser: async (id: string, signal?: AbortSignal) =>
    (await apiClient.get<UserProfile>(`/api/users/${id}`, { signal })).data,

  /** PUT /api/users/me (verified): first/last name 1–50, job title ≤ 100 (empty → null). */
  updateMe: async (body: UpdateProfileRequest) =>
    (await apiClient.put<UserProfile>('/api/users/me', body)).data,

  /** Admin, verified. 422: you can't remove the Admin role from your OWN account. */
  updateRoles: async (id: string, roles: readonly Role[]) =>
    (await apiClient.put<UserProfile>(`/api/users/${id}/roles`, { roles })).data,

  /** Admin, verified. Deactivating revokes all the user's sessions. 422: not your own account. */
  updateStatus: async (id: string, isActive: boolean) =>
    (await apiClient.patch<UserProfile>(`/api/users/${id}/status`, { isActive })).data,
};

export const userKeys = {
  all: ['users'] as const,
  lookup: (search: string) => [...userKeys.all, 'lookup', search] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (query: UserQuery) => [...userKeys.lists(), query] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
};
