export type PageItem = number | 'ellipsis-start' | 'ellipsis-end';

/**
 * The page buttons to show: always the first and last page, the current page with `siblings`
 * neighbours on each side, and an ellipsis where pages are skipped.
 *
 *   getPageItems(1, 3)   → [1, 2, 3]
 *   getPageItems(5, 10)  → [1, 'ellipsis-start', 4, 5, 6, 'ellipsis-end', 10]
 *
 * A gap of exactly one page shows that page instead of an ellipsis (an ellipsis would hide nothing).
 */
export function getPageItems(currentPage: number, totalPages: number, siblings = 1): PageItem[] {
  if (totalPages <= 0) {
    return [];
  }

  const current = Math.min(Math.max(1, currentPage), totalPages);
  const start = Math.max(2, current - siblings);
  const end = Math.min(totalPages - 1, current + siblings);
  const items: PageItem[] = [1];

  if (start > 3) {
    items.push('ellipsis-start');
  } else if (start === 3) {
    items.push(2);
  }

  for (let page = start; page <= end; page++) {
    items.push(page);
  }

  if (end < totalPages - 2) {
    items.push('ellipsis-end');
  } else if (end === totalPages - 2) {
    items.push(totalPages - 1);
  }

  if (totalPages > 1) {
    items.push(totalPages);
  }

  return items;
}

/** "Showing 21–40 of 148" numbers; both 0 when the list is empty. */
export function getPageRange(
  page: number,
  pageSize: number,
  totalCount: number,
): { from: number; to: number } {
  if (totalCount <= 0) {
    return { from: 0, to: 0 };
  }
  const from = (page - 1) * pageSize + 1;
  return { from, to: Math.min(page * pageSize, totalCount) };
}
