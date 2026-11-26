/**
 * Public API of the auth feature: what other features and the app shell may use.
 * Pages are not exported here; the router imports them directly (one lazy chunk per page).
 */
export { type AuthContextValue, type AuthStatus } from './authContext';
export { AuthProvider } from './AuthProvider';
export {
  canCreateProjects,
  canManageCategories,
  hasAnyRole,
  hasRole,
  isAdmin,
  isEmailVerified,
} from './permissions';
export { useAuth } from './useAuth';
