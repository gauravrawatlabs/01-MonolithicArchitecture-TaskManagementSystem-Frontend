import { cn } from '@/utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap ' +
  'transition-colors select-none disabled:pointer-events-none disabled:opacity-50 ' +
  '[&_svg]:size-4 [&_svg]:shrink-0';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover',
  secondary: 'border bg-surface text-foreground shadow-sm hover:bg-surface-muted',
  ghost: 'text-foreground hover:bg-surface-muted',
  danger: 'bg-danger text-white shadow-sm hover:bg-danger-hover dark:text-gray-950',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-sm',
};

/**
 * Button classes as a function, so non-button elements (e.g. a router <Link>) can look like a
 * button without duplicating styles: <Link className={buttonVariants({ variant: 'secondary' })}>.
 */
export function buttonVariants({
  variant = 'primary',
  size = 'md',
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}): string {
  return cn(base, variants[variant], sizes[size], className);
}
