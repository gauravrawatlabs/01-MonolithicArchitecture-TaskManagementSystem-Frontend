import { type ComponentProps } from 'react';

import { cn } from '@/utils/cn';

export type BadgeVariant = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

const variants: Record<BadgeVariant, string> = {
  neutral: 'bg-surface-muted text-muted-foreground',
  primary: 'bg-primary-soft text-primary-soft-foreground',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
};

export interface BadgeProps extends ComponentProps<'span'> {
  variant?: BadgeVariant;
}

/** A small label. Colour is never the only signal: badges always contain text. */
export function Badge({ variant = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        '[&_svg]:size-3.5 [&_svg]:shrink-0',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
