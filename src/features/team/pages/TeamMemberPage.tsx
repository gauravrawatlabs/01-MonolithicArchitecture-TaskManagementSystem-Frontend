import { Mail, UserX } from 'lucide-react';
import { Link, useParams } from 'react-router';

import { Avatar } from '@/components/common/Avatar';
import { buttonVariants } from '@/components/common/Button.styles';
import { Card, CardContent, CardHeader } from '@/components/common/Card';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useBreadcrumbLabel } from '@/components/layout/breadcrumbLabels';
import { PageHeader } from '@/components/layout/PageHeader';
import { paths } from '@/constants/routes';
import { useAuth } from '@/features/auth';
import { DueDate, StatusBadge, useTasks } from '@/features/tasks';
import { canAdministerUsers } from '@/features/users';
import { formatDate } from '@/utils/dates';

import { useTeam } from '../hooks/useTeam';

/**
 * /team/:userId: a person as seen from MY projects (other users' accounts are Admin-only): shared projects
 * with their role, and the tasks assigned to them that I can see.
 */
export function TeamMemberPage() {
  const { userId = '' } = useParams();
  const { user } = useAuth();
  const team = useTeam();
  const member = team.members.find((m) => m.userId === userId);
  useBreadcrumbLabel('/team/:userId', member?.fullName ?? null);
  const tasks = useTasks(
    { AssignedToId: userId, SortBy: 'DueDate', SortDirection: 'Asc', Page: 1, PageSize: 10 },
    { enabled: Boolean(member) },
  );

  if (team.isPending) {
    return (
      <div role="status" aria-label="Loading team member" className="grid gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (!member) {
    return (
      <Card>
        <EmptyState
          icon={UserX}
          title="Not in your projects"
          description="You can only see people who share a project with you."
          action={
            <Link to={paths.team} className={buttonVariants({ variant: 'secondary' })}>
              Back to team
            </Link>
          }
        />
      </Card>
    );
  }

  const items = tasks.data?.items ?? [];
  return (
    <>
      <PageHeader
        title={member.fullName}
        description={member.userId === user?.id ? 'This is you.' : undefined}
        actions={
          canAdministerUsers(user) ? (
            <Link
              to={paths.adminUser(member.userId)}
              className={buttonVariants({ variant: 'secondary' })}
            >
              Manage account
            </Link>
          ) : null
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="content-start">
          <CardContent className="grid justify-items-center gap-2 pt-6 text-center">
            <Avatar name={member.fullName} size="lg" decorative />
            <a
              href={`mailto:${member.email}`}
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <Mail aria-hidden="true" className="size-4" />
              {member.email}
            </a>
          </CardContent>
          <CardContent>
            <h2 className="mb-2 text-sm font-semibold">Shared projects</h2>
            <ul className="grid gap-2 text-sm">
              {member.projects.map((p) => (
                <li key={p.projectId} className="flex items-baseline justify-between gap-2">
                  <Link to={paths.project(p.projectId)} className="truncate hover:underline">
                    {p.projectName}
                  </Link>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {p.memberRole} · since {formatDate(p.joinedAtUtc)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader
            title={tasks.data ? `Assigned tasks (${tasks.data.totalCount})` : 'Assigned tasks'}
            description="Only tasks in projects you can see."
          />
          <CardContent>
            {tasks.isPending ? (
              <Skeleton className="h-24 w-full" />
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing assigned right now.</p>
            ) : (
              <ul aria-label="Assigned tasks" className="divide-y">
                {items.map((task) => (
                  <li
                    key={task.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                  >
                    <span className="min-w-0">
                      <Link to={paths.task(task.id)} className="font-medium hover:underline">
                        {task.title}
                      </Link>
                      <span className="block text-xs text-muted-foreground">
                        {task.projectName}
                      </span>
                    </span>
                    <span className="flex items-center gap-3 text-xs">
                      <StatusBadge status={task.status} />
                      <DueDate task={task} compact />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
