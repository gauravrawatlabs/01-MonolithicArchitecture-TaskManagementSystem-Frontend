import { apiClient } from '@/api/client';
import { type PagedTasks, type TaskQuery } from '@/types/api';

/** GET /api/tasks and friends (TasksController). Phase 11 adds create/update/delete/assign/status. */
export const tasksApi = {
  /** One page of tasks visible to the user (members of the project, or Admin). */
  getTasks: async (query: TaskQuery, signal?: AbortSignal) =>
    (await apiClient.get<PagedTasks>('/api/tasks', { params: query, signal })).data,
};

/**
 * Query-key factory (docs/02 §7.3). Hierarchical keys allow precise invalidation:
 * invalidateQueries({ queryKey: taskKeys.lists() }) refreshes every task list, any filters.
 */
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (query: TaskQuery) => [...taskKeys.lists(), query] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: number) => [...taskKeys.details(), id] as const,
};
