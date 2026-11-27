import { ChartCard } from '@/components/charts/ChartCard';
import { type BarDatum, HorizontalBarChart } from '@/components/charts/HorizontalBarChart';
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_META,
  TASK_STATUSES,
  TASK_STATUS_META,
} from '@/constants/taskMeta';
import { formatCount } from '@/utils/numbers';

import { type Dashboard } from '../api/dashboardApi';

/**
 * Tasks by status (workflow order) and by priority (most urgent first). Both are ordered parts of
 * one whole whose AMOUNTS are compared, so: horizontal bars, one hue, natural order kept.
 */
export function TaskBreakdownCharts({ dashboard }: { dashboard: Dashboard }) {
  const byStatus: BarDatum[] = TASK_STATUSES.map((status) => ({
    label: TASK_STATUS_META[status].label,
    value: dashboard.tasksByStatus[status],
  }));
  const byPriority: BarDatum[] = [...TASK_PRIORITIES].reverse().map((priority) => ({
    label: TASK_PRIORITY_META[priority].label,
    value: dashboard.tasksByPriority[priority],
  }));
  const total = formatCount(dashboard.tasks.total);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard
        title="Tasks by status"
        description={`${total} tasks, in workflow order`}
        table={{ columns: ['Status', 'Tasks'], rows: byStatus.map((d) => [d.label, d.value]) }}
      >
        <HorizontalBarChart data={byStatus} unit="tasks" />
      </ChartCard>
      <ChartCard
        title="Tasks by priority"
        description={`${total} tasks, most urgent first`}
        table={{ columns: ['Priority', 'Tasks'], rows: byPriority.map((d) => [d.label, d.value]) }}
      >
        <HorizontalBarChart data={byPriority} unit="tasks" />
      </ChartCard>
    </div>
  );
}
