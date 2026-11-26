import { type ComponentProps } from 'react';

import { cn } from '@/utils/cn';

/** Shared look for text-like controls (input, textarea, select). Invalid state comes from aria-invalid. */
export const fieldClassName =
  'w-full rounded-lg border bg-surface px-3 text-sm text-foreground shadow-xs transition-colors ' +
  'placeholder:text-muted-foreground/80 focus-visible:border-primary focus-visible:outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60 ' +
  'aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:ring-danger/30';

export function Input({ className, type = 'text', ...props }: ComponentProps<'input'>) {
  return <input type={type} className={cn(fieldClassName, 'h-10', className)} {...props} />;
}
