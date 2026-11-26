import { Navigate, Outlet, useSearchParams } from 'react-router';

import { PageLoader } from '@/components/feedback/PageLoader';
import { paths } from '@/constants/routes';
import { useAuth } from '@/features/auth';
import { getSafeReturnUrl } from '@/utils/returnUrl';

import { SessionCheckFailedPage } from '../pages/SessionCheckFailedPage';

/**
 * Layout route for logged-out pages (login, register…). Already signed in (or a stored session
 * was just restored) → on to the safe returnUrl, or the dashboard.
 */
export function RequireGuest() {
  const { status, sessionCheckFailed } = useAuth();
  const [searchParams] = useSearchParams();

  if (status === 'initializing') {
    return sessionCheckFailed ? (
      <SessionCheckFailedPage />
    ) : (
      <PageLoader label="Checking your session" />
    );
  }
  if (status === 'authenticated') {
    return (
      <Navigate to={getSafeReturnUrl(searchParams.get('returnUrl'), paths.dashboard)} replace />
    );
  }
  return <Outlet />;
}
