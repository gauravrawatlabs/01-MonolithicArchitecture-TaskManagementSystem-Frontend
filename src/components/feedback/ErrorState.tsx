import { RefreshCw, TriangleAlert } from 'lucide-react';

import { Button } from '@/components/common/Button';
import { cn } from '@/utils/cn';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  /** Shows a "Try again" button (e.g. TanStack Query's refetch). */
  onRetry?: () => void;
  isRetrying?: boolean;
  /** From the API's ProblemDetails: lets support find the exact request in the server logs. */
  correlationId?: string;
  className?: string;
}

/** Replaces content that failed to load. role="alert" announces it to screen readers. */
export function ErrorState({
  title = 'Something went wrong',
  description = 'We could not load this content. Please try again.',
  onRetry,
  isRetrying = false,
  correlationId,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center px-6 py-12 text-center', className)}
    >
      <span className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-danger-soft text-danger">
        <TriangleAlert aria-hidden="true" className="size-6" />
      </span>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {correlationId ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Reference: <code className="font-mono">{correlationId}</code>
        </p>
      ) : null}
      {onRetry ? (
        <Button
          variant="secondary"
          className="mt-5"
          onClick={onRetry}
          isLoading={isRetrying}
          leftIcon={<RefreshCw aria-hidden="true" />}
        >
          Try again
        </Button>
      ) : null}
    </div>
  );
}
