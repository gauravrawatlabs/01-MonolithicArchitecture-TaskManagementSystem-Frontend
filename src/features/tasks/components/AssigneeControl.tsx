import { useId } from 'react';

import { getErrorMessage } from '@/api/apiError';
import { Select } from '@/components/common/Select';
import { useToast } from '@/contexts/toast';
import { useAuth } from '@/features/auth';
import { type ProjectDetails, type Task } from '@/types/api';

import { useAssignTask } from '../hooks/useTask';

/**
 * Assign / unassign (owner or Admin). Options are the project's members, the only people the API accepts
 * (422 otherwise). Saves on change, with a toast; the select is disabled while saving.
 */
export function AssigneeControl({ task, project }: { task: Task; project: ProjectDetails }) {
  const id = useId();
  const toast = useToast();
  const { user } = useAuth();
  const assign = useAssignTask();

  return (
    <div>
      <label htmlFor={id} className="sr-only">
        Assignee
      </label>
      <Select
        id={id}
        value={task.assignedToId ?? ''}
        disabled={assign.isPending}
        placeholder="Unassigned"
        options={project.members.map((member) => ({
          value: member.userId,
          label: member.userId === user?.id ? `${member.fullName} (you)` : member.fullName,
        }))}
        onChange={(event) => {
          const assignedToId = event.target.value || null;
          assign.mutate(
            { id: task.id, assignedToId },
            {
              onSuccess: (saved) => {
                toast.success(
                  saved.assignedToName ? `Assigned to ${saved.assignedToName}` : 'Task unassigned',
                  `"${saved.title}"`,
                );
              },
              onError: (error) => {
                toast.error('Could not change the assignee', getErrorMessage(error));
              },
            },
          );
        }}
      />
    </div>
  );
}
