import { describe, expect, it } from 'vitest';

import { columnQuery, withoutTask, withTask } from '@/features/board/boardColumns';

import { buildPagedTasks, buildTask } from '../../../mocks/factories/tasks';

describe('board columns', () => {
  it('asks for one status of one project, filtered, most urgent first', () => {
    expect(
      columnQuery(7, 'InReview', { search: ' api ', priority: 'High', assignee: 'u1' }, 50),
    ).toEqual({
      ProjectId: 7,
      Status: 'InReview',
      Search: 'api',
      Priority: 'High',
      AssignedToId: 'u1',
      SortBy: 'Priority',
      SortDirection: 'Desc',
      Page: 1,
      PageSize: 50,
    });
    expect(
      columnQuery(7, 'Todo', { search: '', priority: '', assignee: '' }, 50),
    ).not.toHaveProperty('Search', '');
  });

  it('removes a moved card from its column and lowers the count', () => {
    const a = buildTask({ id: 1 });
    const b = buildTask({ id: 2 });
    const page = buildPagedTasks([a, b], 1, 50, 7);
    expect(withoutTask(page, 1)).toMatchObject({ items: [b], totalCount: 6 });
    expect(withoutTask(page, 99)).toBe(page); // not there: unchanged
  });

  it('inserts a moved card where the server will put it (priority order) and raises the count', () => {
    const critical = buildTask({ id: 1, priority: 'Critical' });
    const low = buildTask({ id: 2, priority: 'Low' });
    const page = buildPagedTasks([critical, low], 1, 50, 2);
    const high = buildTask({ id: 3, priority: 'High' });
    expect(withTask(page, high)?.items.map((t) => t.id)).toEqual([1, 3, 2]);
    expect(withTask(page, high)?.totalCount).toBe(3);
    expect(withTask(page, buildTask({ id: 4, priority: 'Low' }))?.items.map((t) => t.id)).toEqual([
      1, 2, 4,
    ]);
  });
});
