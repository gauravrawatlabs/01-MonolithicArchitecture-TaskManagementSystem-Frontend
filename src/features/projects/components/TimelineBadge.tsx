import { Badge, type BadgeVariant } from '@/components/common/Badge';

import { type ProjectTimeline, projectTimeline } from '../projectRules';
import { type ProjectDetails } from '@/types/api';

const META: Record<ProjectTimeline, { label: string; variant: BadgeVariant }> = {
  active: { label: 'Active', variant: 'success' },
  upcoming: { label: 'Upcoming', variant: 'info' },
  ended: { label: 'Ended', variant: 'neutral' },
  unscheduled: { label: 'No dates', variant: 'neutral' },
};

/** Where the project is in its timeline, derived from its dates (text + colour, never colour alone). */
export function TimelineBadge({
  project,
}: {
  project: Pick<ProjectDetails, 'startDate' | 'endDate'>;
}) {
  const { label, variant } = META[projectTimeline(project)];
  return <Badge variant={variant}>{label}</Badge>;
}
