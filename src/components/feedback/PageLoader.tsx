import { Spinner } from '@/components/common/Spinner';

/** Full-area loading indicator for route changes and the initial session check. */
export function PageLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] w-full items-center justify-center text-primary-text">
      <Spinner className="size-8" label={label} />
    </div>
  );
}
