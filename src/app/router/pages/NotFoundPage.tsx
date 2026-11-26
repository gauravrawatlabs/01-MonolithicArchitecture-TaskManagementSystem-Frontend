import { FileQuestion } from 'lucide-react';
import { Link } from 'react-router';

import { buttonVariants } from '@/components/common/Button.styles';
import { paths } from '@/constants/routes';

/** Unknown URL. Standalone (no app shell), so it works whether or not someone is signed in. */
export function NotFoundPage() {
  return (
    <main
      id="main-content"
      className="flex min-h-screen items-center justify-center bg-background p-6"
    >
      <div className="flex w-full max-w-md flex-col items-center rounded-xl border bg-surface px-6 py-12 text-center">
        <span className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
          <FileQuestion aria-hidden="true" className="size-6" />
        </span>
        <h1 className="text-xl font-semibold text-foreground">Page not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <Link to={paths.dashboard} className={buttonVariants({ className: 'mt-6' })}>
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}
