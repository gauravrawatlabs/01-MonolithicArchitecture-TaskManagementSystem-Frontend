import { apiClient } from '@/api/client';
import { type Category, type CreateCategoryRequest, type UpdateCategoryRequest } from '@/types/api';

/**
 * CategoriesController. Reads: any signed-in user. Writes: Admin + verified email
 * (policy CanManageCategories); the API answers 403 otherwise, whatever the UI shows.
 */
export const categoriesApi = {
  /** All categories, ordered by name (the list is small and not paged). */
  getAll: async (signal?: AbortSignal) =>
    (await apiClient.get<Category[]>('/api/categories', { signal })).data,

  /** 201 · 400 validation · 403 · 409 name already used (case-insensitive) */
  create: async (body: CreateCategoryRequest) =>
    (await apiClient.post<Category>('/api/categories', body)).data,

  /** 200 · 400 · 403 · 404 · 409 */
  update: async (id: number, body: UpdateCategoryRequest) =>
    (await apiClient.put<Category>(`/api/categories/${id}`, body)).data,

  /** 204 · 403 · 404. Tasks using it keep existing; their category becomes empty (FK SET NULL). */
  remove: async (id: number) => {
    await apiClient.delete(`/api/categories/${id}`);
  },
};

export const categoryKeys = {
  all: ['categories'] as const,
};
