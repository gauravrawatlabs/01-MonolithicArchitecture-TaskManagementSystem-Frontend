import { useDroppable } from '@dnd-kit/core';
import { Ban } from 'lucide-react';
import { Link } from 'react-router';

import { getErrorMessage } from '@/api/apiError';
import { Button } from '@/components/common/Button';
import { Skeleton } from '@/components/common/Skeleton';
import { TASK_STATUS_META } from '@/constants/taskMeta';
import { type PagedTasks, type Task, type TaskItemStatus } from '@/types/api';
import { cn } from '@/utils/cn';

import { COLUMN_MAX_SIZE } from '../boardColumns';
import { TaskCard } from './TaskCard';

export type DropState = 'idle' | 'allowed' | 'forbidden' | 'source';

export interface BoardColumnProps {
  status: TaskItemStatus;
  page: PagedTasks | undefined;
  isPending: boolean;
  error: unknown;
  onRetry: () => void;
  /** While a card is dragged: may it be dropped here? */
  dropState: DropState;
  movesFor: (task: Task) => TaskItemStatus[];
  onMove: (task: Task, to: TaskItemStatus) => void;
  canLoadMore: boolean;
  onLoadMore: () => void;
  isLoadingMore: boolean;
  /** Full list for this status (when the column is capped). */
  listHref: string;
}

/** One status column: a drop target that says "Not allowed" (text + icon, not only dimming) while dragging. */
export function BoardColumn(props: BoardColumnProps) {
  const { status, page, isPending, error, onRetry, dropState, movesFor, onMove } = props;
  const { setNodeRef, isOver } = useDroppable({ id: status, disabled: dropState === 'forbidden' });
  const { label, icon: Icon } = TASK_STATUS_META[status];
  const headingId = `column-${status}`;
  const items = page?.items ?? [];
  const total = page?.totalCount ?? 0;

  return (
    <section
      ref={setNodeRef}
      aria-labelledby={headingId}
      className={cn(
        'flex w-[85vw] max-w-80 shrink-0 snap-start flex-col rounded-xl border bg-surface-muted/60 sm:w-72',
        dropState === 'allowed' && 'border-primary',
        dropState === 'allowed' && isOver && 'ring-2 ring-primary',
        dropState === 'forbidden' && 'opacity-50',
      )}
    >
      <header className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
        <h2 id={headingId} className="flex items-center gap-2 text-sm font-semibold">
          <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
          {label}
        </h2>
        <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium normal-nums text-muted-foreground">
          {page ? total : '…'}
          <span className="sr-only"> tasks</span>
        </span>
      </header>
      {dropState === 'forbidden' ? (
        <p className="mx-3 mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Ban aria-hidden="true" className="size-3.5" /> Not allowed
        </p>
      ) : null}

      <div className="flex-1 px-2 pb-2">
        {error ? (
          <div role="alert" className="grid gap-2 p-2 text-sm">
            <p className="text-danger">{getErrorMessage(error)}</p>
            <Button variant="secondary" size="sm" onClick={onRetry}>
              Try again
            </Button>
          </div>
        ) : isPending ? (
          <div role="status" aria-label={`Loading ${label}`} className="grid gap-2">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        ) : items.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
            No tasks
          </p>
        ) : (
          <ul aria-label={`${label} tasks`} className="grid gap-2">
            {items.map((task) => (
              <TaskCard key={task.id} task={task} moves={movesFor(task)} onMove={onMove} />
            ))}
          </ul>
        )}
        {props.canLoadMore ? (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full"
            isLoading={props.isLoadingMore}
            onClick={props.onLoadMore}
          >
            Load more ({total - items.length})
          </Button>
        ) : total > items.length && items.length >= COLUMN_MAX_SIZE ? (
          <Link
            to={props.listHref}
            className="mt-2 block text-center text-xs font-medium text-primary hover:underline"
          >
            View all {total} in the list
          </Link>
        ) : null}
      </div>
    </section>
  );
}
