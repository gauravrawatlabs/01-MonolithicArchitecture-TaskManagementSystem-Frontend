import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type Role } from '@/constants/roles';
import { useAuth } from '@/features/auth';
import { type UpdateProfileRequest, type UserProfile, type UserQuery } from '@/types/api';

import { userKeys, usersApi } from '../api/usersApi';

export function useUsers(query: UserQuery, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: userKeys.list(query),
    queryFn: ({ signal }) => usersApi.getUsers(query, signal),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: ({ signal }) => usersApi.getUser(id, signal),
    staleTime: 30_000,
    enabled: id !== '',
  });
}

/** After an admin change: the account's details become the response; lists and member pickers refetch. */
function useAfterAdminChange() {
  const queryClient = useQueryClient();
  return (saved: UserProfile) => {
    queryClient.setQueryData(userKeys.detail(saved.id), saved);
    void queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    void queryClient.invalidateQueries({ queryKey: [...userKeys.all, 'lookup'] }); // deactivated users leave pickers
  };
}

export function useUpdateRoles() {
  const after = useAfterAdminChange();
  return useMutation({
    mutationFn: ({ id, roles }: { id: string; roles: readonly Role[] }) =>
      usersApi.updateRoles(id, roles),
    onSuccess: after,
  });
}

export function useUpdateStatus() {
  const after = useAfterAdminChange();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      usersApi.updateStatus(id, isActive),
    onSuccess: after,
  });
}

/**
 * Saves MY profile, then reloads the signed-in user (GET /api/auth/me), so the name in the header, menus and
 * "(you)" labels update everywhere at once.
 */
export function useUpdateMyProfile() {
  const queryClient = useQueryClient();
  const { refreshProfile } = useAuth();
  return useMutation({
    mutationFn: (body: UpdateProfileRequest) => usersApi.updateMe(body),
    onSuccess: async (saved) => {
      queryClient.setQueryData(userKeys.detail(saved.id), saved);
      await refreshProfile();
      // Names appear in project members, tasks and comments: refresh what may show the old name.
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
      void queryClient.invalidateQueries({ queryKey: ['comments'] });
    },
  });
}
