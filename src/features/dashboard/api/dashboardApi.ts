import { apiClient } from '@/api/client';
import { TASK_PRIORITIES, TASK_STATUSES } from '@/constants/taskMeta';
import { type DashboardResponse, type TaskItemStatus, type TaskPriority } from '@/types/api';

/**
 * The dashboard as the UI uses it. The backend sends the per-status/priority counts as
 * dictionaries keyed by enum NAME ({ "Todo": 3, … }), which OpenAPI can only describe as
 * { [key: string]: number }. They are normalized here into COMPLETE typed records, so a missing
 * or unknown key can never reach a component.
 */
export interface Dashboard extends Omit<DashboardResponse, 'tasksByStatus' | 'tasksByPriority'> {
  tasksByStatus: Record<TaskItemStatus, number>;
  tasksByPriority: Record<TaskPriority, number>;
  /** true for Admins (scope "AllProjects"): figures cover every project, not only the user's. */
  coversAllProjects: boolean;
}

function completeCounts<TKey extends string>(
  source: Record<string, number>,
  keys: readonly TKey[],
): Record<TKey, number> {
  return Object.fromEntries(
    keys.map((key) => {
      const value = source[key];
      return [key, typeof value === 'number' && Number.isFinite(value) ? value : 0];
    }),
  ) as Record<TKey, number>;
}

export function toDashboard(response: DashboardResponse): Dashboard {
  return {
    ...response,
    tasksByStatus: completeCounts(response.tasksByStatus, TASK_STATUSES),
    tasksByPriority: completeCounts(response.tasksByPriority, TASK_PRIORITIES),
    coversAllProjects: response.scope === 'AllProjects',
  };
}

export const dashboardApi = {
  /** GET /api/dashboard: statistics for the current user's scope (Admin: all projects). */
  getDashboard: async (signal?: AbortSignal) =>
    toDashboard((await apiClient.get<DashboardResponse>('/api/dashboard', { signal })).data),
};

export const dashboardKeys = {
  all: ['dashboard'] as const,
};
