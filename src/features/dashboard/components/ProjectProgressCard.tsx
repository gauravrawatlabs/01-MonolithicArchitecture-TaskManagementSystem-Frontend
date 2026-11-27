import { AlarmClock } from 'lucide-react';
import { Link } from 'react-router';

import { Card, CardContent, CardHeader } from '@/components/common/Card';
import { ProgressBar } from '@/components/common/ProgressBar';
import { paths } from '@/constants/routes';
import { type ProjectProgress } from '@/types/api';
import { formatPercent } from '@/utils/numbers';

/**
 * Progress per project as a METER LIST (dataviz): a name, a bar and a figure per row, bars aligned.
 * The backend returns up to 10 projects with the most open tasks; completion = Done ÷ (Total − Cancelled).
 */
export function ProjectProgressCard({ projects }: { projects: readonly ProjectProgress[] }) {
  return (
    <Card>
      <CardHeader title="Project progress" description="The projects with the most open tasks" />
      <CardContent>
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No projects yet.</p>
        ) : (
          <ul className="grid gap-4">
            {projects.map((project) => (
              <li key={project.projectId}>
                <div className="flex items-baseline justify-between gap-3">
                  <Link
                    to={paths.project(project.projectId)}
                    className="truncate text-sm font-medium text-foreground hover:underline"
                  >
                    {project.name}
                  </Link>
                  <span className="shrink-0 text-sm font-semibold text-foreground">
                    {formatPercent(project.completionPercent)}
                  </span>
                </div>
                <ProgressBar
                  value={project.completionPercent}
                  label={`${project.name} completion`}
                  className="mt-1.5"
                />
                <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                  <span>
                    {project.doneTasks} of {project.totalTasks} done · {project.openTasks} open
                  </span>
                  {project.overdueTasks > 0 ? (
                    <span className="inline-flex items-center gap-1 font-medium text-danger">
                      <AlarmClock aria-hidden="true" className="size-3.5" />
                      {project.overdueTasks} overdue
                    </span>
                  ) : null}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
