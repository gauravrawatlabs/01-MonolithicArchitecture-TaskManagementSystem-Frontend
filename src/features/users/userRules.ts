import { type Role, ROLES } from '@/constants/roles';
import { isAdmin, isEmailVerified } from '@/features/auth';
import { type UserProfile } from '@/types/api';

/** Mirrors UpdateProfileRequestValidator: first/last name 1–50, job title ≤ 100. */
export const NAME_MAX = 50;
export const JOB_TITLE_MAX = 100;

/** Admin pages need Admin + verified email (AdminOnly + EmailVerified policies). */
export function canAdministerUsers(user: UserProfile | null): boolean {
  return isAdmin(user) && isEmailVerified(user);
}

/** The backend's roles in a fixed order (unknown strings from the API are ignored). */
export function knownRoles(roles: readonly string[]): Role[] {
  return ROLES.filter((role) => roles.includes(role));
}

export interface RoleEditRules {
  /** Roles whose checkbox is locked, with the reason shown next to it. */
  locked: Partial<Record<Role, string>>;
}

/** UserService: "You cannot remove the Admin role from your own account." (422). */
export function roleEditRules(
  me: UserProfile | null,
  target: Pick<UserProfile, 'id' | 'roles'>,
): RoleEditRules {
  if (me?.id === target.id && target.roles.includes('Admin')) {
    return { locked: { Admin: "You can't remove the Admin role from your own account." } };
  }
  return { locked: {} };
}

/** UserService: "You cannot deactivate your own account." (422). */
export function canChangeStatus(
  me: UserProfile | null,
  target: Pick<UserProfile, 'id' | 'isActive'>,
): boolean {
  return !(me?.id === target.id && target.isActive);
}

export function fullName(user: Pick<UserProfile, 'firstName' | 'lastName'>): string {
  return `${user.firstName} ${user.lastName}`.trim();
}
