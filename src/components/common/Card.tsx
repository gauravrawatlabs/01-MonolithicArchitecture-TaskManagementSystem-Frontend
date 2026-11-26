import { type ComponentProps, type ReactNode } from 'react';

import { cn } from '@/utils/cn';

/** Composable card: <Card><CardHeader title="…" action={…} /><CardContent>…</CardContent></Card> */
export function Card({ className, ...props }: ComponentProps<'section'>) {
  return (
    <section
      className={cn('rounded-xl border bg-surface text-foreground shadow-xs', className)}
      {...props}
    />
  );
}

export interface CardHeaderProps extends Omit<ComponentProps<'div'>, 'title'> {
  title: ReactNode;
  description?: ReactNode;
  /** Element on the right, e.g. a "View all" button or a menu. */
  action?: ReactNode;
  /** Heading level for correct document outline (default h2). */
  headingLevel?: 'h2' | 'h3';
}

export function CardHeader({
  title,
  description,
  action,
  headingLevel: Heading = 'h2',
  className,
  ...props
}: CardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4 p-5 pb-0', className)} {...props}>
      <div className="min-w-0">
        <Heading className="text-base font-semibold">{title}</Heading>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardContent({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('p-5', className)} {...props} />;
}

export function CardFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex items-center justify-end gap-2 border-t px-5 py-3', className)}
      {...props}
    />
  );
}
