import { apiClient } from '@/api/client';
import {
  type CreateTaskRequest,
  type PagedTasks,
  type Task,
  type TaskItemStatus,
  type TaskQuery,
  type UpdateTaskRequest,
} from '@/types/api';

/**
 * TasksController. Visibility: members of the task's project (Admin: all); a task you can't see is a 404.
 * Rights per operation (backend TaskAuthorizationHandler) are mirrored for the UI in taskRules.ts.
 */
export const tasksApi = {
  /** One page of tasks visible to the user. */
  getTasks: async (query: TaskQuery, signal?: AbortSignal) =>
    (await apiClient.get<PagedTasks>('/api/tasks', { params: query, signal })).data,

  /** 200 · 404 (unknown or not visible). */
  getTask: async (id: number, signal?: AbortSignal) =>
    (await apiClient.get<Task>(`/api/tasks/${id}`, { signal })).data,

  /** 201 · 400 (title, future due date) · 404 project not visible · 422 unknown category / due after project end. */
  create: async (body: CreateTaskRequest) => (await apiClient.post<Task>('/api/tasks', body)).data,

  /** 200 · 400 · 403 (not owner/creator) · 404 · 422. A CHANGED due date must be in the future. */
  update: async (id: number, body: UpdateTaskRequest) =>
    (await apiClient.put<Task>(`/api/tasks/${id}`, body)).data,

  /** 204 · 403 · 404. Deletes the task's comments too. */
  remove: async (id: number) => {
    await apiClient.delete(`/api/tasks/${id}`);
  },

  /** 200 · 403 (only owner/Admin) · 422 not an active project member. null = unassign. */
  assign: async (id: number, assignedToId: string | null) =>
    (await apiClient.patch<Task>(`/api/tasks/${id}/assignee`, { assignedToId })).data,

  /** 200 · 403 (not owner/creator/assignee, or reopen/restore without owner rights) · 409 invalid transition. */
  changeStatus: async (id: number, status: TaskItemStatus) =>
    (await apiClient.patch<Task>(`/api/tasks/${id}/status`, { status })).data,
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
