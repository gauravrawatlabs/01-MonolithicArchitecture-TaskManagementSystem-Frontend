import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { type TaskQuery } from '@/types/api';

import { taskKeys, tasksApi } from '../api/tasksApi';

/** Task lists change often (status, assignment): consider them fresh for 15 s (docs/01 §14.2). */
const TASKS_STALE_TIME_MS = 15_000;

/**
 * A page of tasks for the given filters. The query is cached per filter combination; the signal
 * cancels the request if the component unmounts or the filters change before it finishes.
 * keepPreviousData: while the next page or filter loads, the previous rows stay visible (dimmed).
 */
export function useTasks(query: TaskQuery, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: taskKeys.list(query),
    queryFn: ({ signal }) => tasksApi.getTasks(query, signal),
    staleTime: TASKS_STALE_TIME_MS,
    enabled,
    placeholderData: keepPreviousData,
  });
}
