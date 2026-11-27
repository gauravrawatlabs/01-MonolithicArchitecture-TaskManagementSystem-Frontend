import { describe, expect, it } from 'vitest';

import { formatCount, formatPercent } from '@/utils/numbers';

describe('formatCount (exact below 10,000; compact above)', () => {
  it.each([
    [0, '0'],
    [1284, '1,284'],
    [9999, '9,999'],
    [12_900, '12.9K'],
    [4_200_000, '4.2M'],
  ])('%i → %s', (value, expected) => {
    expect(formatCount(value, 'en-US')).toBe(expected);
  });
});

describe('formatPercent', () => {
  it.each([
    [33.333, '33.3%'],
    [100, '100%'],
    [0, '0%'],
  ])('%f → %s', (value, expected) => {
    expect(formatPercent(value, 'en-US')).toBe(expected);
  });
});
