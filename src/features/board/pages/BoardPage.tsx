import { ChevronRight, KanbanSquare } from 'lucide-react';
import { Link } from 'react-router';

import { getErrorMessage } from '@/api/apiError';
import { Card } from '@/components/common/Card';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageHeader } from '@/components/layout/PageHeader';
import { paths } from '@/constants/routes';
import { useProjects } from '@/features/projects';

/** /board: boards are per project (Phase 1 §9), so this page picks the project. */
export function BoardPage() {
  const projects = useProjects({ SortBy: 'Name', SortDirection: 'Asc', Page: 1, PageSize: 100 });
  const items = projects.data?.items ?? [];

  return (
    <>
      <PageHeader title="Board" description="Choose a project to open its Kanban board." />
      {projects.isError ? (
        <Card>
          <ErrorState
            title="We couldn't load your projects"
            description={getErrorMessage(projects.error)}
            onRetry={() => void projects.refetch()}
          />
        </Card>
      ) : projects.isPending ? (
        <div role="status" aria-label="Loading projects" className="grid gap-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon={KanbanSquare}
            title="No projects yet"
            description="Boards belong to projects. Once you're in a project, its board appears here."
          />
        </Card>
      ) : (
        <ul aria-label="Projects" className="grid gap-2 sm:grid-cols-2">
          {items.map((project) => (
            <li key={project.id}>
              <Link
                to={paths.projectBoard(project.id)}
                className="flex items-center justify-between gap-3 rounded-xl border bg-surface p-4 shadow-xs hover:border-primary"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{project.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {project.openTaskCount} open · {project.doneTaskCount} done
                  </span>
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
