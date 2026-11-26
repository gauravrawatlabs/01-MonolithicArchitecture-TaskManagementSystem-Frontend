import { type ReactNode } from 'react';

import { cn } from '@/utils/cn';

export interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  /** Primary/secondary page actions, e.g. "+ New task". */
  actions?: ReactNode;
  className?: string;
}

/** The single h1 of a page, its description and its main actions (Phase 1 wireframes). */
export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('mb-6 flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
