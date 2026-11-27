import { describe, expect, it } from 'vitest';

import { addDays, calendarDaysBetween, formatRelativeDay, formatTimeAgo } from '@/utils/dates';

// A fixed "now" in local time, so results don't depend on when the tests run.
const now = new Date(2026, 10, 27, 15, 30); // 27 Nov 2026, 15:30 local
const local = (day: number, hour = 12) => new Date(2026, 10, day, hour).toISOString();

describe('calendarDaysBetween', () => {
  it('counts calendar days in local time, not 24-hour blocks', () => {
    expect(calendarDaysBetween(now, new Date(2026, 10, 27, 23, 59))).toBe(0);
    expect(calendarDaysBetween(now, new Date(2026, 10, 28, 0, 1))).toBe(1); // 9 minutes later, next day
    expect(calendarDaysBetween(now, new Date(2026, 10, 25, 23, 0))).toBe(-2);
  });
});

describe('formatRelativeDay', () => {
  it.each([
    [local(27), 'Today'],
    [local(28), 'Tomorrow'],
    [local(26), 'Yesterday'],
    [local(30), 'In 3 days'],
    [local(22), '5 days ago'],
  ])('%s → %s', (iso, expected) => {
    expect(formatRelativeDay(iso, now, 'en')).toBe(expected);
  });
});

describe('formatTimeAgo', () => {
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

  it.each([
    [10_000, 'just now'],
    [5 * 60_000, '5 minutes ago'],
    [3 * 3_600_000, '3 hours ago'],
    [26 * 3_600_000, 'yesterday'],
    [4 * 86_400_000, '4 days ago'],
  ])('%i ms ago → %s', (ms, expected) => {
    expect(formatTimeAgo(ago(ms), now, 'en')).toBe(expected);
  });
});

describe('addDays', () => {
  it('adds whole days', () => {
    expect(addDays(new Date('2026-11-27T00:00:00Z'), 7).toISOString()).toBe(
      '2026-12-04T00:00:00.000Z',
    );
  });
});
