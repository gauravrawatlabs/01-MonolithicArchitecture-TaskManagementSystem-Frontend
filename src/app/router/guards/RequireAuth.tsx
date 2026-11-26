import { Navigate, Outlet, useLocation } from 'react-router';

import { PageLoader } from '@/components/feedback/PageLoader';
import { loginWithReturnUrl, paths } from '@/constants/routes';
import { type LoginLocationState, useAuth } from '@/features/auth';

import { SessionCheckFailedPage } from '../pages/SessionCheckFailedPage';

/**
 * Layout route for signed-in pages.
 *   Restoring a stored session      → loader (or "couldn't restore" when offline)
 *   Not signed in                   → /login?returnUrl=<this page>
 *   Session expired                 → /login?returnUrl=<this page> + "session expired" notice
 *   Signed out on purpose / elsewhere → /login + notice, no returnUrl
 * This guard is the ONLY place that navigates when a session ends (no race with callers).
 * UX only: the API still rejects unauthenticated requests with 401.
 */
export function RequireAuth() {
  const { status, endedSession, sessionCheckFailed } = useAuth();
  const location = useLocation();

  if (status === 'initializing') {
    return sessionCheckFailed ? (
      <SessionCheckFailedPage />
    ) : (
      <PageLoader label="Checking your session" />
    );
  }
  if (status === 'anonymous') {
    const state: LoginLocationState = endedSession?.notice ? { notice: endedSession.notice } : {};
    const comeBack = !endedSession || endedSession.keepReturnUrl === true;
    const returnUrl = `${location.pathname}${location.search}${location.hash}`;
    return (
      <Navigate to={comeBack ? loginWithReturnUrl(returnUrl) : paths.login} replace state={state} />
    );
  }
  return <Outlet />;
}
