import { TASK_STATUS_META } from '@/constants/taskMeta';
import { type Task, type TaskItemStatus } from '@/types/api';

/**
 * The board's drag-and-drop DECISIONS, kept free of dnd-kit and React so they can be unit-tested:
 * which column a key press jumps to, whether a drop may happen, how a column looks while dragging,
 * and what screen readers hear.
 */
const label = (status: TaskItemStatus) => TASK_STATUS_META[status].label;

export type DropState = 'idle' | 'allowed' | 'forbidden' | 'source';

/** ← / → from `from`: the neighbouring column, clamped at both ends. Other keys: null. */
export function nextColumn(
  order: readonly TaskItemStatus[],
  from: TaskItemStatus | undefined,
  key: string,
): TaskItemStatus | null {
  const step = key === 'ArrowRight' ? 1 : key === 'ArrowLeft' ? -1 : 0;
  if (step === 0) return null;
  const index = from ? order.indexOf(from) : -1;
  return order[Math.min(order.length - 1, Math.max(0, index + step))] ?? null;
}

/** A drop changes the status only onto another column the user may move to (otherwise: no API call). */
export function shouldMove(
  task: Pick<Task, 'status'>,
  to: TaskItemStatus | undefined,
  moves: readonly TaskItemStatus[],
) {
  return to !== undefined && to !== task.status && moves.includes(to);
}

/** How a column looks while a card is dragged. */
export function dropState(
  dragged: Pick<Task, 'status'> | null,
  column: TaskItemStatus,
  moves: readonly TaskItemStatus[],
): DropState {
  if (!dragged) return 'idle';
  if (column === dragged.status) return 'source';
  return moves.includes(column) ? 'allowed' : 'forbidden';
}

/** Screen-reader announcements for one drag, given the moves allowed for the dragged card. */
export const announce = {
  start: (task: Pick<Task, 'title' | 'status'>, moves: readonly TaskItemStatus[]) =>
    `Picked up ${task.title} from ${label(task.status)}. It can move to: ${moves.map(label).join(', ')}.`,
  /**
   * `previous` = the column last announced. Right after pick-up the card is over its OWN column: return
   * undefined (say nothing) so "Picked up…" isn't immediately replaced.
   */
  over: (
    task: Pick<Task, 'title' | 'status'>,
    over: TaskItemStatus | null,
    previous: TaskItemStatus | null,
    moves: readonly TaskItemStatus[],
  ): string | undefined => {
    if (!over) return `${task.title} is not over a column.`;
    if (over === task.status)
      return over === previous ? undefined : `${task.title} is back over ${label(over)}.`;
    return moves.includes(over) ? `Over ${label(over)}.` : `Over ${label(over)}: not allowed.`;
  },
  end: (
    task: Pick<Task, 'title' | 'status'>,
    to: TaskItemStatus | undefined,
    moves: readonly TaskItemStatus[],
  ) =>
    shouldMove(task, to, moves) && to
      ? `${task.title} moved to ${label(to)}.`
      : `${task.title} stays in ${label(task.status)}.`,
  cancel: (task: Pick<Task, 'title'>) => `Moving cancelled. ${task.title} stays where it was.`,
};
