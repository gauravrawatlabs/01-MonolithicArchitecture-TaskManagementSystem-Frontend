import { CircleAlert, CircleCheck, type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

import { cn } from '@/utils/cn';

export interface AuthStatusMessageProps {
  variant: 'success' | 'error';
  title: string;
  children?: ReactNode;
  /** Buttons/links for the next step. */
  actions?: ReactNode;
}

const icons: Record<AuthStatusMessageProps['variant'], { icon: LucideIcon; className: string }> = {
  success: { icon: CircleCheck, className: 'bg-success-soft text-success' },
  error: { icon: CircleAlert, className: 'bg-danger-soft text-danger' },
};

/**
 * Full-page outcome for link-based flows (email confirmed, link expired, email sent).
 * The title is the page's h1, and the region is announced when it appears.
 */
export function AuthStatusMessage({ variant, title, children, actions }: AuthStatusMessageProps) {
  const { icon: Icon, className } = icons[variant];
  return (
    <div role={variant === 'error' ? 'alert' : 'status'}>
      <span
        className={cn(
          'mb-4 inline-flex size-12 items-center justify-center rounded-full',
          className,
        )}
      >
        <Icon aria-hidden="true" className="size-6" />
      </span>
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      {children ? (
        <div className="mt-2 space-y-2 text-sm text-muted-foreground">{children}</div>
      ) : null}
      {actions ? <div className="mt-6 flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}
