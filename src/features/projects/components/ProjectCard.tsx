import { CalendarDays, ListChecks, UsersRound } from 'lucide-react';
import { Link } from 'react-router';

import { Badge } from '@/components/common/Badge';
import { ProgressBar } from '@/components/common/ProgressBar';
import { paths } from '@/constants/routes';
import { type ProjectSummary } from '@/types/api';
import { formatPercent } from '@/utils/numbers';

import { formatProjectDates } from '../projectRules';
import { ProjectActionsMenu } from './ProjectActionsMenu';
import { TimelineBadge } from './TimelineBadge';

export interface ProjectCardProps {
  project: ProjectSummary;
  isOwner: boolean;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * One project in the grid (Phase 1 §7, reference projects.jpg). Progress comes from the backend's
 * summary fields added for gap G2 (doneTaskCount, openTaskCount, completionPercent).
 */
export function ProjectCard({ project, isOwner, canManage, onEdit, onDelete }: ProjectCardProps) {
  const dates = formatProjectDates(project);

  return (
    <article
      className="flex flex-col rounded-xl border bg-surface p-5 shadow-xs"
      aria-labelledby={`project-${project.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id={`project-${project.id}`} className="min-w-0 text-base font-semibold">
          <Link to={paths.project(project.id)} className="line-clamp-2 hover:underline">
            {project.name}
          </Link>
        </h2>
        {canManage ? (
          <ProjectActionsMenu projectName={project.name} onEdit={onEdit} onDelete={onDelete} />
        ) : null}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <TimelineBadge project={project} />
        {isOwner ? <Badge variant="primary">Owner</Badge> : null}
      </div>

      {project.description ? (
        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{project.description}</p>
      ) : null}

      <div className="mt-4 rounded-lg bg-surface-muted/60 p-3">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-semibold text-foreground">
            {formatPercent(project.completionPercent)}
          </span>
        </div>
        <ProgressBar
          value={project.completionPercent}
          label={`${project.name} progress`}
          className="mt-2"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          {project.doneTaskCount} done · {project.openTaskCount} open
        </p>
      </div>

      <dl className="mt-auto grid gap-1.5 pt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <dt className="sr-only">Members</dt>
          <UsersRound aria-hidden="true" className="size-3.5" />
          <dd>
            {project.memberCount} {project.memberCount === 1 ? 'member' : 'members'} · owner{' '}
            {project.ownerName}
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="sr-only">Tasks</dt>
          <ListChecks aria-hidden="true" className="size-3.5" />
          <dd>
            {project.taskCount} {project.taskCount === 1 ? 'task' : 'tasks'}
          </dd>
        </div>
        {dates ? (
          <div className="flex items-center gap-2">
            <dt className="sr-only">Dates</dt>
            <CalendarDays aria-hidden="true" className="size-3.5" />
            <dd>{dates}</dd>
          </div>
        ) : null}
      </dl>
    </article>
  );
}
