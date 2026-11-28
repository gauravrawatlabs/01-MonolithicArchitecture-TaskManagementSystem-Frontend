import {
  type Announcements,
  closestCenter,
  type CollisionDetection,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  type KeyboardCoordinateGetter,
  PointerSensor,
  pointerWithin,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { keepPreviousData, useQueries } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { paths } from '@/constants/routes';
import { useAuth } from '@/features/auth';
import { allowedMoves, taskKeys, taskPermissions, tasksApi } from '@/features/tasks';
import { type ProjectDetails, type Task, type TaskItemStatus } from '@/types/api';

import {
  type BoardFilters,
  COLUMN_MAX_SIZE,
  COLUMN_PAGE_SIZE,
  columnQuery,
  MAIN_COLUMNS,
} from '../boardColumns';
import { useMoveTask } from '../hooks/useMoveTask';
import { announce, dropState, type DropState, nextColumn, shouldMove } from '../boardDnd';
import { BoardColumn } from './BoardColumn';
import { TaskCardView } from './TaskCard';

/**
 * Keyboard dragging: ← / → jump straight to the previous / next COLUMN (instead of nudging the card a few
 * pixels per key press), so moving a card is one key press per column.
 */
function columnJumper(order: readonly TaskItemStatus[]): KeyboardCoordinateGetter {
  return (event, { context, currentCoordinates }) => {
    const start = (context.over?.id ??
      (context.active?.data.current as { task?: Task } | undefined)?.task?.status) as
      TaskItemStatus | undefined;
    const target = nextColumn(order, start, event.code);
    if (!target) return undefined;
    event.preventDefault();
    const rect = context.droppableRects.get(target);
    if (!rect) return currentCoordinates;
    const width = context.collisionRect?.width ?? 0;
    return { x: rect.left + rect.width / 2 - width / 2, y: currentCoordinates.y };
  };
}

/**
 * The moved card is re-created in its new column, so the focused handle (or "Move to" button) disappears and
 * focus would fall back to the page: a keyboard user would have to Tab back from the top. Once the card shows
 * up in the target column (after the optimistic update, which is async), focus its handle, or its link if it
 * can't move on. Gives up quietly after ~30 frames (e.g. the move was refused and rolled back).
 */
function focusMovedCard(taskId: number, to: TaskItemStatus, framesLeft = 30) {
  requestAnimationFrame(() => {
    const card = document
      .querySelector<HTMLElement>(`#column-${to}`)
      ?.closest('section')
      ?.querySelector<HTMLElement>(`[data-card-id="${String(taskId)}"]`);
    const target =
      card?.querySelector<HTMLElement>('[data-drag-handle]') ??
      card?.querySelector<HTMLElement>('a');
    if (target) target.focus();
    else if (framesLeft > 0) focusMovedCard(taskId, to, framesLeft - 1);
  });
}

/** Pointer: the column under the pointer. Keyboard (no pointer): the closest column. */
const collision: CollisionDetection = (args) =>
  args.pointerCoordinates ? pointerWithin(args) : closestCenter(args);

export interface KanbanBoardProps {
  project: ProjectDetails;
  filters: BoardFilters;
  showCancelled: boolean;
}

export function KanbanBoard({ project, filters, showCancelled }: KanbanBoardProps) {
  const { user } = useAuth();
  const move = useMoveTask();
  const columns = showCancelled ? [...MAIN_COLUMNS, 'Cancelled' as const] : MAIN_COLUMNS;
  const [sizes, setSizes] = useState<Partial<Record<TaskItemStatus, number>>>({});
  const [active, setActive] = useState<Task | null>(null);

  const queries = columns.map((status) =>
    columnQuery(project.id, status, filters, sizes[status] ?? COLUMN_PAGE_SIZE),
  );
  const results = useQueries({
    queries: queries.map((query) => ({
      queryKey: taskKeys.list(query),
      queryFn: ({ signal }: { signal: AbortSignal }) => tasksApi.getTasks(query, signal),
      staleTime: 15_000,
      placeholderData: keepPreviousData,
    })),
  });
  const keyFor = (status: TaskItemStatus) =>
    taskKeys.list(columnQuery(project.id, status, filters, sizes[status] ?? COLUMN_PAGE_SIZE));

  const movesFor = (task: Task) => allowedMoves(task.status, taskPermissions(user, task, project));
  const onMove = (task: Task, to: TaskItemStatus) => {
    move.mutate({ task, to, fromKey: keyFor(task.status), toKey: keyFor(to) });
    focusMovedCard(task.id, to);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }), // long-press: scrolling still works
    useSensor(KeyboardSensor, { coordinateGetter: columnJumper(columns) }),
  );

  const taskOf = (event: { active: { data: { current?: unknown } } }) =>
    (event.active.data.current as { task: Task }).task;
  const activeMoves = active ? movesFor(active) : [];
  const stateOf = (status: TaskItemStatus): DropState => dropState(active, status, activeMoves);

  // Last column announced during the current drag (pick-up starts over the card's own column).
  const lastOver = useRef<TaskItemStatus | null>(null);
  const announcements: Announcements = {
    onDragStart: ({ active: a }) => {
      const task = taskOf({ active: a });
      lastOver.current = task.status;
      return announce.start(task, movesFor(task));
    },
    onDragOver: ({ active: a, over }) => {
      const task = taskOf({ active: a });
      const to = (over?.id ?? null) as TaskItemStatus | null;
      const message = announce.over(task, to, lastOver.current, movesFor(task));
      if (to) lastOver.current = to;
      return message;
    },
    onDragEnd: ({ active: a, over }) => {
      const task = taskOf({ active: a });
      return announce.end(task, over?.id as TaskItemStatus | undefined, movesFor(task));
    },
    onDragCancel: ({ active: a }) => announce.cancel(taskOf({ active: a })),
  };

  const onDragStart = (event: DragStartEvent) => {
    setActive(taskOf(event));
  };
  const onDragEnd = (event: DragEndEvent) => {
    setActive(null);
    const task = taskOf(event);
    const to = event.over?.id as TaskItemStatus | undefined;
    // Dropping on a forbidden column does nothing: no API call, no error (the column said "Not allowed").
    if (to && shouldMove(task, to, movesFor(task))) onMove(task, to);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setActive(null);
      }}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            'To move this task with the keyboard, press Space to pick it up, Left or Right arrow to choose a column, ' +
            'Space to drop it, or Escape to cancel. The "Move to" button next to it does the same without dragging.',
        },
      }}
    >
      {/* relative: makes this scroller the containing block of the columns' absolutely positioned sr-only
          texts. Otherwise they escape the overflow clipping and widen the whole page. */}
      <div className="relative -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-3">
        {columns.map((status, index) => {
          const result = results[index];
          const size = sizes[status] ?? COLUMN_PAGE_SIZE;
          const page = result?.data;
          return (
            <BoardColumn
              key={status}
              status={status}
              page={page}
              isPending={result?.isPending ?? true}
              error={result?.isError ? result.error : null}
              onRetry={() => void result?.refetch()}
              dropState={stateOf(status)}
              movesFor={movesFor}
              onMove={onMove}
              canLoadMore={Boolean(
                page && page.totalCount > page.items.length && size < COLUMN_MAX_SIZE,
              )}
              isLoadingMore={Boolean(result?.isPlaceholderData && result.isFetching)}
              onLoadMore={() => {
                setSizes((current) => ({ ...current, [status]: COLUMN_MAX_SIZE }));
              }}
              listHref={`${paths.projectTasks(project.id)}?status=${status}`}
            />
          );
        })}
      </div>
      <DragOverlay>
        {active ? <TaskCardView task={active} className="rotate-1 shadow-xl" /> : null}
      </DragOverlay>
    </DndContext>
  );
}
