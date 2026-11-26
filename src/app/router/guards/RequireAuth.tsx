import { Navigate, Outlet, useLocation } from 'react-router';

import { PageLoader } from '@/components/feedback/PageLoader';
import { loginWithReturnUrl, paths } from '@/constants/routes';
import { type LoginLocationState, useAuth } from '@/features/auth';

/**
 * Layout route for signed-in pages.
 *   Not signed in              → /login?returnUrl=<this page> (come back after signing in)
 *   Just signed out on purpose → /login with the sign-out notice, no returnUrl
 * This guard is the ONLY place that navigates after a sign-out (no race with the caller).
 * UX only: the API still rejects unauthenticated requests with 401.
 */
export function RequireAuth() {
  const { status, endedSession } = useAuth();
  const location = useLocation();

  if (status === 'initializing') {
    return <PageLoader label="Checking your session" />;
  }
  if (status === 'anonymous' && endedSession) {
    const state: LoginLocationState = endedSession.notice ? { notice: endedSession.notice } : {};
    return <Navigate to={paths.login} replace state={state} />;
  }
  if (status === 'anonymous') {
    const returnUrl = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={loginWithReturnUrl(returnUrl)} replace />;
  }
  return <Outlet />;
}
