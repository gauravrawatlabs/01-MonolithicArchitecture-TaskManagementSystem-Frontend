import { describe, expect, it } from 'vitest';

import { getPageItems, getPageRange } from '@/utils/pagination';

describe('getPageItems', () => {
  it('shows every page when there are only a few', () => {
    expect(getPageItems(1, 1)).toEqual([1]);
    expect(getPageItems(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('shows first, last, the current page with neighbours, and ellipses in the middle', () => {
    expect(getPageItems(5, 10)).toEqual([1, 'ellipsis-start', 4, 5, 6, 'ellipsis-end', 10]);
  });

  it('has no leading ellipsis near the start and no trailing ellipsis near the end', () => {
    expect(getPageItems(1, 10)).toEqual([1, 2, 'ellipsis-end', 10]);
    expect(getPageItems(10, 10)).toEqual([1, 'ellipsis-start', 9, 10]);
  });

  it('shows a single skipped page instead of an ellipsis that would hide just one page', () => {
    expect(getPageItems(4, 10)).toEqual([1, 2, 3, 4, 5, 'ellipsis-end', 10]);
    expect(getPageItems(7, 10)).toEqual([1, 'ellipsis-start', 6, 7, 8, 9, 10]);
  });

  it('clamps an out-of-range current page and handles zero pages', () => {
    expect(getPageItems(99, 3)).toEqual([1, 2, 3]);
    expect(getPageItems(0, 3)).toEqual([1, 2, 3]);
    expect(getPageItems(1, 0)).toEqual([]);
  });

  it('never repeats a page number', () => {
    for (let total = 1; total <= 15; total++) {
      for (let current = 1; current <= total; current++) {
        const numbers = getPageItems(current, total).filter((item) => typeof item === 'number');
        expect(new Set(numbers).size).toBe(numbers.length);
        expect(numbers).toContain(current);
      }
    }
  });
});

describe('getPageRange', () => {
  it('returns the 1-based item range for the page', () => {
    expect(getPageRange(1, 20, 148)).toEqual({ from: 1, to: 20 });
    expect(getPageRange(8, 20, 148)).toEqual({ from: 141, to: 148 });
  });

  it('returns zeros for an empty list', () => {
    expect(getPageRange(1, 20, 0)).toEqual({ from: 0, to: 0 });
  });
});
