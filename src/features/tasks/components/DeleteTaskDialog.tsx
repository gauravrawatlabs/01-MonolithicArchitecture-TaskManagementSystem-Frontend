import { getErrorMessage } from '@/api/apiError';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { useToast } from '@/contexts/toast';
import { type Task } from '@/types/api';

import { useDeleteTask } from '../hooks/useTask';

/** Confirms deleting a task (its comments go too). Stays open and explains if the API refuses. */
export function DeleteTaskDialog({
  task,
  onClose,
  onDeleted,
}: {
  task: Pick<Task, 'id' | 'title'>;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const toast = useToast();
  const remove = useDeleteTask();

  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={`Delete "${task.title}"?`}
      description="The task and its comments will be deleted. This can't be undone."
      confirmLabel="Delete task"
      onConfirm={async () => {
        try {
          await remove.mutateAsync(task.id);
          toast.success('Task deleted', `"${task.title}" was removed.`);
          onDeleted?.();
        } catch (error) {
          toast.error('Could not delete the task', getErrorMessage(error));
          throw error;
        }
      }}
    />
  );
}
