import { type UseQueryResult } from '@tanstack/react-query';
import { AlarmClock } from 'lucide-react';
import { type ReactNode } from 'react';
import { Link } from 'react-router';

import { getErrorMessage } from '@/api/apiError';
import { Button } from '@/components/common/Button';
import { Card, CardContent, CardHeader } from '@/components/common/Card';
import { SkeletonText } from '@/components/common/Skeleton';
import { paths } from '@/constants/routes';
import { PriorityBadge, StatusBadge } from '@/features/tasks';
import { type PagedTasks, type Task } from '@/types/api';
import { formatRelativeDay, formatTimeAgo } from '@/utils/dates';

export interface TaskListCardProps {
  title: string;
  description?: string;
  query: UseQueryResult<PagedTasks>;
  /** What to show per task in the meta line. */
  meta: 'due' | 'updated';
  emptyMessage: string;
  /** Narrows the page client-side (e.g. hide Done/Cancelled), then keeps the first `limit`. */
  filter?: (task: Task) => boolean;
  limit?: number;
  action?: ReactNode;
}

function DueLabel({ task }: { task: Task }) {
  if (!task.dueDateUtc) return <span>No due date</span>;
  const when = formatRelativeDay(task.dueDateUtc);
  return task.isOverdue ? (
    <span className="inline-flex items-center gap-1 font-medium text-danger">
      <AlarmClock aria-hidden="true" className="size-3.5" />
      Overdue · {when}
    </span>
  ) : (
    <span>Due {when.toLowerCase()}</span>
  );
}

/** A compact task list with its own loading, empty and error states (one widget never blanks the page). */
export function TaskListCard({
  title,
  description,
  query,
  meta,
  emptyMessage,
  filter,
  limit = 6,
  action,
}: TaskListCardProps) {
  let body: ReactNode;

  if (query.isPending) {
    body = (
      <div
        role="status"
        aria-busy="true"
        aria-label={`Loading ${title.toLowerCase()}`}
        className="grid gap-5"
      >
        <SkeletonText lines={2} />
        <SkeletonText lines={2} />
        <SkeletonText lines={2} />
      </div>
    );
  } else if (query.isError) {
    body = (
      <div role="alert" className="text-sm">
        <p className="text-muted-foreground">{getErrorMessage(query.error)}</p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={() => void query.refetch()}
          isLoading={query.isFetching}
        >
          Try again
        </Button>
      </div>
    );
  } else {
    const tasks = (filter ? query.data.items.filter(filter) : query.data.items).slice(0, limit);
    body =
      tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <ul className="divide-y">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <Link
                  to={paths.task(task.id)}
                  className="block truncate text-sm font-medium text-foreground hover:underline"
                >
                  {task.title}
                </Link>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                  <span className="truncate">{task.projectName}</span>
                  <span aria-hidden="true">·</span>
                  {meta === 'due' ? (
                    <DueLabel task={task} />
                  ) : (
                    <span>Updated {formatTimeAgo(task.updatedAtUtc ?? task.createdAtUtc)}</span>
                  )}
                </p>
              </div>
              {meta === 'due' ? (
                <PriorityBadge priority={task.priority} className="shrink-0" />
              ) : (
                <StatusBadge status={task.status} className="shrink-0" />
              )}
            </li>
          ))}
        </ul>
      );
  }

  return (
    <Card>
      <CardHeader title={title} description={description} action={action} />
      <CardContent>{body}</CardContent>
    </Card>
  );
}
