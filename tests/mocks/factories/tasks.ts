import { type PagedTasks, type Task } from '@/types/api';

let sequence = 0;

/** A backend TaskResponse (typed with the generated DTO). Override only what the test cares about. */
export function buildTask(overrides: Partial<Task> = {}): Task {
  sequence += 1;
  return {
    id: 1000 + sequence,
    title: `Task ${sequence}`,
    description: null,
    status: 'Todo',
    priority: 'Medium',
    dueDateUtc: null,
    completedAtUtc: null,
    isOverdue: false,
    projectId: 1,
    projectName: 'Website Redesign',
    categoryId: null,
    categoryName: null,
    createdById: '00000000-0000-4000-9000-000000000001',
    createdByName: 'Test User',
    assignedToId: null,
    assignedToName: null,
    createdAtUtc: '2026-11-20T09:00:00Z',
    updatedAtUtc: null,
    ...overrides,
  };
}

/** A PagedResult<TaskResponse> exactly as the API returns it (computed fields included). */
export function buildPagedTasks(
  items: Task[],
  page = 1,
  pageSize = 20,
  totalCount = items.length,
): PagedTasks {
  const totalPages = Math.ceil(totalCount / pageSize);
  return {
    items,
    page,
    pageSize,
    totalCount,
    totalPages,
    hasPreviousPage: page > 1,
    hasNextPage: page < totalPages,
  };
}
