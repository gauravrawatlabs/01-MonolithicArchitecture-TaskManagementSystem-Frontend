import { AlertTriangle } from 'lucide-react';

import { type Task } from '@/types/api';
import { formatDateTime, formatRelativeDay } from '@/utils/dates';
import { cn } from '@/utils/cn';

/**
 * Due date as "Tomorrow" / "In 3 days" with the exact local date-time underneath (and as a tooltip-free
 * visible text). Overdue uses the API's `isOverdue` (computed by the database; never recomputed here),
 * shown with an icon and the word "Overdue", never colour alone.
 */
export function DueDate({
  task,
  compact = false,
}: {
  task: Pick<Task, 'dueDateUtc' | 'isOverdue'>;
  compact?: boolean;
}) {
  if (!task.dueDateUtc) return <span className="text-muted-foreground">No due date</span>;
  return (
    <span className={cn('inline-flex flex-col', task.isOverdue && 'text-danger')}>
      <span className="inline-flex items-center gap-1 font-medium whitespace-nowrap">
        {task.isOverdue ? <AlertTriangle aria-hidden="true" className="size-3.5" /> : null}
        {task.isOverdue ? 'Overdue · ' : ''}
        {formatRelativeDay(task.dueDateUtc)}
      </span>
      {compact ? null : (
        <span
          className={cn(
            'text-xs whitespace-nowrap',
            task.isOverdue ? 'text-danger' : 'text-muted-foreground',
          )}
        >
          {formatDateTime(task.dueDateUtc)}
        </span>
      )}
    </span>
  );
}
