import { LoaderCircle } from 'lucide-react';

import { cn } from '@/utils/cn';

interface SpinnerProps {
  className?: string;
  /** Text for screen readers. Pass null when a parent already announces the loading state. */
  label?: string | null;
}

export function Spinner({ className, label = 'Loading' }: SpinnerProps) {
  return (
    <span role={label ? 'status' : undefined} className="inline-flex items-center">
      <LoaderCircle aria-hidden="true" className={cn('size-4 animate-spin', className)} />
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}
