import { type LucideIcon, Inbox } from 'lucide-react';
import { type ReactNode } from 'react';

import { cn } from '@/utils/cn';

export interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  icon?: LucideIcon;
  /** Usually one primary next step, e.g. "Create project" (only if the user is allowed to). */
  action?: ReactNode;
  className?: string;
}

/** Shown when a list has no items: explains why, and what the user can do next. */
export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      <span className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
        <Icon aria-hidden="true" className="size-6" />
      </span>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
