import { AlertTriangle } from 'lucide-react';

import { getErrorMessage } from '@/api/apiError';
import { Card, CardContent, CardHeader } from '@/components/common/Card';
import { ProgressBar } from '@/components/common/ProgressBar';
import { Skeleton } from '@/components/common/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { TASK_STATUSES } from '@/constants/taskMeta';
import { StatusBadge } from '@/features/tasks';
import { formatDate } from '@/utils/dates';
import { formatPercent } from '@/utils/numbers';

import { useProjectTaskCounts } from '../hooks/useProjectTaskCounts';
import { useProjectContext } from '../projectContext';
import { completionPercent, formatProjectDates } from '../projectRules';

/** /projects/:id: description, dates, progress and task counts by status. */
export function ProjectOverviewPage() {
  const { project } = useProjectContext();
  const counts = useProjectTaskCounts(project.id);
  const data = counts.data;
  const counted = data ? data.total - data.byStatus.Cancelled : 0;
  const percent = data
    ? completionPercent(data.total, data.byStatus.Done, data.byStatus.Cancelled)
    : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader title="Progress" description="Tasks you can see in this project." />
        <CardContent>
          {counts.error ? (
            <ErrorState
              title="We couldn't load the task counts"
              description={getErrorMessage(counts.error)}
              onRetry={() => void counts.refetch()}
            />
          ) : !data ? (
            <div role="status" aria-label="Loading task counts" className="grid gap-3">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <>
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-3xl font-semibold normal-nums">{formatPercent(percent)}</p>
                <p className="text-sm text-muted-foreground">
                  {data.byStatus.Done} of {counted} {counted === 1 ? 'task' : 'tasks'} done
                  {data.byStatus.Cancelled > 0 ? ' (cancelled not counted)' : ''}
                </p>
              </div>
              <ProgressBar value={percent} label={`${project.name} progress`} className="mt-3" />
              {data.overdue > 0 ? (
                <p className="mt-3 flex items-center gap-1.5 text-sm text-danger">
                  <AlertTriangle aria-hidden="true" className="size-4" />
                  {data.overdue} overdue {data.overdue === 1 ? 'task' : 'tasks'}
                </p>
              ) : null}
              <table className="mt-5 w-full text-sm">
                <caption className="sr-only">Tasks by status</caption>
                <thead className="sr-only">
                  <tr>
                    <th scope="col">Status</th>
                    <th scope="col">Tasks</th>
                  </tr>
                </thead>
                <tbody>
                  {TASK_STATUSES.map((status) => (
                    <tr key={status} className="border-t first:border-t-0">
                      <th scope="row" className="py-2 text-left font-normal">
                        <StatusBadge status={status} />
                      </th>
                      <td className="py-2 text-right font-medium normal-nums">
                        {data.byStatus[status]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="About" />
        <CardContent>
          <dl className="grid gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Description</dt>
              <dd className="mt-0.5 whitespace-pre-line">
                {project.description ?? 'No description.'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Dates</dt>
              <dd className="mt-0.5">{formatProjectDates(project) ?? 'Not scheduled'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Owner</dt>
              <dd className="mt-0.5">{project.ownerName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd className="mt-0.5">{formatDate(project.createdAtUtc)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
