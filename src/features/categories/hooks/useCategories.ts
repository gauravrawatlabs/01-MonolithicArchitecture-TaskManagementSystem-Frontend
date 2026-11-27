import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { taskKeys } from '@/features/tasks';
import { type Category, type CreateCategoryRequest, type UpdateCategoryRequest } from '@/types/api';

import { categoriesApi, categoryKeys } from '../api/categoriesApi';

/** Categories change rarely: 10 minutes of freshness (docs/01 §14.2). Also used by task forms later. */
export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.all,
    queryFn: ({ signal }) => categoriesApi.getAll(signal),
    staleTime: 10 * 60_000,
  });
}

const byName = (a: Category, b: Category) => a.name.localeCompare(b.name);

/**
 * Writes update the cached list straight from the server's response (no extra GET), keeping the
 * server's name order, then mark it stale so the next read confirms it.
 */
export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCategoryRequest) => categoriesApi.create(body),
    onSuccess: (created) => {
      queryClient.setQueryData<Category[]>(categoryKeys.all, (list = []) =>
        [...list, created].sort(byName),
      );
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateCategoryRequest }) =>
      categoriesApi.update(id, body),
    onSuccess: (updated) => {
      queryClient.setQueryData<Category[]>(categoryKeys.all, (list = []) =>
        list.map((category) => (category.id === updated.id ? updated : category)).sort(byName),
      );
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      // Task lists and details show the category name.
      void queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => categoriesApi.remove(id),
    onSuccess: (_result, id) => {
      queryClient.setQueryData<Category[]>(categoryKeys.all, (list = []) =>
        list.filter((c) => c.id !== id),
      );
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      // Tasks that used it now have no category (FK SET NULL).
      void queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}
