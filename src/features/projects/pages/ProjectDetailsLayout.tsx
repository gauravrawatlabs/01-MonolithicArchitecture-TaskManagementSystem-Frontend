import { Outlet, useParams } from 'react-router';

import { PageHeader } from '@/components/layout/PageHeader';
import { TabNav } from '@/components/layout/TabNav';
import { paths } from '@/constants/routes';

/**
 * Shell for /projects/:projectId and its tabs. Each tab is its own URL (Phase 1 §7),
 * so links, refresh and Back keep the selected tab.
 */
export function ProjectDetailsLayout() {
  const projectId = Number(useParams().projectId);

  return (
    <>
      <PageHeader
        title={`Project #${projectId}`}
        description="Project details arrive in Phase 10."
      />
      <TabNav
        label="Project sections"
        items={[
          { label: 'Overview', to: paths.project(projectId), end: true },
          { label: 'Tasks', to: paths.projectTasks(projectId) },
          { label: 'Board', to: paths.projectBoard(projectId) },
          { label: 'Members', to: paths.projectMembers(projectId) },
        ]}
      />
      <Outlet />
    </>
  );
}
