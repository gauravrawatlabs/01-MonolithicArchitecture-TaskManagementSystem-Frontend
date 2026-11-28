import { Link } from 'react-router';

import { DataTable, type DataTableColumn, type SortState } from '@/components/tables/DataTable';
import { paths } from '@/constants/routes';
import { type Task } from '@/types/api';
import { formatTimeAgo } from '@/utils/dates';

import { defaultDirection } from '../taskFilters';
import { DueDate } from './DueDate';
import { PriorityBadge } from './PriorityBadge';
import { StatusBadge } from './StatusBadge';
import { TaskRowActions } from './TaskRowActions';

export interface TaskTableProps {
  tasks: readonly Task[];
  isLoading: boolean;
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  /** Show the project under the title (lists that span several projects). */
  showProject: boolean;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  emptyState: React.ReactNode;
}

/** Tasks as a table. Sortable columns are exactly the backend's TaskSortField values. */
export function TaskTable({
  tasks,
  isLoading,
  sort,
  onSortChange,
  showProject,
  onEdit,
  onDelete,
  emptyState,
}: TaskTableProps) {
  const columns: DataTableColumn<Task>[] = [
    {
      id: 'Title',
      firstSortDirection: defaultDirection('Title'),
      header: 'Task',
      sortable: true,
      cell: (task) => (
        <div className="min-w-0">
          <Link to={paths.task(task.id)} className="font-medium text-foreground hover:underline">
            {task.title}
          </Link>
          {showProject || task.categoryName ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {[showProject ? task.projectName : null, task.categoryName]
                .filter(Boolean)
                .join(' · ')}
            </p>
          ) : null}
          {/* On phones the status and due date columns are hidden: show them here instead. */}
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs md:hidden">
            <StatusBadge status={task.status} />
            <DueDate task={task} compact />
          </div>
        </div>
      ),
    },
    {
      id: 'Status',
      firstSortDirection: defaultDirection('Status'),
      header: 'Status',
      sortable: true,
      hideBelow: 'md',
      cell: (task) => <StatusBadge status={task.status} />,
    },
    {
      id: 'Priority',
      firstSortDirection: defaultDirection('Priority'),
      header: 'Priority',
      sortable: true,
      cell: (task) => <PriorityBadge priority={task.priority} />,
    },
    {
      id: 'DueDate',
      firstSortDirection: defaultDirection('DueDate'),
      header: 'Due',
      sortable: true,
      hideBelow: 'md',
      className: 'text-sm',
      cell: (task) => <DueDate task={task} />,
    },
    {
      id: 'Assignee',
      header: 'Assignee',
      hideBelow: 'lg',
      cell: (task) => (
        <span className="text-muted-foreground">{task.assignedToName ?? 'Unassigned'}</span>
      ),
    },
    {
      id: 'UpdatedAt',
      firstSortDirection: defaultDirection('UpdatedAt'),
      header: 'Updated',
      sortable: true,
      hideBelow: 'lg',
      className: 'whitespace-nowrap',
      cell: (task) => (
        <span className="text-muted-foreground">
          {formatTimeAgo(task.updatedAtUtc ?? task.createdAtUtc)}
        </span>
      ),
    },
    {
      id: 'Actions',
      header: 'Actions',
      className: 'w-12 text-right',
      cell: (task) => <TaskRowActions task={task} onEdit={onEdit} onDelete={onDelete} />,
    },
  ];

  return (
    <DataTable
      caption="Tasks"
      columns={columns}
      rows={tasks}
      getRowId={(task) => task.id}
      isLoading={isLoading}
      sort={sort}
      onSortChange={onSortChange}
      emptyState={emptyState}
    />
  );
}
