import { FolderPlus, RefreshCw } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router';

import { getErrorMessage, toApiError } from '@/api/apiError';
import { buttonVariants } from '@/components/common/Button.styles';
import { Card } from '@/components/common/Card';
import { IconButton } from '@/components/common/IconButton';
import { Skeleton } from '@/components/common/Skeleton';
import { Spinner } from '@/components/common/Spinner';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageHeader } from '@/components/layout/PageHeader';
import { paths } from '@/constants/routes';
import { canCreateProjects, useAuth } from '@/features/auth';
import { useTasks } from '@/features/tasks';
import { type Task } from '@/types/api';
import { addDays, formatTimeAgo } from '@/utils/dates';

import { DashboardSkeleton } from '../components/DashboardSkeleton';
import { DashboardStats } from '../components/DashboardStats';
import { ProjectProgressCard } from '../components/ProjectProgressCard';
import { TaskListCard } from '../components/TaskListCard';
import { useDashboard } from '../hooks/useDashboard';

const isOpen = (task: Task) => task.status !== 'Done' && task.status !== 'Cancelled';

/**
 * The charts (and Recharts with them) load only when they are actually drawn. Otherwise the router,
 * which downloads a route's code BEFORE guards run, would make a signed-out visitor to /dashboard
 * download the chart library on the way to the sign-in page.
 */
const TaskBreakdownCharts = lazy(() =>
  import('../components/TaskBreakdownCharts').then((module) => ({
    default: module.TaskBreakdownCharts,
  })),
);

function ChartsFallback() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading charts"
      className="grid gap-4 lg:grid-cols-2"
    >
      <Skeleton className="h-[260px] rounded-xl" />
      <Skeleton className="h-[230px] rounded-xl" />
    </div>
  );
}

/**
 * The dashboard (Phase 1 §6): GET /api/dashboard for the figures, plus three task queries.
 * Admins see every project (scope "AllProjects"); everyone else sees the projects they belong to.
 */
export function DashboardPage() {
  const { user } = useAuth();
  const dashboard = useDashboard();
  const hasProjects = (dashboard.data?.projectCount ?? 0) > 0;

  // Fixed for the page's lifetime: a "now" computed on every render would change the query key on
  // every render, and TanStack Query would refetch in an endless loop.
  const [dueWindow] = useState(() => {
    const now = new Date();
    return { from: now.toISOString(), to: addDays(now, 7).toISOString() };
  });

  // The API filters by ONE status at a time, so "open tasks due this week" = due in the window and not
  // overdue, then Done/Cancelled are removed client-side from a 20-item page (see TaskListCard filter).
  const upcoming = useTasks(
    {
      DueFrom: dueWindow.from,
      DueTo: dueWindow.to,
      Overdue: false,
      SortBy: 'DueDate',
      SortDirection: 'Asc',
      PageSize: 20,
    },
    { enabled: hasProjects },
  );
  const myOverdue = useTasks(
    { AssignedToMe: true, Overdue: true, SortBy: 'DueDate', SortDirection: 'Asc', PageSize: 6 },
    { enabled: hasProjects },
  );
  const recent = useTasks(
    { SortBy: 'UpdatedAt', SortDirection: 'Desc', PageSize: 6 },
    { enabled: hasProjects },
  );

  const isRefreshing =
    dashboard.isFetching || upcoming.isFetching || myOverdue.isFetching || recent.isFetching;
  const refreshAll = () => {
    void dashboard.refetch();
    if (hasProjects) {
      void upcoming.refetch();
      void myOverdue.refetch();
      void recent.refetch();
    }
  };

  const header = (
    <PageHeader
      title="Dashboard"
      description={
        dashboard.data
          ? dashboard.data.coversAllProjects
            ? 'Figures across all projects (administrator view).'
            : 'Figures across the projects you belong to.'
          : 'Your projects, tasks and deadlines at a glance.'
      }
      actions={
        dashboard.data ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span aria-live="polite">
              {isRefreshing
                ? 'Updating…'
                : `Updated ${formatTimeAgo(new Date(dashboard.dataUpdatedAt).toISOString())}`}
            </span>
            <IconButton
              label="Refresh dashboard"
              icon={isRefreshing ? <Spinner label={null} /> : <RefreshCw />}
              variant="secondary"
              size="sm"
              disabled={isRefreshing}
              onClick={refreshAll}
            />
          </div>
        ) : null
      }
    />
  );

  if (dashboard.isPending) {
    return (
      <>
        {header}
        <DashboardSkeleton />
      </>
    );
  }

  if (dashboard.isError) {
    return (
      <>
        {header}
        <Card>
          <ErrorState
            title="We couldn't load the dashboard"
            description={getErrorMessage(dashboard.error)}
            correlationId={toApiError(dashboard.error).correlationId}
            onRetry={() => void dashboard.refetch()}
            isRetrying={dashboard.isFetching}
          />
        </Card>
      </>
    );
  }

  if (!hasProjects) {
    return (
      <>
        {header}
        <Card>
          <EmptyState
            icon={FolderPlus}
            title="No projects yet"
            description={
              canCreateProjects(user)
                ? 'Create your first project, then add tasks and invite your team. Your figures will appear here.'
                : "You're not a member of any project yet. Ask a project owner or manager to add you."
            }
            action={
              canCreateProjects(user) ? (
                <Link to={paths.projects} className={buttonVariants()}>
                  Go to projects
                </Link>
              ) : undefined
            }
          />
        </Card>
      </>
    );
  }

  const data = dashboard.data;
  return (
    <>
      {header}
      <div className="grid gap-6">
        <DashboardStats dashboard={data} />
        <Suspense fallback={<ChartsFallback />}>
          <TaskBreakdownCharts dashboard={data} />
        </Suspense>
        <div className="grid gap-4 lg:grid-cols-2">
          <ProjectProgressCard projects={data.projects} />
          <TaskListCard
            title="Upcoming deadlines"
            description="Open tasks due in the next 7 days"
            query={upcoming}
            meta="due"
            filter={isOpen}
            emptyMessage="Nothing is due in the next 7 days."
          />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <TaskListCard
            title="My overdue tasks"
            description="Assigned to you and past their due date"
            query={myOverdue}
            meta="due"
            emptyMessage="You have no overdue tasks. Nice work!"
            action={
              <Link to={paths.myTasks} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                View my tasks
              </Link>
            }
          />
          <TaskListCard
            title="Recently updated"
            description="The latest changes in your projects"
            query={recent}
            meta="updated"
            emptyMessage="No tasks yet."
          />
        </div>
      </div>
    </>
  );
}
