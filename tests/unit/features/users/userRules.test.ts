import { describe, expect, it } from 'vitest';

import { profileSchema, toProfileRequest } from '@/features/users/schemas/profileSchema';
import {
  canAdministerUsers,
  canChangeStatus,
  knownRoles,
  roleEditRules,
} from '@/features/users/userRules';

import { buildUser } from '../../../mocks/factories/users';

const admin = buildUser({ roles: ['Admin'] });
const other = buildUser({ roles: ['User'] });

describe('user administration rules (mirror of UserService)', () => {
  it('needs Admin AND a verified email', () => {
    expect(canAdministerUsers(admin)).toBe(true);
    expect(canAdministerUsers({ ...admin, emailConfirmed: false })).toBe(false);
    expect(canAdministerUsers(other)).toBe(false);
  });

  it('locks only my OWN Admin role, with the reason', () => {
    expect(roleEditRules(admin, admin).locked).toEqual({
      Admin: "You can't remove the Admin role from your own account.",
    });
    expect(roleEditRules(admin, { ...other, roles: ['Admin', 'User'] }).locked).toEqual({});
  });

  it('never lets me deactivate myself (reactivating anyone is fine)', () => {
    expect(canChangeStatus(admin, admin)).toBe(false);
    expect(canChangeStatus(admin, other)).toBe(true);
    expect(canChangeStatus(admin, { ...other, isActive: false })).toBe(true);
  });

  it('orders known roles and ignores unknown strings', () => {
    expect(knownRoles(['User', 'Superhero', 'Admin'])).toEqual(['Admin', 'User']);
  });
});

describe('profile schema (mirror of UpdateProfileRequestValidator)', () => {
  const errorsOf = (values: object) => {
    const result = profileSchema.safeParse(values);
    return result.success
      ? {}
      : Object.fromEntries(result.error.issues.map((i) => [i.path.join('.'), i.message]));
  };

  it('requires names (1–50) and limits the job title (≤ 100)', () => {
    expect(errorsOf({ firstName: ' ', lastName: 'Doe', jobTitle: '' })).toEqual({
      firstName: 'First name is required.',
    });
    expect(errorsOf({ firstName: 'A', lastName: 'x'.repeat(51), jobTitle: '' })).toHaveProperty(
      'lastName',
    );
    expect(errorsOf({ firstName: 'A', lastName: 'B', jobTitle: 'x'.repeat(101) })).toHaveProperty(
      'jobTitle',
    );
  });

  it('trims, and sends an empty job title as null', () => {
    expect(
      toProfileRequest(
        profileSchema.parse({ firstName: ' Ada ', lastName: ' Lovelace ', jobTitle: '  ' }),
      ),
    ).toEqual({
      firstName: 'Ada',
      lastName: 'Lovelace',
      jobTitle: null,
    });
  });
});
