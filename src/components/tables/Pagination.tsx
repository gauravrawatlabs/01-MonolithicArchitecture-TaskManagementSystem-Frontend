import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useId } from 'react';

import { cn } from '@/utils/cn';
import { getPageItems, getPageRange } from '@/utils/pagination';

export interface PaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  /** Must stay within the backend's limit (pageSize 1–100). */
  pageSizeOptions?: readonly number[];
  /** Noun for the summary: "Showing 1–20 of 148 tasks". */
  itemLabel?: string;
  className?: string;
}

const pageButton =
  'inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40';

/** Matches the backend's PagedResult: page (1-based), pageSize, totalCount. */
export function Pagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  itemLabel = 'items',
  className,
}: PaginationProps) {
  const pageSizeId = useId();
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const { from, to } = getPageRange(page, pageSize, totalCount);
  const items = getPageItems(page, totalPages);

  return (
    <div className={cn('flex flex-col items-center justify-between gap-3 sm:flex-row', className)}>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {totalCount === 0
          ? `No ${itemLabel}`
          : `Showing ${from}–${to} of ${totalCount} ${itemLabel}`}
      </p>

      <div className="flex items-center gap-4">
        {onPageSizeChange ? (
          <div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
            <label htmlFor={pageSizeId}>Per page</label>
            <select
              id={pageSizeId}
              value={pageSize}
              onChange={(event) => {
                onPageSizeChange(Number(event.target.value));
              }}
              className="h-9 rounded-lg border bg-surface px-2 text-sm text-foreground"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <nav aria-label="Pagination" className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={() => {
              onPageChange(page - 1);
            }}
            className={cn(pageButton, 'hover:bg-surface-muted')}
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </button>

          {items.map((item) =>
            typeof item === 'number' ? (
              <button
                key={item}
                type="button"
                aria-label={`Page ${item}`}
                aria-current={item === page ? 'page' : undefined}
                onClick={() => {
                  onPageChange(item);
                }}
                className={cn(
                  pageButton,
                  item === page
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-surface-muted',
                )}
              >
                {item}
              </button>
            ) : (
              <span key={item} aria-hidden="true" className="px-1 text-muted-foreground">
                …
              </span>
            ),
          )}

          <button
            type="button"
            aria-label="Next page"
            disabled={page >= totalPages}
            onClick={() => {
              onPageChange(page + 1);
            }}
            className={cn(pageButton, 'hover:bg-surface-muted')}
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </button>
        </nav>
      </div>
    </div>
  );
}
