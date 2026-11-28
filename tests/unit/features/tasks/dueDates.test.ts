import { describe, expect, it } from 'vitest';

import {
  defaultDueInput,
  isAfterProjectEnd,
  localInputToUtc,
  utcToLocalInput,
} from '@/features/tasks/dueDates';

describe('due dates (local input ⇄ UTC instant), valid in any time zone', () => {
  it('round-trips a local date-time through UTC', () => {
    for (const local of ['2026-12-01T09:30', '2027-03-28T23:45', '2026-06-15T00:05']) {
      const utc = localInputToUtc(local);
      expect(utc).toMatch(/Z$/);
      expect(utcToLocalInput(utc)).toBe(local);
    }
  });

  it('treats empty or invalid input as "no due date"', () => {
    expect(localInputToUtc('')).toBeNull();
    expect(localInputToUtc('not-a-date')).toBeNull();
    expect(utcToLocalInput(null)).toBe('');
  });

  it('compares with the project end date by UTC calendar date, like the API', () => {
    // 23:30 in New York on the 31st is already the 1st in UTC: the API rejects it.
    expect(isAfterProjectEnd('2027-04-01T03:30:00.000Z', '2027-03-31')).toBe(true);
    expect(isAfterProjectEnd('2027-03-31T23:59:00.000Z', '2027-03-31')).toBe(false);
    expect(isAfterProjectEnd('2030-01-01T00:00:00.000Z', null)).toBe(false);
  });

  it('suggests 17:00 today, or tomorrow once that has passed', () => {
    expect(defaultDueInput(new Date(2026, 10, 27, 9, 0))).toBe('2026-11-27T17:00');
    expect(defaultDueInput(new Date(2026, 10, 27, 18, 0))).toBe('2026-11-28T17:00');
  });
});
