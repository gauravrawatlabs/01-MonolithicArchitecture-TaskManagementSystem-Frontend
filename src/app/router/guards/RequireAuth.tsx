import { Navigate, Outlet, useLocation } from 'react-router';

import { PageLoader } from '@/components/feedback/PageLoader';
import { loginWithReturnUrl } from '@/constants/routes';
import { useAuth } from '@/features/auth';

/**
 * Layout route for signed-in pages. Not signed in → /login?returnUrl=<this page>.
 * UX only: the API still rejects unauthenticated requests with 401.
 */
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'initializing') {
    return <PageLoader label="Checking your session" />;
  }
  if (status === 'anonymous') {
    const returnUrl = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={loginWithReturnUrl(returnUrl)} replace />;
  }
  return <Outlet />;
}
