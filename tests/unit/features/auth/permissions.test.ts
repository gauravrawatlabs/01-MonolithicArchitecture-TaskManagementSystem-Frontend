import { describe, expect, it } from 'vitest';

import {
  canCreateProjects,
  canManageCategories,
  hasAnyRole,
  hasRole,
  isAdmin,
  isEmailVerified,
} from '@/features/auth';

import { buildUser } from '../../../mocks/factories/users';

describe('role helpers', () => {
  it('reads global roles from the user profile', () => {
    const manager = buildUser({ roles: ['Manager', 'User'] });

    expect(hasRole(manager, 'Manager')).toBe(true);
    expect(hasRole(manager, 'Admin')).toBe(false);
    expect(hasAnyRole(manager, ['Admin', 'Manager'])).toBe(true);
    expect(isAdmin(manager)).toBe(false);
  });

  it('treats a signed-out visitor (null) as having no roles', () => {
    expect(hasRole(null, 'User')).toBe(false);
    expect(isEmailVerified(null)).toBe(false);
    expect(canCreateProjects(null)).toBe(false);
  });
});

describe('policies mirrored from the backend', () => {
  it.each([
    [['Admin'], true, true],
    [['Manager'], true, true],
    [['User'], true, false],
    [['Manager'], false, false], // CanCreateProjects also needs a verified email
  ] as const)(
    'CanCreateProjects: roles %j, verified %s → %s',
    (roles, emailConfirmed, expected) => {
      expect(canCreateProjects(buildUser({ roles: [...roles], emailConfirmed }))).toBe(expected);
    },
  );

  it.each([
    [['Admin'], true, true],
    [['Admin'], false, false],
    [['Manager'], true, false],
  ] as const)(
    'CanManageCategories: roles %j, verified %s → %s',
    (roles, emailConfirmed, expected) => {
      expect(canManageCategories(buildUser({ roles: [...roles], emailConfirmed }))).toBe(expected);
    },
  );
});
