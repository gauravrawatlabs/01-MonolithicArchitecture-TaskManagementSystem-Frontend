import { TASK_PRIORITIES, TASK_STATUSES } from '@/constants/taskMeta';
import {
  type TaskItemStatus,
  type TaskPriority,
  type TaskQuery,
  type TaskSortField,
} from '@/types/api';

/** Every filter as it is kept in the URL (strings; '' = not set). */
export const TASK_URL_DEFAULTS = {
  search: '',
  status: '',
  priority: '',
  category: '',
  project: '',
  due: '',
  assignedToMe: '',
  sort: 'DueDate',
  dir: '',
  page: '1',
  size: '20',
};
export type TaskUrlState = typeof TASK_URL_DEFAULTS;

export const SORT_FIELDS: readonly TaskSortField[] = [
  'DueDate',
  'Priority',
  'Status',
  'Title',
  'CreatedAt',
  'UpdatedAt',
];
export const PAGE_SIZES = [10, 20, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 20;
export const DUE_PRESETS = {
  overdue: 'Overdue',
  today: 'Due today',
  week: 'Due in the next 7 days',
} as const;
export type DuePreset = keyof typeof DUE_PRESETS;

/** Backend defaults: Desc for Priority, CreatedAt and UpdatedAt (newest / most urgent first), Asc otherwise. */
export function defaultDirection(field: TaskSortField): 'Asc' | 'Desc' {
  return field === 'Priority' || field === 'CreatedAt' || field === 'UpdatedAt' ? 'Desc' : 'Asc';
}

/**
 * A due-date preset → DueFrom/DueTo/Overdue. "Today" means the reader's LOCAL day, sent as UTC instants
 * (DueFrom inclusive, DueTo exclusive, exactly as the API applies them).
 */
export function dueRange(
  preset: string,
  now: Date,
): Pick<TaskQuery, 'DueFrom' | 'DueTo' | 'Overdue'> {
  if (preset === 'overdue') return { Overdue: true };
  if (preset === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { DueFrom: start.toISOString(), DueTo: end.toISOString() };
  }
  if (preset === 'week') {
    const end = new Date(now);
    end.setDate(end.getDate() + 7);
    return { DueFrom: now.toISOString(), DueTo: end.toISOString() };
  }
  return {};
}

/** URL state (+ fixed filters from the page, e.g. the project) → the API query. Invalid values are ignored. */
export function toTaskQuery(
  url: TaskUrlState,
  range: ReturnType<typeof dueRange>,
  fixed: TaskQuery = {},
): TaskQuery {
  const sortBy = SORT_FIELDS.includes(url.sort as TaskSortField)
    ? (url.sort as TaskSortField)
    : 'DueDate';
  const size = Number(url.size);
  return {
    Search: url.search.trim() || undefined,
    Status: TASK_STATUSES.includes(url.status as TaskItemStatus)
      ? (url.status as TaskItemStatus)
      : undefined,
    Priority: TASK_PRIORITIES.includes(url.priority as TaskPriority)
      ? (url.priority as TaskPriority)
      : undefined,
    CategoryId: /^\d+$/.test(url.category) ? Number(url.category) : undefined,
    ProjectId: /^\d+$/.test(url.project) ? Number(url.project) : undefined,
    AssignedToMe: url.assignedToMe === 'true' || undefined,
    ...range,
    SortBy: sortBy,
    SortDirection: url.dir === 'Asc' || url.dir === 'Desc' ? url.dir : defaultDirection(sortBy),
    Page: Math.max(1, Math.trunc(Number(url.page)) || 1),
    PageSize: (PAGE_SIZES as readonly number[]).includes(size) ? size : DEFAULT_PAGE_SIZE,
    ...fixed,
  };
}
