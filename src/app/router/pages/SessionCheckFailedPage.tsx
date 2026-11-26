import { WifiOff } from 'lucide-react';

import { Button } from '@/components/common/Button';
import { useAuth } from '@/features/auth';

/**
 * Shown when a stored session couldn't be restored because the SERVER COULDN'T BE REACHED
 * (offline, API down). The session is kept: retrying usually works once the connection is back.
 * (If the server had rejected the session, the user would simply be asked to sign in again.)
 */
export function SessionCheckFailedPage() {
  const { retrySessionCheck, signOut } = useAuth();

  return (
    <main
      id="main-content"
      className="flex min-h-screen items-center justify-center bg-background p-6"
    >
      <div
        role="alert"
        className="flex w-full max-w-md flex-col items-center rounded-xl border bg-surface px-6 py-12 text-center"
      >
        <span className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-warning-soft text-warning">
          <WifiOff aria-hidden="true" className="size-6" />
        </span>
        <h1 className="text-xl font-semibold text-foreground">
          We couldn&apos;t restore your session
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The server can&apos;t be reached right now. Check your connection and try again.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={retrySessionCheck}>Try again</Button>
          <Button
            variant="secondary"
            onClick={() => {
              void signOut();
            }}
          >
            Sign out
          </Button>
        </div>
      </div>
    </main>
  );
}
