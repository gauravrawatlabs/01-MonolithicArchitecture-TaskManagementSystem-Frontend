import { ListTodo, Plus, SlidersHorizontal } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import { getErrorMessage, toApiError } from '@/api/apiError';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Select } from '@/components/common/Select';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { SearchInput } from '@/components/forms/SearchInput';
import { Pagination } from '@/components/tables/Pagination';
import { paths } from '@/constants/routes';
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_META,
  TASK_STATUSES,
  TASK_STATUS_META,
} from '@/constants/taskMeta';
import { usePreferences } from '@/contexts/preferences';
import { useAuth } from '@/features/auth';
import { useCategories } from '@/features/categories';
import { useProjects } from '@/features/projects';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useUrlState } from '@/hooks/useUrlState';
import { type Task, type TaskSortField } from '@/types/api';
import { cn } from '@/utils/cn';

import { useTasks } from '../hooks/useTasks';
import { canCreateTasks, VERIFY_TO_CHANGE_TASKS } from '../taskRules';
import {
  defaultDirection,
  DUE_PRESETS,
  dueRange,
  PAGE_SIZES,
  TASK_URL_DEFAULTS,
  type TaskUrlState,
  toTaskQuery,
} from '../taskFilters';
import { DeleteTaskDialog } from './DeleteTaskDialog';
import { TaskFormModal } from './TaskFormModal';
import { TaskTable } from './TaskTable';

type Dialog =
  { kind: 'create' } | { kind: 'edit'; task: Task } | { kind: 'delete'; task: Task } | null;

export interface TaskListProps {
  /** Lists inside a project fix the project (no project filter, no project column, preset in the form). */
  projectId?: number;
  /** Text for the empty list when no filter is active. */
  emptyDescription: string;
}

/**
 * Filters + table + paging for tasks. Every choice lives in the URL; search, filters, sort and paging
 * run on the server (GET /api/tasks). Used by All tasks, My tasks and a project's Tasks tab.
 */
export function TaskList({ projectId, emptyDescription }: TaskListProps) {
  const { user } = useAuth();
  const canCreate = canCreateTasks(user);
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersId = useId();
  // Rows per page: the URL wins (?size=); otherwise this device's preference (Settings › Preferences).
  const { preferences } = usePreferences();
  const [url, updateUrl] = useUrlState({
    ...TASK_URL_DEFAULTS,
    size: String(preferences.pageSize),
  });
  const categories = useCategories();
  const inProject = projectId !== undefined;
  const projects = useProjects({ SortBy: 'Name', SortDirection: 'Asc', Page: 1, PageSize: 100 });

  // The search box updates the URL on every keystroke; the REQUEST waits until typing pauses.
  const search = useDebouncedValue(url.search, 300);
  // A due-date preset becomes concrete instants ONCE per choice: recomputing "now" on every render
  // would change the query key every time and refetch forever.
  const range = useMemo(() => dueRange(url.due, new Date()), [url.due]);
  const query = toTaskQuery({ ...url, search }, range, inProject ? { ProjectId: projectId } : {});
  const tasks = useTasks(query);
  const items = tasks.data?.items ?? [];
  const totalCount = tasks.data?.totalCount ?? 0;

  const setFilter = (updates: Partial<TaskUrlState>) => {
    updateUrl({ ...updates, page: '1' }); // a different result may not have page 3
  };
  const activeFilters = [url.status, url.priority, url.category, url.project, url.due].filter(
    Boolean,
  ).length;
  const filtered = Boolean(url.search) || activeFilters > 0;
  const clearFilters = () => {
    setFilter({ search: '', status: '', priority: '', category: '', project: '', due: '' });
  };

  const newButton = canCreate ? (
    <Button
      leftIcon={<Plus aria-hidden="true" />}
      onClick={() => {
        setDialog({ kind: 'create' });
      }}
    >
      New task
    </Button>
  ) : null;

  const emptyState = filtered ? (
    <EmptyState
      icon={ListTodo}
      title="No tasks match these filters"
      description="Try fewer filters, or clear them."
      action={
        <Button variant="secondary" onClick={clearFilters}>
          Clear filters
        </Button>
      }
    />
  ) : (
    <EmptyState
      icon={ListTodo}
      title="No tasks yet"
      description={emptyDescription}
      action={newButton ?? undefined}
    />
  );

  const filterSelect = 'w-full md:w-auto';

  return (
    <div className="grid gap-4">
      {/* Visible text, not a tooltip on a disabled button: everyone gets the reason. */}
      {canCreate ? null : <p className="text-sm text-warning">{VERIFY_TO_CHANGE_TASKS}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          label="Search tasks"
          placeholder="Search title or description"
          value={url.search}
          onValueChange={(value) => {
            setFilter({ search: value });
          }}
          className="w-full sm:max-w-xs"
        />
        {/* Phones: the filters fold behind a button (they'd fill the whole first screen); md and up: always shown. */}
        <Button
          variant="secondary"
          className="md:hidden"
          leftIcon={<SlidersHorizontal aria-hidden="true" />}
          aria-expanded={filtersOpen}
          aria-controls={filtersId}
          onClick={() => {
            setFiltersOpen((open) => !open);
          }}
        >
          {activeFilters > 0 ? `Filters (${activeFilters})` : 'Filters'}
        </Button>
        <div
          id={filtersId}
          className={cn(
            'w-full flex-wrap items-center gap-3 md:flex md:w-auto',
            filtersOpen ? 'grid' : 'hidden',
          )}
        >
          <div className={filterSelect}>
            <Select
              aria-label="Status"
              value={url.status}
              onChange={(event) => {
                setFilter({ status: event.target.value });
              }}
              placeholder="All statuses"
              options={TASK_STATUSES.map((s) => ({ value: s, label: TASK_STATUS_META[s].label }))}
            />
          </div>
          <div className={filterSelect}>
            <Select
              aria-label="Priority"
              value={url.priority}
              onChange={(event) => {
                setFilter({ priority: event.target.value });
              }}
              placeholder="All priorities"
              options={TASK_PRIORITIES.map((p) => ({
                value: p,
                label: TASK_PRIORITY_META[p].label,
              }))}
            />
          </div>
          <div className={filterSelect}>
            <Select
              aria-label="Due date"
              value={url.due}
              onChange={(event) => {
                setFilter({ due: event.target.value });
              }}
              placeholder="Any due date"
              options={Object.entries(DUE_PRESETS).map(([value, label]) => ({ value, label }))}
            />
          </div>
          <div className={filterSelect}>
            <Select
              aria-label="Category"
              value={url.category}
              onChange={(event) => {
                setFilter({ category: event.target.value });
              }}
              placeholder="All categories"
              options={(categories.data ?? []).map((c) => ({ value: String(c.id), label: c.name }))}
            />
          </div>
          {inProject ? null : (
            <div className={filterSelect}>
              <Select
                aria-label="Project"
                value={url.project}
                onChange={(event) => {
                  setFilter({ project: event.target.value });
                }}
                placeholder="All projects"
                options={(projects.data?.items ?? []).map((p) => ({
                  value: String(p.id),
                  label: p.name,
                }))}
              />
            </div>
          )}
        </div>
        {filtered ? (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        ) : null}
        {newButton ? <div className="sm:ml-auto">{newButton}</div> : null}
      </div>

      {tasks.isError && !tasks.data ? (
        <Card>
          <ErrorState
            title="We couldn't load the tasks"
            description={getErrorMessage(tasks.error)}
            correlationId={toApiError(tasks.error).correlationId}
            onRetry={() => void tasks.refetch()}
            isRetrying={tasks.isFetching}
          />
        </Card>
      ) : (
        <>
          <div
            className={cn(tasks.isPlaceholderData && 'opacity-60 transition-opacity')}
            aria-busy={tasks.isPlaceholderData}
          >
            <TaskTable
              tasks={items}
              isLoading={tasks.isPending}
              sort={{
                columnId: query.SortBy ?? 'DueDate',
                direction: query.SortDirection ?? 'Asc',
              }}
              onSortChange={(next) => {
                const field = next.columnId as TaskSortField;
                setFilter({
                  sort: field,
                  dir: next.direction === defaultDirection(field) ? '' : next.direction,
                });
              }}
              showProject={!inProject}
              onEdit={(task) => {
                setDialog({ kind: 'edit', task });
              }}
              onDelete={(task) => {
                setDialog({ kind: 'delete', task });
              }}
              emptyState={emptyState}
            />
          </div>
          {totalCount > 0 ? (
            <Pagination
              page={query.Page ?? 1}
              pageSize={query.PageSize ?? 20}
              totalCount={totalCount}
              pageSizeOptions={PAGE_SIZES}
              itemLabel="tasks"
              onPageChange={(page) => {
                updateUrl({ page: String(page) });
              }}
              onPageSizeChange={(size) => {
                setFilter({ size: String(size) });
              }}
            />
          ) : null}
        </>
      )}

      {dialog?.kind === 'create' ? (
        <TaskFormModal
          projectId={projectId}
          onClose={() => {
            setDialog(null);
          }}
          onSaved={(task) => {
            void navigate(paths.task(task.id));
          }}
        />
      ) : null}
      {dialog?.kind === 'edit' ? (
        <TaskFormModal
          task={dialog.task}
          onClose={() => {
            setDialog(null);
          }}
        />
      ) : null}
      {dialog?.kind === 'delete' ? (
        <DeleteTaskDialog
          task={dialog.task}
          onClose={() => {
            setDialog(null);
          }}
        />
      ) : null}
    </div>
  );
}
