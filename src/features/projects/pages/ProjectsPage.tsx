import { FolderKanban, LayoutGrid, Plus, Rows3 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { getErrorMessage, toApiError } from '@/api/apiError';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Skeleton } from '@/components/common/Skeleton';
import { Switch } from '@/components/common/Switch';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { SearchInput } from '@/components/forms/SearchInput';
import { PageHeader } from '@/components/layout/PageHeader';
import { type SortState } from '@/components/tables/DataTable';
import { Pagination } from '@/components/tables/Pagination';
import { paths } from '@/constants/routes';
import { canCreateProjects, hasAnyRole, useAuth } from '@/features/auth';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useUrlState } from '@/hooks/useUrlState';
import { type ProjectQuery, type ProjectSortField, type ProjectSummary } from '@/types/api';
import { cn } from '@/utils/cn';

import { DeleteProjectDialog } from '../components/DeleteProjectDialog';
import { ProjectCard } from '../components/ProjectCard';
import { ProjectFormModal } from '../components/ProjectFormModal';
import { ProjectsTable } from '../components/ProjectsTable';
import { useProjects } from '../hooks/useProjects';
import { canManageProject } from '../projectRules';

const SORT_FIELDS: readonly ProjectSortField[] = ['CreatedAt', 'Name', 'StartDate', 'EndDate'];
const SORT_LABELS: Record<ProjectSortField, string> = {
  CreatedAt: 'Newest first',
  Name: 'Name',
  StartDate: 'Start date',
  EndDate: 'End date',
};
const PAGE_SIZES = [12, 24, 48, 96] as const;

type Dialog =
  | { kind: 'create' }
  | { kind: 'edit'; project: ProjectSummary }
  | { kind: 'delete'; project: ProjectSummary }
  | null;

/** The backend's default direction per field: newest first for CreatedAt, ascending otherwise. */
function defaultDirection(field: ProjectSortField) {
  return field === 'CreatedAt' ? 'Desc' : 'Asc';
}

/**
 * /projects: the projects you own or belong to (Admins: all). Unlike categories, this list is PAGED, so
 * search, filter, sort and paging all happen on the server; the URL holds every choice
 * (?search=web&mine=true&sort=Name&dir=Asc&page=2&size=24&view=table).
 */
export function ProjectsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [url, updateUrl] = useUrlState({
    search: '',
    mine: '',
    sort: 'CreatedAt',
    dir: '',
    page: '1',
    size: '12',
    view: 'grid',
  });

  const sortBy: ProjectSortField = SORT_FIELDS.includes(url.sort as ProjectSortField)
    ? (url.sort as ProjectSortField)
    : 'CreatedAt';
  const direction = url.dir === 'Asc' || url.dir === 'Desc' ? url.dir : defaultDirection(sortBy);
  const pageSize = PAGE_SIZES.includes(Number(url.size) as (typeof PAGE_SIZES)[number])
    ? Number(url.size)
    : 12;
  const page = Math.max(1, Math.trunc(Number(url.page)) || 1);
  const ownedByMe = url.mine === 'true';
  const view = url.view === 'table' ? 'table' : 'grid';
  // The box updates the URL on every keystroke; the REQUEST waits until typing pauses.
  const search = useDebouncedValue(url.search.trim(), 300);

  const query: ProjectQuery = {
    Search: search || undefined,
    OwnedByMe: ownedByMe || undefined,
    SortBy: sortBy,
    SortDirection: direction,
    Page: page,
    PageSize: pageSize,
  };
  const projects = useProjects(query);
  const canCreate = canCreateProjects(user);
  const creatorNeedsVerification = hasAnyRole(user, ['Admin', 'Manager']) && !canCreate;
  const items = projects.data?.items ?? [];
  const totalCount = projects.data?.totalCount ?? 0;
  const filtered = Boolean(search) || ownedByMe;

  // A filter change starts again at page 1 (page 3 of the old result may not exist).
  const setFilter = (updates: Partial<typeof url>) => {
    updateUrl({ ...updates, page: '1' });
  };
  const sort: SortState = { columnId: sortBy, direction };

  const newButton = (
    <Button
      leftIcon={<Plus aria-hidden="true" />}
      disabled={!canCreate}
      onClick={() => {
        setDialog({ kind: 'create' });
      }}
    >
      New project
    </Button>
  );

  const emptyState = filtered ? (
    <EmptyState
      icon={FolderKanban}
      title="No projects match these filters"
      description={search ? `Nothing found for "${search}".` : 'You do not own any projects yet.'}
      action={
        <Button
          variant="secondary"
          onClick={() => {
            setFilter({ search: '', mine: '' });
          }}
        >
          Clear filters
        </Button>
      }
    />
  ) : (
    <EmptyState
      icon={FolderKanban}
      title="No projects yet"
      description={
        canCreate
          ? 'Create a project, then add members and tasks to it.'
          : 'When a manager adds you to a project, it will appear here.'
      }
      action={canCreate ? newButton : undefined}
    />
  );

  return (
    <>
      <PageHeader
        title="Projects"
        description="Projects you own or are a member of."
        actions={canCreate || creatorNeedsVerification ? newButton : null}
      />
      {creatorNeedsVerification ? (
        <p className="-mt-3 mb-5 text-sm text-warning">
          Verify your email address to create projects.
        </p>
      ) : null}

      {projects.isError && !projects.data ? (
        <Card>
          <ErrorState
            title="We couldn't load the projects"
            description={getErrorMessage(projects.error)}
            correlationId={toApiError(projects.error).correlationId}
            onRetry={() => void projects.refetch()}
            isRetrying={projects.isFetching}
          />
        </Card>
      ) : (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <SearchInput
              label="Search projects"
              placeholder="Search by name or description"
              value={url.search}
              onValueChange={(value) => {
                setFilter({ search: value });
              }}
              className="w-full sm:max-w-xs"
            />
            <div className="flex items-center gap-2">
              <Switch
                id="projects-owned-by-me"
                checked={ownedByMe}
                onCheckedChange={(checked) => {
                  setFilter({ mine: checked ? 'true' : '' });
                }}
              />
              <label htmlFor="projects-owned-by-me" className="text-sm text-foreground">
                Only projects I own
              </label>
            </div>
            <div className="flex items-center gap-2 text-sm sm:ml-auto">
              <label htmlFor="project-sort" className="text-muted-foreground">
                Sort by
              </label>
              <select
                id="project-sort"
                value={`${sortBy}:${direction}`}
                onChange={(event) => {
                  const [field, dir] = event.target.value.split(':') as [ProjectSortField, string];
                  setFilter({ sort: field, dir: dir === defaultDirection(field) ? '' : dir });
                }}
                className="h-9 rounded-lg border bg-surface px-2 text-sm text-foreground"
              >
                {SORT_FIELDS.flatMap((field) => {
                  const options = [
                    <option
                      key={`${field}:${defaultDirection(field)}`}
                      value={`${field}:${defaultDirection(field)}`}
                    >
                      {SORT_LABELS[field]}
                    </option>,
                  ];
                  const other = defaultDirection(field) === 'Asc' ? 'Desc' : 'Asc';
                  options.push(
                    <option key={`${field}:${other}`} value={`${field}:${other}`}>
                      {field === 'CreatedAt'
                        ? 'Oldest first'
                        : `${SORT_LABELS[field]} (descending)`}
                    </option>,
                  );
                  return options;
                })}
              </select>
            </div>
            <div role="group" aria-label="View" className="flex rounded-lg border p-0.5">
              {(
                [
                  ['grid', 'Cards', LayoutGrid],
                  ['table', 'Table', Rows3],
                ] as const
              ).map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={view === value}
                  onClick={() => {
                    updateUrl({ view: value });
                  }}
                  className={cn(
                    'inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium',
                    view === value
                      ? 'bg-primary-soft text-primary-soft-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon aria-hidden="true" className="size-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {projects.isError ? (
            <p role="alert" className="text-sm text-danger">
              Couldn't refresh the list: {getErrorMessage(projects.error)}
            </p>
          ) : null}

          {view === 'table' ? (
            <ProjectsTable
              projects={items}
              isLoading={projects.isPending}
              sort={sort}
              onSortChange={(next) => {
                const field = next.columnId as ProjectSortField;
                setFilter({
                  sort: field,
                  dir: next.direction === defaultDirection(field) ? '' : next.direction,
                });
              }}
              canManage={(project) => canManageProject(user, project)}
              onEdit={(project) => {
                setDialog({ kind: 'edit', project });
              }}
              onDelete={(project) => {
                setDialog({ kind: 'delete', project });
              }}
              emptyState={emptyState}
            />
          ) : projects.isPending ? (
            <div
              role="status"
              aria-label="Loading projects"
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
            >
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={index} className="h-64 rounded-xl" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <Card>{emptyState}</Card>
          ) : (
            <ul
              aria-label="Projects"
              className={cn(
                'grid gap-4 sm:grid-cols-2 xl:grid-cols-3',
                projects.isPlaceholderData && 'opacity-60 transition-opacity',
              )}
              aria-busy={projects.isPlaceholderData}
            >
              {items.map((project) => (
                <li key={project.id} className="grid">
                  <ProjectCard
                    project={project}
                    isOwner={project.ownerId === user?.id}
                    canManage={canManageProject(user, project)}
                    onEdit={() => {
                      setDialog({ kind: 'edit', project });
                    }}
                    onDelete={() => {
                      setDialog({ kind: 'delete', project });
                    }}
                  />
                </li>
              ))}
            </ul>
          )}

          {projects.data && totalCount > 0 ? (
            <Pagination
              page={page}
              pageSize={pageSize}
              totalCount={totalCount}
              pageSizeOptions={PAGE_SIZES}
              itemLabel="projects"
              onPageChange={(next) => {
                updateUrl({ page: String(next) });
              }}
              onPageSizeChange={(size) => {
                setFilter({ size: String(size) });
              }}
            />
          ) : null}
        </div>
      )}

      {dialog?.kind === 'create' ? (
        <ProjectFormModal
          onClose={() => {
            setDialog(null);
          }}
          onSaved={(project) => {
            void navigate(paths.project(project.id));
          }}
        />
      ) : null}
      {dialog?.kind === 'edit' ? (
        <ProjectFormModal
          project={dialog.project}
          onClose={() => {
            setDialog(null);
          }}
        />
      ) : null}
      {dialog?.kind === 'delete' ? (
        <DeleteProjectDialog
          project={dialog.project}
          onClose={() => {
            setDialog(null);
          }}
        />
      ) : null}
    </>
  );
}
