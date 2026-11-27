import { Ellipsis, Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { getErrorMessage, toApiError } from '@/api/apiError';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/common/DropdownMenu';
import { IconButton } from '@/components/common/IconButton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { SearchInput } from '@/components/forms/SearchInput';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, type DataTableColumn, type SortState } from '@/components/tables/DataTable';
import { canManageCategories, isAdmin, useAuth } from '@/features/auth';
import { useUrlState } from '@/hooks/useUrlState';
import { type Category, type SortDirection } from '@/types/api';
import { formatDate } from '@/utils/dates';

import { CategoryFormModal } from '../components/CategoryFormModal';
import { DeleteCategoryDialog } from '../components/DeleteCategoryDialog';
import { useCategories } from '../hooks/useCategories';

type SortColumn = 'Name' | 'CreatedAt';
type Dialog =
  | { kind: 'create' }
  | { kind: 'edit'; category: Category }
  | { kind: 'delete'; category: Category }
  | null;

const SORTERS: Record<SortColumn, (a: Category, b: Category) => number> = {
  Name: (a, b) => a.name.localeCompare(b.name),
  CreatedAt: (a, b) => a.createdAtUtc.localeCompare(b.createdAtUtc),
};

function matches(category: Category, term: string): boolean {
  const needle = term.trim().toLocaleLowerCase();
  if (!needle) return true;
  return (
    category.name.toLocaleLowerCase().includes(needle) ||
    (category.description?.toLocaleLowerCase().includes(needle) ?? false)
  );
}

/**
 * /categories (Phase 1 §1): everyone can read; Admins with a verified email manage them.
 * The list is small and unpaged (GET /api/categories), so search and sort happen in the browser;
 * both are kept in the URL (?search=…&sort=CreatedAt&dir=Desc).
 */
export function CategoriesPage() {
  const { user } = useAuth();
  const categories = useCategories();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [urlState, updateUrl] = useUrlState({ search: '', sort: 'Name', dir: 'Asc' });
  const { search, sort: sortColumn, dir: sortDirection } = urlState;
  const setSearch = (value: string) => {
    updateUrl({ search: value });
  };

  const canManage = canManageCategories(user);
  const adminNeedsVerification = isAdmin(user) && !canManage;
  const sort: SortState = {
    columnId: sortColumn in SORTERS ? sortColumn : 'Name',
    direction: sortDirection === 'Desc' ? 'Desc' : 'Asc',
  };

  const rows = useMemo(() => {
    const list = (categories.data ?? []).filter((category) => matches(category, search));
    const sorter = SORTERS[sort.columnId as SortColumn];
    list.sort(sorter);
    return sort.direction === 'Desc' ? list.reverse() : list;
  }, [categories.data, search, sort.columnId, sort.direction]);

  const columns: DataTableColumn<Category>[] = [
    {
      id: 'Name',
      header: 'Name',
      sortable: true,
      cell: (category) => (
        <div className="min-w-0">
          <p className="font-medium text-foreground">{category.name}</p>
          {category.description ? (
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground md:hidden">
              {category.description}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: 'Description',
      header: 'Description',
      hideBelow: 'md',
      cell: (category) =>
        category.description ? (
          <span className="line-clamp-2 text-muted-foreground">{category.description}</span>
        ) : (
          <span className="text-muted-foreground/70">—</span>
        ),
    },
    {
      id: 'CreatedAt',
      header: 'Created',
      sortable: true,
      hideBelow: 'lg',
      className: 'whitespace-nowrap',
      cell: (category) => (
        <span className="text-muted-foreground">{formatDate(category.createdAtUtc)}</span>
      ),
    },
  ];

  if (canManage) {
    columns.push({
      id: 'Actions',
      header: 'Actions',
      className: 'w-12 text-right',
      cell: (category) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton label={`Actions for ${category.name}`} icon={<Ellipsis />} size="sm" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onSelect={() => {
                setDialog({ kind: 'edit', category });
              }}
            >
              <Pencil aria-hidden="true" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="danger"
              onSelect={() => {
                setDialog({ kind: 'delete', category });
              }}
            >
              <Trash2 aria-hidden="true" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    });
  }

  const newButton = (
    <Button
      leftIcon={<Plus aria-hidden="true" />}
      disabled={!canManage}
      onClick={() => {
        setDialog({ kind: 'create' });
      }}
    >
      New category
    </Button>
  );

  const total = categories.data?.length ?? 0;
  const emptyState =
    total === 0 ? (
      <EmptyState
        icon={Tags}
        title="No categories yet"
        description={
          canManage
            ? 'Create categories such as Bug, Feature or Documentation to label tasks across projects.'
            : 'An administrator can create categories to label tasks across projects.'
        }
        action={canManage ? newButton : undefined}
      />
    ) : (
      <EmptyState
        icon={Tags}
        title={`No categories match "${search.trim()}"`}
        description="Try a different word, or clear the search."
        action={
          <Button
            variant="secondary"
            onClick={() => {
              setSearch('');
            }}
          >
            Clear search
          </Button>
        }
      />
    );

  return (
    <>
      <PageHeader
        title="Categories"
        description="Labels such as Bug or Feature that group tasks across projects."
        actions={canManage || adminNeedsVerification ? newButton : null}
      />

      {/* The reason is visible TEXT, not a tooltip: touch and screen-reader users must get it too. */}
      {adminNeedsVerification ? (
        <p className="-mt-3 mb-5 text-sm text-warning">
          Verify your email address to manage categories.
        </p>
      ) : !isAdmin(user) ? (
        <p className="-mt-3 mb-5 text-sm text-muted-foreground">
          Categories are managed by administrators.
        </p>
      ) : null}

      {categories.isError ? (
        <Card>
          <ErrorState
            title="We couldn't load the categories"
            description={getErrorMessage(categories.error)}
            correlationId={toApiError(categories.error).correlationId}
            onRetry={() => void categories.refetch()}
            isRetrying={categories.isFetching}
          />
        </Card>
      ) : (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SearchInput
              label="Search categories"
              placeholder="Search by name or description"
              value={search}
              onValueChange={setSearch}
              className="w-full sm:max-w-sm"
            />
            {categories.data ? (
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {search.trim()
                  ? `${rows.length} of ${total} ${total === 1 ? 'category' : 'categories'} match`
                  : `${total} ${total === 1 ? 'category' : 'categories'}`}
              </p>
            ) : null}
          </div>
          <DataTable
            caption="Categories"
            columns={columns}
            rows={rows}
            getRowId={(category) => category.id}
            isLoading={categories.isPending}
            sort={sort}
            onSortChange={(next) => {
              updateUrl({ sort: next.columnId, dir: next.direction satisfies SortDirection });
            }}
            emptyState={emptyState}
          />
        </div>
      )}

      {dialog?.kind === 'create' ? (
        <CategoryFormModal
          onClose={() => {
            setDialog(null);
          }}
        />
      ) : null}
      {dialog?.kind === 'edit' ? (
        <CategoryFormModal
          category={dialog.category}
          onClose={() => {
            setDialog(null);
          }}
        />
      ) : null}
      {dialog?.kind === 'delete' ? (
        <DeleteCategoryDialog
          category={dialog.category}
          onClose={() => {
            setDialog(null);
          }}
        />
      ) : null}
    </>
  );
}
