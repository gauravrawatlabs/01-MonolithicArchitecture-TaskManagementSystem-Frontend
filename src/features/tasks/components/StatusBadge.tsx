import { Badge } from '@/components/common/Badge';
import { TASK_STATUS_META } from '@/constants/taskMeta';
import { type TaskItemStatus } from '@/types/api';
import { cn } from '@/utils/cn';

/** Task status with icon + text (never colour alone), e.g. "◌ In progress". */
export function StatusBadge({ status, className }: { status: TaskItemStatus; className?: string }) {
  const { label, icon: Icon, badgeClassName } = TASK_STATUS_META[status];

  return (
    <Badge className={cn(badgeClassName, className)}>
      <Icon aria-hidden="true" />
      {label}
    </Badge>
  );
}
