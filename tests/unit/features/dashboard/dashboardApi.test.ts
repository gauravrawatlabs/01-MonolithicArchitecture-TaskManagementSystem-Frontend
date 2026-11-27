import { describe, expect, it } from 'vitest';

import { toDashboard } from '@/features/dashboard/api/dashboardApi';

import { buildDashboard } from '../../../mocks/factories/dashboard';

describe('toDashboard (normalizing enum-keyed dictionaries)', () => {
  it('keeps the counts the API sends', () => {
    const dashboard = toDashboard(buildDashboard());

    expect(dashboard.tasksByStatus).toEqual({
      Todo: 12,
      InProgress: 8,
      InReview: 5,
      Done: 15,
      Cancelled: 2,
    });
    expect(dashboard.tasksByPriority).toEqual({ Low: 6, Medium: 20, High: 11, Critical: 5 });
  });

  it('fills missing keys with 0 and drops unknown keys, so components get a complete record', () => {
    const dashboard = toDashboard(
      buildDashboard({
        tasksByStatus: { Todo: 3, Archived: 99 },
        tasksByPriority: { High: 'x' as unknown as number },
      }),
    );

    expect(dashboard.tasksByStatus).toEqual({
      Todo: 3,
      InProgress: 0,
      InReview: 0,
      Done: 0,
      Cancelled: 0,
    });
    expect(dashboard.tasksByPriority).toEqual({ Low: 0, Medium: 0, High: 0, Critical: 0 });
  });

  it('marks the Admin scope', () => {
    expect(toDashboard(buildDashboard({ scope: 'AllProjects' })).coversAllProjects).toBe(true);
    expect(toDashboard(buildDashboard({ scope: 'MyProjects' })).coversAllProjects).toBe(false);
  });
});
