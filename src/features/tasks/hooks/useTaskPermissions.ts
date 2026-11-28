import { useAuth } from '@/features/auth';
import { useProject } from '@/features/projects';
import { type Task } from '@/types/api';

import { taskPermissions } from '../taskRules';

/**
 * What the signed-in user may do with this task (UX only; the API decides). Needs the task's project (owner
 * and members); it's one cached request per project, shared by every row and page that asks.
 */
export function useTaskPermissions(task: Pick<Task, 'projectId' | 'createdById' | 'assignedToId'>) {
  const { user } = useAuth();
  const project = useProject(task.projectId);
  return { ...taskPermissions(user, task, project.data), project: project.data };
}
