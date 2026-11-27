import { useQueries } from '@tanstack/react-query';

import { TASK_STATUSES } from '@/constants/taskMeta';
import { taskKeys, tasksApi } from '@/features/tasks';
import { type TaskItemStatus, type TaskQuery } from '@/types/api';

export interface ProjectTaskCounts {
  byStatus: Record<TaskItemStatus, number>;
  overdue: number;
  total: number;
}

/**
 * Task counts for ONE project. The details endpoint has no counts, so this asks the tasks endpoint for
 * totals only (PageSize=1 → read totalCount): one request per status + one for overdue, in parallel and
 * cached with the same keys the task pages use. Visible tasks only (as the API decides).
 */
export function useProjectTaskCounts(projectId: number) {
  const queries: TaskQuery[] = [
    ...TASK_STATUSES.map((status) => ({ ProjectId: projectId, Status: status, PageSize: 1 })),
    { ProjectId: projectId, Overdue: true, PageSize: 1 },
  ];

  return useQueries({
    queries: queries.map((query) => ({
      queryKey: taskKeys.list(query),
      queryFn: ({ signal }: { signal: AbortSignal }) => tasksApi.getTasks(query, signal),
      staleTime: 15_000,
    })),
    combine: (results) => {
      const isPending = results.some((result) => result.isPending);
      const failed = results.find((result) => result.isError);
      if (isPending || failed) {
        return {
          data: undefined,
          isPending,
          error: failed?.error ?? null,
          refetch: () => Promise.all(results.map((result) => result.refetch())),
        };
      }
      const counts = results.map((result) => result.data?.totalCount ?? 0);
      const byStatus = Object.fromEntries(
        TASK_STATUSES.map((status, index) => [status, counts[index] ?? 0]),
      ) as Record<TaskItemStatus, number>;
      const data: ProjectTaskCounts = {
        byStatus,
        overdue: counts[TASK_STATUSES.length] ?? 0,
        total: TASK_STATUSES.reduce((sum, status) => sum + byStatus[status], 0),
      };
      return {
        data,
        isPending: false,
        error: null,
        refetch: () => Promise.all(results.map((r) => r.refetch())),
      };
    },
  });
}
