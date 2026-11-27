import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';
import { Link } from 'react-router';

import { cn } from '@/utils/cn';
import { formatCount } from '@/utils/numbers';

export interface StatCardProps {
  /** Sentence case, no trailing colon, e.g. "Open tasks". */
  label: string;
  value: number;
  icon: LucideIcon;
  /** One supporting fact, e.g. "+14 in the last 7 days". */
  hint?: ReactNode;
  /** Makes the whole tile a link to the matching list. */
  to?: string;
  /** Draws attention (e.g. overdue > 0): icon + accent; the label still names the state. */
  tone?: 'default' | 'danger';
}

/**
 * A KPI tile (dataviz "stat tile"): label · value · optional hint. The value uses proportional
 * figures (`normal-nums`), which read better at display size than the table-style digits used elsewhere.
 */
export function StatCard({ label, value, icon: Icon, hint, to, tone = 'default' }: StatCardProps) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span
          className={cn(
            'inline-flex size-8 items-center justify-center rounded-lg',
            tone === 'danger'
              ? 'bg-danger-soft text-danger'
              : 'bg-primary-soft text-primary-soft-foreground',
          )}
        >
          <Icon aria-hidden="true" className="size-4" />
        </span>
      </div>
      <p className="mt-2 text-3xl font-semibold text-foreground normal-nums">
        {formatCount(value)}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </>
  );

  const className = 'block rounded-xl border bg-surface p-5 shadow-xs';
  return to ? (
    <Link
      to={to}
      className={cn(
        className,
        'transition-colors hover:border-primary/40 hover:bg-surface-muted/40',
      )}
    >
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}
