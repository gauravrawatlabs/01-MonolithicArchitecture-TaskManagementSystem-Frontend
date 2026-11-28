import { useDraggable } from '@dnd-kit/core';
import { ArrowRight, GripVertical } from 'lucide-react';
import { Link } from 'react-router';

import { Avatar } from '@/components/common/Avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/common/DropdownMenu';
import { IconButton } from '@/components/common/IconButton';
import { paths } from '@/constants/routes';
import { TASK_STATUS_META } from '@/constants/taskMeta';
import { DueDate, PriorityBadge } from '@/features/tasks';
import { type Task, type TaskItemStatus } from '@/types/api';
import { cn } from '@/utils/cn';

export interface TaskCardProps {
  task: Task;
  /** Statuses this user may move the task to (empty: no drag handle, no menu). */
  moves: readonly TaskItemStatus[];
  onMove: (task: Task, to: TaskItemStatus) => void;
}

/** What a card shows; also used for the floating copy while dragging (DragOverlay). */
export function TaskCardView({
  task,
  className,
  handle,
  menu,
}: {
  task: Task;
  className?: string;
  handle?: React.ReactNode;
  menu?: React.ReactNode;
}) {
  return (
    <article
      aria-labelledby={`card-${task.id}`}
      data-card-id={task.id}
      className={cn('rounded-lg border bg-surface p-3 shadow-xs', className)}
    >
      <div className="flex items-start gap-1">
        {handle}
        <div className="min-w-0 flex-1">
          {task.categoryName ? (
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {task.categoryName}
            </p>
          ) : null}
          <h3 id={`card-${task.id}`} className="text-sm font-medium">
            <Link to={paths.task(task.id)} className="hover:underline">
              {task.title}
            </Link>
          </h3>
        </div>
        {menu}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <PriorityBadge priority={task.priority} />
        {task.dueDateUtc ? <DueDate task={task} compact /> : null}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        {task.assignedToName ? (
          <span className="flex items-center gap-1.5">
            <Avatar name={task.assignedToName} size="xs" decorative />
            {task.assignedToName}
          </span>
        ) : (
          <span>Unassigned</span>
        )}
        <span>#{task.id}</span>
      </div>
    </article>
  );
}

/**
 * A draggable card. Dragging starts ONLY from the handle (so links and the menu stay normal controls); the
 * handle exists only when the user may move the task. "Move to…" offers the same moves without dragging
 * (touch, keyboard, screen readers, WCAG 2.5.7).
 */
export function TaskCard({ task, moves, onMove }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
    disabled: moves.length === 0,
  });

  return (
    <li ref={setNodeRef} className={cn(isDragging && 'opacity-40')}>
      <TaskCardView
        task={task}
        handle={
          moves.length > 0 ? (
            <button
              ref={setActivatorNodeRef}
              type="button"
              aria-label={`Drag ${task.title}`}
              data-drag-handle
              className="-ml-1 inline-flex size-6 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-foreground hover:bg-surface-muted active:cursor-grabbing"
              {...attributes}
              {...listeners}
            >
              <GripVertical aria-hidden="true" className="size-4" />
            </button>
          ) : null
        }
        menu={
          moves.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <IconButton label={`Move ${task.title} to…`} icon={<ArrowRight />} size="sm" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Move to</DropdownMenuLabel>
                {moves.map((status) => (
                  <DropdownMenuItem
                    key={status}
                    onSelect={() => {
                      onMove(task, status);
                    }}
                  >
                    {TASK_STATUS_META[status].label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null
        }
      />
    </li>
  );
}
