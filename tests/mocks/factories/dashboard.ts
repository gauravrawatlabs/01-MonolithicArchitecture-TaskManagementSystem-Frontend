import { type DashboardResponse } from '@/types/api';

/**
 * A DashboardResponse shaped like the real one (dictionary keys are enum NAMES, every key present).
 * Default: a small, non-empty workspace.
 */
export function buildDashboard(overrides: Partial<DashboardResponse> = {}): DashboardResponse {
  return {
    generatedAtUtc: '2026-11-27T12:00:00Z',
    scope: 'MyProjects',
    projectCount: 3,
    tasks: { total: 42, open: 25, overdue: 4, dueInNext7Days: 9, completedInLast7Days: 6 },
    myWork: { assignedOpen: 7, assignedOverdue: 2, assignedDueInNext7Days: 3 },
    tasksByStatus: { Todo: 12, InProgress: 8, InReview: 5, Done: 15, Cancelled: 2 },
    tasksByPriority: { Low: 6, Medium: 20, High: 11, Critical: 5 },
    projects: [
      {
        projectId: 1,
        name: 'Website Redesign',
        totalTasks: 20,
        openTasks: 12,
        doneTasks: 8,
        overdueTasks: 3,
        completionPercent: 40,
      },
      {
        projectId: 2,
        name: 'Mobile App',
        totalTasks: 15,
        openTasks: 9,
        doneTasks: 5,
        overdueTasks: 1,
        completionPercent: 35.7,
      },
      {
        projectId: 3,
        name: 'API Integration',
        totalTasks: 7,
        openTasks: 4,
        doneTasks: 2,
        overdueTasks: 0,
        completionPercent: 28.6,
      },
    ],
    ...overrides,
  };
}

/** A brand-new user: everything zero, no projects (the real API's answer, verified in Phase 8). */
export function buildEmptyDashboard(): DashboardResponse {
  return buildDashboard({
    projectCount: 0,
    tasks: { total: 0, open: 0, overdue: 0, dueInNext7Days: 0, completedInLast7Days: 0 },
    myWork: { assignedOpen: 0, assignedOverdue: 0, assignedDueInNext7Days: 0 },
    tasksByStatus: { Todo: 0, InProgress: 0, InReview: 0, Done: 0, Cancelled: 0 },
    tasksByPriority: { Low: 0, Medium: 0, High: 0, Critical: 0 },
    projects: [],
  });
}
