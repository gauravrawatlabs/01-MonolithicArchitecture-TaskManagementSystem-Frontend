/**
 * Public API of the auth feature: what other features and the app shell may use.
 * Pages are not exported here; the router imports them directly (one lazy chunk per page).
 */
export { type AuthContextValue, type AuthStatus, type EndedSession } from './authContext';
export { AuthProvider } from './AuthProvider';
export { ChangePasswordForm } from './components/ChangePasswordForm';
export { ResendConfirmationButton } from './components/ResendConfirmationButton';
export { SessionsCard } from './components/SessionsCard';
export {
  canLookupUsers,
  canCreateProjects,
  canManageCategories,
  hasAnyRole,
  hasRole,
  isAdmin,
  isEmailVerified,
} from './permissions';
export { type LoginLocationState, type LoginNotice } from './types';
export { useAuth } from './useAuth';
