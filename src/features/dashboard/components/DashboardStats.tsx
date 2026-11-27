import {
  AlarmClock,
  CircleCheck,
  Clock,
  FolderKanban,
  ListChecks,
  UserRoundCheck,
} from 'lucide-react';

import { StatCard } from '@/components/common/StatCard';
import { paths } from '@/constants/routes';

import { type Dashboard } from '../api/dashboardApi';

/**
 * The KPI row (Phase 1 §6). Every number maps to a DashboardResponse field:
 *   projectCount · tasks.total · tasksByStatus.Done (+ tasks.completedInLast7Days) ·
 *   tasks.open (+ tasks.dueInNext7Days) · tasks.overdue · myWork.*
 */
export function DashboardStats({ dashboard }: { dashboard: Dashboard }) {
  const { tasks, myWork } = dashboard;

  return (
    <section
      aria-label="Key figures"
      className="grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-6"
    >
      <StatCard
        label="Projects"
        value={dashboard.projectCount}
        icon={FolderKanban}
        to={paths.projects}
      />
      <StatCard label="Total tasks" value={tasks.total} icon={ListChecks} to={paths.tasks} />
      <StatCard
        label="Completed"
        value={dashboard.tasksByStatus.Done}
        icon={CircleCheck}
        hint={`+${tasks.completedInLast7Days} in the last 7 days`}
      />
      <StatCard
        label="Open"
        value={tasks.open}
        icon={Clock}
        hint={`${tasks.dueInNext7Days} due in the next 7 days`}
      />
      <StatCard
        label="Overdue"
        value={tasks.overdue}
        icon={AlarmClock}
        tone={tasks.overdue > 0 ? 'danger' : 'default'}
        hint={tasks.overdue > 0 ? 'Past their due date and still open' : 'Nothing is late'}
      />
      <StatCard
        label="Assigned to me"
        value={myWork.assignedOpen}
        icon={UserRoundCheck}
        to={paths.myTasks}
        hint={`${myWork.assignedOverdue} overdue · ${myWork.assignedDueInNext7Days} due soon`}
      />
    </section>
  );
}
