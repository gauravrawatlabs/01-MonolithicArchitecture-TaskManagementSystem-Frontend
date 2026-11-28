import { FileQuestion, Pencil, Trash2 } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { getErrorMessage, toApiError } from '@/api/apiError';
import { Button } from '@/components/common/Button';
import { buttonVariants } from '@/components/common/Button.styles';
import { Card, CardContent, CardHeader } from '@/components/common/Card';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useBreadcrumbLabel } from '@/components/layout/breadcrumbLabels';
import { PageHeader } from '@/components/layout/PageHeader';
import { paths } from '@/constants/routes';
import { isEmailVerified, useAuth } from '@/features/auth';
import { CommentsSection } from '@/features/comments';
import { formatDateTime } from '@/utils/dates';

import { AssigneeControl } from '../components/AssigneeControl';
import { DeleteTaskDialog } from '../components/DeleteTaskDialog';
import { DueDate } from '../components/DueDate';
import { PriorityBadge } from '../components/PriorityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { TaskFormModal } from '../components/TaskFormModal';
import { useStatusChange } from '../hooks/useStatusChange';
import { useTask } from '../hooks/useTask';
import { useTaskPermissions } from '../hooks/useTaskPermissions';
import { allowedMoves, isClosed, moveLabel, VERIFY_TO_CHANGE_TASKS } from '../taskRules';

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}

/** /tasks/:taskId: everything about one task, status moves, assignment, edit and delete. */
export function TaskDetailsPage() {
  const taskId = Number(useParams().taskId);
  const task = useTask(taskId);
  useBreadcrumbLabel('/tasks/:taskId', task.data?.title ?? null);
  const error = task.isError ? toApiError(task.error) : null;
  const validId = Number.isInteger(taskId) && taskId > 0;

  if (!validId || error?.kind === 'notFound') {
    return (
      <Card>
        <EmptyState
          icon={FileQuestion}
          title="Task not found"
          description="It doesn't exist, was deleted, or belongs to a project you are not a member of."
          action={
            <Link to={paths.tasks} className={buttonVariants({ variant: 'secondary' })}>
              Back to tasks
            </Link>
          }
        />
      </Card>
    );
  }
  if (task.isError) {
    return (
      <Card>
        <ErrorState
          title="We couldn't load this task"
          description={getErrorMessage(task.error)}
          correlationId={error?.correlationId}
          onRetry={() => void task.refetch()}
          isRetrying={task.isFetching}
        />
      </Card>
    );
  }
  if (!task.data) {
    return (
      <div role="status" aria-label="Loading task" className="grid gap-4">
        <Skeleton className="h-8 w-80 max-w-full" />
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-4 h-40 w-full" />
      </div>
    );
  }
  return <TaskDetails task={task.data} />;
}

function TaskDetails({ task }: { task: NonNullable<ReturnType<typeof useTask>['data']> }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const permissions = useTaskPermissions(task);
  const { move, isPending } = useStatusChange();
  const [dialog, setDialog] = useState<'edit' | 'delete' | null>(null);
  const moves = allowedMoves(task.status, permissions);

  let statusHelp: string | null = null;
  if (!isEmailVerified(user)) {
    statusHelp = VERIFY_TO_CHANGE_TASKS;
  } else if (moves.length === 0 && permissions.project) {
    statusHelp = isClosed(task.status)
      ? 'Only the project owner can reopen this task.'
      : 'Only the project owner, the task creator or the assignee can change the status.';
  }

  return (
    <>
      <PageHeader
        title={task.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
            <span>
              in{' '}
              <Link
                to={paths.project(task.projectId)}
                className="underline-offset-2 hover:underline"
              >
                {task.projectName}
              </Link>
            </span>
          </span>
        }
        actions={
          <>
            {permissions.canEdit ? (
              <Button
                variant="secondary"
                leftIcon={<Pencil aria-hidden="true" />}
                onClick={() => {
                  setDialog('edit');
                }}
              >
                Edit
              </Button>
            ) : null}
            {permissions.canDelete ? (
              <Button
                variant="danger"
                leftIcon={<Trash2 aria-hidden="true" />}
                onClick={() => {
                  setDialog('delete');
                }}
              >
                Delete
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* First in the page order: on phones, owner and due date come right after the title (not after
            the whole discussion). On large screens it is placed in the right column. */}
        <Card className="content-start lg:col-start-3 lg:row-start-1">
          <CardHeader title="Details" />
          <CardContent>
            <dl className="grid gap-4 text-sm">
              <Detail label="Assignee">
                {permissions.canAssign && permissions.project ? (
                  <AssigneeControl task={task} project={permissions.project} />
                ) : (
                  (task.assignedToName ?? 'Unassigned')
                )}
              </Detail>
              <Detail label="Due">
                <DueDate task={task} />
              </Detail>
              <Detail label="Category">{task.categoryName ?? 'None'}</Detail>
              <Detail label="Created by">{task.createdByName}</Detail>
              <Detail label="Created">{formatDateTime(task.createdAtUtc)}</Detail>
              {task.updatedAtUtc ? (
                <Detail label="Updated">{formatDateTime(task.updatedAtUtc)}</Detail>
              ) : null}
            </dl>
          </CardContent>
        </Card>
        <div className="grid content-start gap-6 lg:col-span-2 lg:col-start-1 lg:row-start-1">
          <Card>
            <CardHeader title="Status" />
            <CardContent>
              {moves.length > 0 ? (
                <div role="group" aria-label="Change status" className="flex flex-wrap gap-2">
                  {moves.map((status) => (
                    <Button
                      key={status}
                      variant={status === 'Cancelled' ? 'ghost' : 'secondary'}
                      disabled={isPending}
                      onClick={() => {
                        move(task, status);
                      }}
                    >
                      {moveLabel(task.status, status)}
                    </Button>
                  ))}
                </div>
              ) : statusHelp ? (
                <p className="text-sm text-muted-foreground">{statusHelp}</p>
              ) : null}
              {task.completedAtUtc ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Completed {formatDateTime(task.completedAtUtc)}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Description" />
            <CardContent>
              <p className="text-sm whitespace-pre-line">{task.description ?? 'No description.'}</p>
            </CardContent>
          </Card>

          <CommentsSection taskId={task.id} project={permissions.project} />
        </div>
      </div>

      {dialog === 'edit' ? (
        <TaskFormModal
          task={task}
          onClose={() => {
            setDialog(null);
          }}
        />
      ) : null}
      {dialog === 'delete' ? (
        <DeleteTaskDialog
          task={task}
          onClose={() => {
            setDialog(null);
          }}
          onDeleted={() => {
            void navigate(paths.projectTasks(task.projectId), { replace: true });
          }}
        />
      ) : null}
    </>
  );
}
