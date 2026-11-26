import { Navigate, Outlet } from 'react-router';

import { type Role } from '@/constants/roles';
import { paths } from '@/constants/routes';
import { hasAnyRole, useAuth } from '@/features/auth';

/**
 * Layout route that requires one of the given global roles, otherwise shows /forbidden.
 * UX only: the API enforces the same rules (403) on every request.
 */
export function RequireRole({ roles }: { roles: readonly Role[] }) {
  const { user } = useAuth();

  if (!hasAnyRole(user, roles)) {
    return <Navigate to={paths.forbidden} replace />;
  }
  return <Outlet />;
}
