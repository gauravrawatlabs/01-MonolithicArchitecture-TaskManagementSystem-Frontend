import { describe, expect, it } from 'vitest';

import { dueRange, TASK_URL_DEFAULTS, toTaskQuery } from '@/features/tasks/taskFilters';

describe('task filters (URL → API query)', () => {
  it('uses the backend defaults: due date ascending, page 1, 20 per page', () => {
    expect(toTaskQuery(TASK_URL_DEFAULTS, {})).toEqual({
      SortBy: 'DueDate',
      SortDirection: 'Asc',
      Page: 1,
      PageSize: 20,
    });
  });

  it('maps every filter, sorts priority most urgent first, and ignores invalid values', () => {
    const query = toTaskQuery(
      {
        ...TASK_URL_DEFAULTS,
        search: ' api ',
        status: 'InReview',
        priority: 'Nope',
        category: '4',
        project: 'x',
        assignedToMe: 'true',
        sort: 'Priority',
        page: '-3',
        size: '7',
      },
      {},
    );
    expect(query).toEqual({
      Search: 'api',
      Status: 'InReview',
      CategoryId: 4,
      AssignedToMe: true,
      SortBy: 'Priority',
      SortDirection: 'Desc',
      Page: 1,
      PageSize: 20,
    });
  });

  it('lets the page fix filters (a project tab always asks for its project)', () => {
    expect(
      toTaskQuery({ ...TASK_URL_DEFAULTS, project: '9' }, {}, { ProjectId: 3 }).ProjectId,
    ).toBe(3);
  });

  it('turns due presets into instants: "today" is the LOCAL day, end exclusive', () => {
    const now = new Date(2026, 10, 27, 15, 20);
    const today = dueRange('today', now);
    const from = new Date(today.DueFrom ?? '');
    const to = new Date(today.DueTo ?? '');
    expect([from.getDate(), from.getHours(), from.getMinutes()]).toEqual([27, 0, 0]);
    expect([to.getDate(), to.getHours()]).toEqual([28, 0]);
    expect(dueRange('overdue', now)).toEqual({ Overdue: true });
    expect(dueRange('week', now).DueTo).toBe(new Date(2026, 11, 4, 15, 20).toISOString());
    expect(dueRange('', now)).toEqual({});
  });
});
