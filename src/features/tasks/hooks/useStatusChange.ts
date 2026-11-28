import { getErrorMessage } from '@/api/apiError';
import { TASK_STATUS_META } from '@/constants/taskMeta';
import { useToast } from '@/contexts/toast';
import { type Task, type TaskItemStatus } from '@/types/api';

import { useChangeTaskStatus } from './useTask';

/** Changes a task's status with feedback: "Moved to In review" or the API's reason (409/403). */
export function useStatusChange() {
  const toast = useToast();
  const change = useChangeTaskStatus();
  const move = (task: Pick<Task, 'id' | 'title'>, status: TaskItemStatus) => {
    change.mutate(
      { id: task.id, status },
      {
        onSuccess: () => {
          toast.success(`Moved to ${TASK_STATUS_META[status].label}`, `"${task.title}"`);
        },
        onError: (error) => {
          toast.error('Could not change the status', getErrorMessage(error));
        },
      },
    );
  };
  return { move, isPending: change.isPending };
}
