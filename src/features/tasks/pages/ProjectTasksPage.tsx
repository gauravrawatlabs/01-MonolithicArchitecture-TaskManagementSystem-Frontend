import { useProjectContext } from '@/features/projects';

import { TaskList } from '../components/TaskList';

/**
 * /projects/:id/tasks. Lives in the tasks feature (it's a task list), rendered inside the project layout,
 * which provides the loaded project. Any member may create tasks in the project.
 */
export function ProjectTasksPage() {
  const { project } = useProjectContext();
  return (
    <TaskList projectId={project.id} emptyDescription="Create the first task of this project." />
  );
}
