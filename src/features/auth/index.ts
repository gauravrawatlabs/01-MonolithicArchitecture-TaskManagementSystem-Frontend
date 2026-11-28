/**
 * Public API of the auth feature: what other features and the app shell may use.
 * Pages are not exported here; the router imports them directly (one lazy chunk per page).
 */
export { type AuthContextValue, type AuthStatus, type EndedSession } from './authContext';
export { AuthProvider } from './AuthProvider';
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
export { RESEND_COOLDOWN_SECONDS } from './constants';
// Mutation hooks for account management (Settings). Hooks and API only: no Zod schemas here, because this
// file is part of the entry bundle (the app shell imports useAuth from it).
export {
  useChangePasswordMutation,
  useLogoutAllMutation,
  useResendConfirmationMutation,
} from './hooks/useAuthMutations';
