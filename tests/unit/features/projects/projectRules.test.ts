import { describe, expect, it } from 'vitest';

import {
  canManageProject,
  completionPercent,
  formatProjectDates,
  localToday,
  projectTimeline,
} from '@/features/projects/projectRules';

import { buildUser } from '../../../mocks/factories/users';

describe('projectTimeline (derived from calendar dates)', () => {
  const today = '2026-11-27';
  it.each([
    [{ startDate: null, endDate: null }, 'unscheduled'],
    [{ startDate: '2026-12-01', endDate: null }, 'upcoming'],
    [{ startDate: '2026-11-27', endDate: '2026-11-27' }, 'active'], // first and last day count as active
    [{ startDate: null, endDate: '2026-11-26' }, 'ended'],
    [{ startDate: '2026-11-01', endDate: null }, 'active'],
  ] as const)('%o → %s', (dates, expected) => {
    expect(projectTimeline(dates, today)).toBe(expected);
  });

  it('uses the LOCAL date, not UTC', () => {
    expect(localToday(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
});

describe('formatProjectDates', () => {
  it('formats calendar dates without shifting them by the time zone', () => {
    expect(formatProjectDates({ startDate: '2026-03-01', endDate: '2026-03-15' }, 'en-GB')).toBe(
      '1 Mar 2026 – 15 Mar 2026',
    );
    expect(formatProjectDates({ startDate: '2026-03-01', endDate: null }, 'en-GB')).toBe(
      'From 1 Mar 2026',
    );
    expect(formatProjectDates({ startDate: null, endDate: '2026-03-15' }, 'en-GB')).toBe(
      'Until 15 Mar 2026',
    );
    expect(formatProjectDates({ startDate: null, endDate: null })).toBeNull();
  });
});

describe('completionPercent (same formula as the backend)', () => {
  it('ignores cancelled tasks and rounds to one decimal', () => {
    expect(completionPercent(4, 3, 1)).toBe(100);
    expect(completionPercent(3, 1, 0)).toBe(33.3);
    expect(completionPercent(2, 0, 2)).toBe(0);
    expect(completionPercent(0, 0, 0)).toBe(0);
  });
});

describe('canManageProject (UX only; the API decides)', () => {
  const owner = buildUser({ roles: ['Manager'] });
  it('allows the owner and Admins, nobody else', () => {
    expect(canManageProject(owner, { ownerId: owner.id })).toBe(true);
    expect(canManageProject(buildUser({ roles: ['Admin'] }), { ownerId: owner.id })).toBe(true);
    expect(canManageProject(buildUser({ roles: ['Manager'] }), { ownerId: owner.id })).toBe(false);
    expect(canManageProject(null, { ownerId: owner.id })).toBe(false);
  });
});
