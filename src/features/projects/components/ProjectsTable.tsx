import { Link } from 'react-router';

import { ProgressBar } from '@/components/common/ProgressBar';
import { DataTable, type DataTableColumn, type SortState } from '@/components/tables/DataTable';
import { paths } from '@/constants/routes';
import { type ProjectSummary } from '@/types/api';
import { formatPercent } from '@/utils/numbers';

import { formatProjectDates } from '../projectRules';
import { ProjectActionsMenu } from './ProjectActionsMenu';
import { TimelineBadge } from './TimelineBadge';

export interface ProjectsTableProps {
  projects: readonly ProjectSummary[];
  isLoading: boolean;
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  canManage: (project: ProjectSummary) => boolean;
  onEdit: (project: ProjectSummary) => void;
  onDelete: (project: ProjectSummary) => void;
  emptyState: React.ReactNode;
}

/** Table view of the project list. Sortable columns are exactly the backend's ProjectSortField values. */
export function ProjectsTable({
  projects,
  isLoading,
  sort,
  onSortChange,
  canManage,
  onEdit,
  onDelete,
  emptyState,
}: ProjectsTableProps) {
  const columns: DataTableColumn<ProjectSummary>[] = [
    {
      id: 'Name',
      header: 'Name',
      sortable: true,
      cell: (project) => (
        <div className="min-w-0">
          <Link
            to={paths.project(project.id)}
            className="font-medium text-foreground hover:underline"
          >
            {project.name}
          </Link>
          <p className="mt-0.5 text-xs text-muted-foreground">Owner {project.ownerName}</p>
        </div>
      ),
    },
    {
      id: 'Timeline',
      header: 'Status',
      hideBelow: 'md',
      cell: (project) => <TimelineBadge project={project} />,
    },
    {
      id: 'Progress',
      header: 'Progress',
      hideBelow: 'md',
      className: 'w-48',
      cell: (project) => (
        <div>
          <ProgressBar value={project.completionPercent} label={`${project.name} progress`} />
          <p className="mt-1 text-xs text-muted-foreground">
            {formatPercent(project.completionPercent)} · {project.doneTaskCount} done ·{' '}
            {project.openTaskCount} open
          </p>
        </div>
      ),
    },
    {
      id: 'StartDate',
      header: 'Dates',
      sortable: true,
      hideBelow: 'lg',
      className: 'whitespace-nowrap',
      cell: (project) => (
        <span className="text-muted-foreground">{formatProjectDates(project) ?? '—'}</span>
      ),
    },
    {
      id: 'Members',
      header: 'Members',
      hideBelow: 'lg',
      cell: (project) => <span className="text-muted-foreground">{project.memberCount}</span>,
    },
    {
      id: 'Actions',
      header: 'Actions',
      className: 'w-12 text-right',
      cell: (project) =>
        canManage(project) ? (
          <ProjectActionsMenu
            projectName={project.name}
            onEdit={() => {
              onEdit(project);
            }}
            onDelete={() => {
              onDelete(project);
            }}
          />
        ) : null,
    },
  ];

  return (
    <DataTable
      caption="Projects"
      columns={columns}
      rows={projects}
      getRowId={(project) => project.id}
      isLoading={isLoading}
      sort={sort}
      onSortChange={onSortChange}
      emptyState={emptyState}
    />
  );
}
