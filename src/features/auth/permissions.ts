import { type Role } from '@/constants/roles';
import { type UserProfile } from '@/types/api';

/**
 * Role checks used to show or hide UI (Phase 1 §13). These are UX helpers only: the ASP.NET Core
 * API enforces every rule itself, and the UI still handles 403 responses.
 */
export function hasRole(user: UserProfile | null, role: Role): boolean {
  return user?.roles.includes(role) ?? false;
}

export function hasAnyRole(user: UserProfile | null, roles: readonly Role[]): boolean {
  return roles.some((role) => hasRole(user, role));
}

export function isAdmin(user: UserProfile | null): boolean {
  return hasRole(user, 'Admin');
}

/** Most write actions need a verified email (backend "EmailVerified" policy). */
export function isEmailVerified(user: UserProfile | null): boolean {
  return user?.emailConfirmed ?? false;
}

/** Backend policy CanCreateProjects: (Admin or Manager) AND verified email. */
export function canCreateProjects(user: UserProfile | null): boolean {
  return hasAnyRole(user, ['Admin', 'Manager']) && isEmailVerified(user);
}

/** Backend policy CanLookupUsers (member pickers): Admin OR Manager, AND verified email. */
export function canLookupUsers(user: UserProfile | null): boolean {
  return canCreateProjects(user);
}

/** Backend policy CanManageCategories: Admin AND verified email. */
export function canManageCategories(user: UserProfile | null): boolean {
  return isAdmin(user) && isEmailVerified(user);
}
