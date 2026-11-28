import { type QueryKey, useMutation, useQueryClient } from '@tanstack/react-query';

import { getErrorMessage } from '@/api/apiError';
import { TASK_STATUS_META } from '@/constants/taskMeta';
import { useToast } from '@/contexts/toast';
import { taskKeys, tasksApi } from '@/features/tasks';
import { type PagedTasks, type Task, type TaskItemStatus } from '@/types/api';

import { withoutTask, withTask } from '../boardColumns';

export interface MoveVariables {
  task: Task;
  to: TaskItemStatus;
  /** The two column queries on screen (source and target), updated optimistically. */
  fromKey: QueryKey;
  toKey: QueryKey;
}

/**
 * Optimistic status change for the board (docs/02 §14):
 *   onMutate  → stop column refetches, snapshot both columns, move the card in the cache (instant UI)
 *   onError   → put the snapshots back (the card jumps back) and say why (409 / 403 / network)
 *   onSettled → refetch everything that depends on task status, so the server has the last word
 */
export function useMoveTask() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ task, to }: MoveVariables) => tasksApi.changeStatus(task.id, to),
    onMutate: async ({ task, to, fromKey, toKey }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: fromKey }),
        queryClient.cancelQueries({ queryKey: toKey }),
      ]);
      const snapshot = {
        from: queryClient.getQueryData<PagedTasks>(fromKey),
        to: queryClient.getQueryData<PagedTasks>(toKey),
      };
      queryClient.setQueryData<PagedTasks>(fromKey, (page) => withoutTask(page, task.id));
      queryClient.setQueryData<PagedTasks>(toKey, (page) =>
        withTask(page, { ...task, status: to }),
      );
      return snapshot;
    },
    onError: (error, { task, to, fromKey, toKey }, snapshot) => {
      queryClient.setQueryData(fromKey, snapshot?.from);
      queryClient.setQueryData(toKey, snapshot?.to);
      toast.error(
        `Can't move "${task.title}" to ${TASK_STATUS_META[to].label}`,
        getErrorMessage(error),
      );
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(taskKeys.detail(saved.id), saved);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['projects'] }); // progress on project cards
    },
  });
}
