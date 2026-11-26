import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import { type ReactNode } from 'react';

import { cn } from '@/utils/cn';

export type BannerVariant = 'info' | 'success' | 'warning' | 'danger';

const styles: Record<BannerVariant, { className: string; icon: typeof Info }> = {
  info: { className: 'bg-info-soft text-info', icon: Info },
  success: { className: 'bg-success-soft text-success', icon: CircleCheck },
  warning: { className: 'bg-warning-soft text-warning', icon: TriangleAlert },
  danger: { className: 'bg-danger-soft text-danger', icon: CircleAlert },
};

export interface BannerProps {
  variant?: BannerVariant;
  title: string;
  children?: ReactNode;
  /** e.g. "Resend email" */
  action?: ReactNode;
  onDismiss?: () => void;
  className?: string;
}

/** A persistent, in-page message (e.g. "Please verify your email"). Unlike a toast, it stays. */
export function Banner({
  variant = 'info',
  title,
  children,
  action,
  onDismiss,
  className,
}: BannerProps) {
  const { className: variantClassName, icon: Icon } = styles[variant];

  return (
    <div
      role={variant === 'danger' ? 'alert' : 'status'}
      className={cn('flex items-start gap-3 rounded-lg px-4 py-3', variantClassName, className)}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium">{title}</p>
        {/* No opacity on text: it silently drops contrast below WCAG AA (axe caught 3.8:1). */}
        {children ? <div className="mt-0.5">{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
      {onDismiss ? (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          className="-m-1 inline-flex size-7 shrink-0 items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
