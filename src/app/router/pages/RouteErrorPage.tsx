import { useEffect } from 'react';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';

import { Button } from '@/components/common/Button';
import { buttonVariants } from '@/components/common/Button.styles';
import { Card } from '@/components/common/Card';
import { ErrorState } from '@/components/feedback/ErrorState';
import { paths } from '@/constants/routes';

/**
 * errorElement for route trees: catches render errors and failed lazy-page downloads (e.g. a new
 * deployment removed an old chunk). Used INSIDE the app shell so the sidebar keeps working.
 */
export function RouteErrorPage() {
  const error = useRouteError();

  useEffect(() => {
    console.error('Route error:', error);
  }, [error]);

  const isNotFound = isRouteErrorResponse(error) && error.status === 404;

  return (
    <Card>
      <ErrorState
        title={isNotFound ? 'Page not found' : 'Something went wrong on this page'}
        description={
          isNotFound
            ? "The page you're looking for doesn't exist."
            : 'An unexpected error occurred. Reloading usually helps; if it keeps happening, let us know.'
        }
      />
      <div className="flex justify-center gap-3 pb-10">
        <Button
          variant="secondary"
          onClick={() => {
            window.location.reload();
          }}
        >
          Reload page
        </Button>
        <Link to={paths.dashboard} className={buttonVariants()}>
          Go to dashboard
        </Link>
      </div>
    </Card>
  );
}
