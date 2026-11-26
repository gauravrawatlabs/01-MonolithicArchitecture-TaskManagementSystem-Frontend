import { Badge } from '@/components/common/Badge';
import { TASK_PRIORITY_META } from '@/constants/taskMeta';
import { type TaskPriority } from '@/types/api';
import { cn } from '@/utils/cn';

/** Task priority with a flag icon; Critical gets a filled flag for extra emphasis. */
export function PriorityBadge({
  priority,
  className,
}: {
  priority: TaskPriority;
  className?: string;
}) {
  const { label, icon: Icon, badgeClassName } = TASK_PRIORITY_META[priority];

  return (
    <Badge className={cn(badgeClassName, className)}>
      <Icon aria-hidden="true" className={cn(priority === 'Critical' && 'fill-current')} />
      {label}
    </Badge>
  );
}
