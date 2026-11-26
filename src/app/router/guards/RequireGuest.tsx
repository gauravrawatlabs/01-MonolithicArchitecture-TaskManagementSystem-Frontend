import { Navigate, Outlet, useSearchParams } from 'react-router';

import { PageLoader } from '@/components/feedback/PageLoader';
import { paths } from '@/constants/routes';
import { useAuth } from '@/features/auth';
import { getSafeReturnUrl } from '@/utils/returnUrl';

/** Layout route for logged-out pages (login, register…). Already signed in → back where you came from. */
export function RequireGuest() {
  const { status } = useAuth();
  const [searchParams] = useSearchParams();

  if (status === 'initializing') {
    return <PageLoader label="Checking your session" />;
  }
  if (status === 'authenticated') {
    return (
      <Navigate to={getSafeReturnUrl(searchParams.get('returnUrl'), paths.dashboard)} replace />
    );
  }
  return <Outlet />;
}
