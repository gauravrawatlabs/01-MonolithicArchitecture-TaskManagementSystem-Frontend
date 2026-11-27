import { FolderX, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, Outlet, useNavigate, useParams } from 'react-router';

import { getErrorMessage, toApiError } from '@/api/apiError';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { buttonVariants } from '@/components/common/Button.styles';
import { Card } from '@/components/common/Card';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useBreadcrumbLabel } from '@/components/layout/breadcrumbLabels';
import { PageHeader } from '@/components/layout/PageHeader';
import { TabNav } from '@/components/layout/TabNav';
import { paths } from '@/constants/routes';
import { useAuth } from '@/features/auth';

import { DeleteProjectDialog } from '../components/DeleteProjectDialog';
import { ProjectFormModal } from '../components/ProjectFormModal';
import { TimelineBadge } from '../components/TimelineBadge';
import { useProject } from '../hooks/useProjects';
import { type ProjectOutletContext } from '../projectContext';
import { canManageProject } from '../projectRules';

/**
 * Shell for /projects/:projectId and its tabs. Each tab is its own URL (Phase 1 §7), so links, refresh and
 * Back keep the selected tab. Loads the project ONCE and hands it to the tabs (Outlet context).
 */
export function ProjectDetailsLayout() {
  const projectId = Number(useParams().projectId);
  const { user } = useAuth();
  const navigate = useNavigate();
  const project = useProject(projectId);
  const [dialog, setDialog] = useState<'edit' | 'delete' | null>(null);
  useBreadcrumbLabel('/projects/:projectId', project.data?.name ?? null);

  const validId = Number.isInteger(projectId) && projectId > 0;
  const error = project.isError ? toApiError(project.error) : null;

  // 404 covers "doesn't exist" AND "not a member": the API deliberately doesn't tell them apart.
  if (!validId || error?.kind === 'notFound') {
    return (
      <Card>
        <EmptyState
          icon={FolderX}
          title="Project not found"
          description="It doesn't exist, was deleted, or you are not a member of it."
          action={
            <Link to={paths.projects} className={buttonVariants({ variant: 'secondary' })}>
              Back to projects
            </Link>
          }
        />
      </Card>
    );
  }

  if (project.isError) {
    return (
      <Card>
        <ErrorState
          title="We couldn't load this project"
          description={getErrorMessage(project.error)}
          correlationId={error?.correlationId}
          onRetry={() => void project.refetch()}
          isRetrying={project.isFetching}
        />
      </Card>
    );
  }

  if (!project.data) {
    return (
      <div role="status" aria-label="Loading project" className="grid gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
        <Skeleton className="mt-4 h-10 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const details = project.data;
  const canManage = canManageProject(user, details);
  const context: ProjectOutletContext = { project: details, canManage };

  return (
    <>
      <PageHeader
        title={details.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <TimelineBadge project={details} />
            {details.ownerId === user?.id ? <Badge variant="primary">Owner</Badge> : null}
            <span>Owned by {details.ownerName}</span>
          </span>
        }
        actions={
          canManage ? (
            <>
              <Button
                variant="secondary"
                leftIcon={<Pencil aria-hidden="true" />}
                onClick={() => {
                  setDialog('edit');
                }}
              >
                Edit
              </Button>
              <Button
                variant="danger"
                leftIcon={<Trash2 aria-hidden="true" />}
                onClick={() => {
                  setDialog('delete');
                }}
              >
                Delete
              </Button>
            </>
          ) : null
        }
      />
      <TabNav
        label="Project sections"
        items={[
          { label: 'Overview', to: paths.project(projectId), end: true },
          { label: 'Tasks', to: paths.projectTasks(projectId) },
          { label: 'Board', to: paths.projectBoard(projectId) },
          { label: `Members (${details.members.length})`, to: paths.projectMembers(projectId) },
        ]}
      />
      <Outlet context={context} />

      {dialog === 'edit' ? (
        <ProjectFormModal
          project={details}
          onClose={() => {
            setDialog(null);
          }}
        />
      ) : null}
      {dialog === 'delete' ? (
        <DeleteProjectDialog
          project={details}
          onClose={() => {
            setDialog(null);
          }}
          onDeleted={() => {
            void navigate(paths.projects, { replace: true });
          }}
        />
      ) : null}
    </>
  );
}
