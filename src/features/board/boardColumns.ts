import { TASK_PRIORITY_META } from '@/constants/taskMeta';
import { type PagedTasks, type Task, type TaskItemStatus, type TaskQuery } from '@/types/api';

/** The four working columns; Cancelled is an optional fifth (Phase 1 §9, gap G7). */
export const MAIN_COLUMNS: readonly TaskItemStatus[] = ['Todo', 'InProgress', 'InReview', 'Done'];
export const COLUMN_PAGE_SIZE = 50;
/** The API's page-size limit: "Load more" grows a column to this, then links to the full list. */
export const COLUMN_MAX_SIZE = 100;

export interface BoardFilters {
  search: string;
  priority: string;
  assignee: string;
}

/** One column = one server query: the project, the status, the shared filters; most urgent first. */
export function columnQuery(
  projectId: number,
  status: TaskItemStatus,
  filters: BoardFilters,
  size: number,
): TaskQuery {
  return {
    ProjectId: projectId,
    Status: status,
    Search: filters.search.trim() || undefined,
    Priority: (filters.priority || undefined) as TaskQuery['Priority'],
    AssignedToId: filters.assignee || undefined,
    SortBy: 'Priority',
    SortDirection: 'Desc',
    Page: 1,
    PageSize: size,
  };
}

/** Removes a task from a column page (optimistic move, source column). */
export function withoutTask(page: PagedTasks | undefined, taskId: number): PagedTasks | undefined {
  if (!page?.items.some((t) => t.id === taskId)) return page;
  return {
    ...page,
    items: page.items.filter((t) => t.id !== taskId),
    totalCount: page.totalCount - 1,
  };
}

/**
 * Adds a task to a column page where the server would put it (priority, most urgent first), so the card
 * doesn't jump when the confirming refetch arrives.
 */
export function withTask(page: PagedTasks | undefined, task: Task): PagedTasks | undefined {
  if (!page) return page;
  const rank = TASK_PRIORITY_META[task.priority].rank;
  const index = page.items.findIndex((t) => TASK_PRIORITY_META[t.priority].rank < rank);
  const items = [...page.items];
  items.splice(index === -1 ? items.length : index, 0, task);
  return { ...page, items, totalCount: page.totalCount + 1 };
}
