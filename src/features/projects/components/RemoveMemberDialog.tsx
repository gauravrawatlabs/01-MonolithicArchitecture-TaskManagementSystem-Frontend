import { getErrorMessage } from '@/api/apiError';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { useToast } from '@/contexts/toast';
import { useTasks } from '@/features/tasks';
import { type ProjectMember } from '@/types/api';

import { useRemoveProjectMember } from '../hooks/useProjects';

function consequence(count: number | undefined): string {
  if (count === undefined) return 'Checking their tasks…';
  if (count === 0) return 'They have no tasks assigned in this project.';
  return `Their ${count} assigned ${count === 1 ? 'task' : 'tasks'} in this project will become unassigned.`;
}

/** Confirms removing a member. The backend unassigns their tasks in the project; the dialog says how many. */
export function RemoveMemberDialog({
  projectId,
  projectName,
  member,
  onClose,
}: {
  projectId: number;
  projectName: string;
  member: ProjectMember;
  onClose: () => void;
}) {
  const toast = useToast();
  const remove = useRemoveProjectMember(projectId);
  const tasks = useTasks({ ProjectId: projectId, AssignedToId: member.userId, PageSize: 1 });

  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={`Remove ${member.fullName}?`}
      description={`${consequence(tasks.data?.totalCount)} They lose access to "${projectName}".`}
      confirmLabel="Remove member"
      onConfirm={async () => {
        try {
          await remove.mutateAsync(member.userId);
          toast.success('Member removed', `${member.fullName} was removed from the project.`);
        } catch (error) {
          toast.error('Could not remove the member', getErrorMessage(error));
          throw error;
        }
      }}
    />
  );
}
