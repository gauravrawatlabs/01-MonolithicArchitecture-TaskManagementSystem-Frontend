import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type CreateTaskRequest,
  type Task,
  type TaskItemStatus,
  type UpdateTaskRequest,
} from '@/types/api';

import { taskKeys, tasksApi } from '../api/tasksApi';

/**
 * Other features' cache roots, repeated as literals: importing their key factories would make the tasks
 * feature depend on projects/dashboard, and they already depend on tasks (see docs/11 §3.1).
 */
const PROJECTS_KEY = ['projects'] as const; // list cards show task counts and progress
const DASHBOARD_KEY = ['dashboard'] as const;

export function useTask(id: number) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: ({ signal }) => tasksApi.getTask(id, signal),
    staleTime: 15_000,
    enabled: Number.isInteger(id) && id > 0,
  });
}

/** After any write: the saved task becomes the cached details; lists and aggregates refetch. */
function useAfterTaskWrite() {
  const queryClient = useQueryClient();
  return (task: Task, { countsChanged }: { countsChanged: boolean }) => {
    queryClient.setQueryData(taskKeys.detail(task.id), task);
    void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    void queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY });
    if (countsChanged) void queryClient.invalidateQueries({ queryKey: PROJECTS_KEY });
  };
}

export function useCreateTask() {
  const after = useAfterTaskWrite();
  return useMutation({
    mutationFn: (body: CreateTaskRequest) => tasksApi.create(body),
    onSuccess: (task) => {
      after(task, { countsChanged: true });
    },
  });
}

export function useUpdateTask() {
  const after = useAfterTaskWrite();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateTaskRequest }) =>
      tasksApi.update(id, body),
    onSuccess: (task) => {
      after(task, { countsChanged: false });
    },
  });
}

export function useAssignTask() {
  const after = useAfterTaskWrite();
  return useMutation({
    mutationFn: ({ id, assignedToId }: { id: number; assignedToId: string | null }) =>
      tasksApi.assign(id, assignedToId),
    onSuccess: (task) => {
      after(task, { countsChanged: false });
    },
  });
}

export function useChangeTaskStatus() {
  const after = useAfterTaskWrite();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: TaskItemStatus }) =>
      tasksApi.changeStatus(id, status),
    onSuccess: (task) => {
      after(task, { countsChanged: true }); // done/open counts and progress
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => tasksApi.remove(id),
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: taskKeys.detail(id) });
      queryClient.removeQueries({ queryKey: ['comments', 'task', id] }); // they were deleted with the task
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY });
      void queryClient.invalidateQueries({ queryKey: PROJECTS_KEY });
    },
  });
}
