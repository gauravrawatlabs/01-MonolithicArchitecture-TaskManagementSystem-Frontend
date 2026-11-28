import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { type ReactNode } from 'react';

import { Skeleton } from '@/components/common/Skeleton';
import { type SortDirection } from '@/types/api';
import { cn } from '@/utils/cn';

export interface DataTableColumn<TRow> {
  /** Unique id; also the sort key sent to the backend (e.g. "DueDate"). */
  id: string;
  header: string;
  cell: (row: TRow) => ReactNode;
  sortable?: boolean;
  /**
   * Direction of the FIRST click on this column (default Asc). Use Desc where "most first" is the natural
   * order, e.g. priority (most urgent first) or "updated" (newest first).
   */
  firstSortDirection?: SortDirection;
  /** Hide on small screens to keep the table readable. */
  hideBelow?: 'md' | 'lg';
  className?: string;
}

export interface SortState {
  columnId: string;
  direction: SortDirection;
}

export interface DataTableProps<TRow> {
  columns: readonly DataTableColumn<TRow>[];
  rows: readonly TRow[];
  getRowId: (row: TRow) => string | number;
  /** Required accessible name, e.g. "Tasks" (rendered as a visually hidden caption). */
  caption: string;
  sort?: SortState;
  onSortChange?: (sort: SortState) => void;
  isLoading?: boolean;
  /** Rendered instead of rows when there is no data and nothing is loading. */
  emptyState?: ReactNode;
  skeletonRows?: number;
  className?: string;
}

const hideClass = { md: 'hidden md:table-cell', lg: 'hidden lg:table-cell' } as const;

/**
 * Generic, presentational table: it renders what it gets and REPORTS sort clicks; the page
 * decides what to fetch (sorting/paging happen on the server, the URL holds the state).
 */
export function DataTable<TRow>({
  columns,
  rows,
  getRowId,
  caption,
  sort,
  onSortChange,
  isLoading = false,
  emptyState,
  skeletonRows = 5,
  className,
}: DataTableProps<TRow>) {
  const handleSort = (columnId: string) => {
    if (!onSortChange) return;
    const first = columns.find((column) => column.id === columnId)?.firstSortDirection ?? 'Asc';
    let direction: SortDirection = first;
    if (sort?.columnId === columnId) direction = sort.direction === 'Asc' ? 'Desc' : 'Asc';
    onSortChange({ columnId, direction });
  };

  return (
    <div className={cn('overflow-x-auto rounded-xl border bg-surface', className)}>
      <table
        className="w-full border-collapse text-left text-sm"
        aria-busy={isLoading || undefined}
      >
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-surface-muted text-xs font-medium text-muted-foreground">
          <tr>
            {columns.map((column) => {
              const isSorted = sort?.columnId === column.id;
              const ariaSort = isSorted
                ? sort.direction === 'Asc'
                  ? 'ascending'
                  : 'descending'
                : undefined;
              const SortIcon = !isSorted
                ? ArrowUpDown
                : sort.direction === 'Asc'
                  ? ArrowUp
                  : ArrowDown;

              return (
                <th
                  key={column.id}
                  scope="col"
                  aria-sort={ariaSort}
                  className={cn(
                    'px-4 py-3 whitespace-nowrap',
                    column.hideBelow && hideClass[column.hideBelow],
                    column.className,
                  )}
                >
                  {column.sortable && onSortChange ? (
                    <button
                      type="button"
                      onClick={() => {
                        handleSort(column.id);
                      }}
                      className="-mx-1 inline-flex items-center gap-1 rounded px-1 hover:text-foreground"
                    >
                      {column.header}
                      <SortIcon
                        aria-hidden="true"
                        className={cn('size-3.5', !isSorted && 'opacity-50')}
                      />
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y">
          {isLoading ? (
            Array.from({ length: skeletonRows }, (_, rowIndex) => (
              <tr key={`skeleton-${rowIndex}`}>
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className={cn('px-4 py-3.5', column.hideBelow && hideClass[column.hideBelow])}
                  >
                    <Skeleton className="h-4 w-3/4" />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                {emptyState ?? <p className="p-8 text-center text-muted-foreground">No results.</p>}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={getRowId(row)} className="transition-colors hover:bg-surface-muted/60">
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className={cn(
                      'px-4 py-3 align-middle',
                      column.hideBelow && hideClass[column.hideBelow],
                      column.className,
                    )}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
