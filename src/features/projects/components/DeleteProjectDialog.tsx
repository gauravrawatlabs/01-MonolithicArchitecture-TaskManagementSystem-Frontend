import { getErrorMessage } from '@/api/apiError';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { useToast } from '@/contexts/toast';
import { useTasks } from '@/features/tasks';

import { useDeleteProject } from '../hooks/useProjects';

function consequence(taskCount: number | undefined): string {
  if (taskCount === undefined) return 'Checking its tasks…';
  if (taskCount === 0) return 'It has no tasks.';
  return `Its ${taskCount} ${taskCount === 1 ? 'task' : 'tasks'} and their comments will be deleted too.`;
}

/**
 * Deleting a project is DESTRUCTIVE: the backend cascades to its tasks and their comments. The dialog says
 * so, with the real number (GET /api/tasks?ProjectId=…&PageSize=1 → totalCount; owners and Admins see every
 * task of the project).
 */
export function DeleteProjectDialog({
  project,
  onClose,
  onDeleted,
}: {
  project: { id: number; name: string };
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const toast = useToast();
  const remove = useDeleteProject();
  const tasks = useTasks({ ProjectId: project.id, PageSize: 1 });

  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={`Delete "${project.name}"?`}
      description={`${consequence(tasks.data?.totalCount)} Members lose access. This can't be undone.`}
      confirmLabel="Delete project"
      onConfirm={async () => {
        try {
          await remove.mutateAsync(project.id);
          toast.success('Project deleted', `"${project.name}" was removed.`);
          onDeleted?.();
        } catch (error) {
          toast.error('Could not delete the project', getErrorMessage(error));
          throw error; // keeps the dialog open
        }
      }}
    />
  );
}
