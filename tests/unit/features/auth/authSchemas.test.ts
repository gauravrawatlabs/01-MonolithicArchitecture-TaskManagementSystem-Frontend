import { describe, expect, it } from 'vitest';

import { registerSchema } from '@/features/auth/schemas/authSchemas';
import { changePasswordSchema } from '@/features/settings/schemas/changePasswordSchema';

const messagesFor = (
  result: { error?: { issues: { path: PropertyKey[]; message: string }[] } },
  field: string,
) =>
  result.error?.issues.filter((issue) => issue.path[0] === field).map((issue) => issue.message) ??
  [];

describe('registerSchema', () => {
  const valid = {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    password: 'Str0ng!Pass',
    confirmPassword: 'Str0ng!Pass',
  };

  it('accepts a complete, valid registration', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it('reports a password mismatch on the confirmation field', () => {
    const result = registerSchema.safeParse({ ...valid, confirmPassword: 'Different1!' });
    expect(messagesFor(result, 'confirmPassword')).toEqual(['Passwords do not match.']);
  });

  it('reports the mismatch even while other fields are still invalid (not only at the end)', () => {
    const result = registerSchema.safeParse({
      ...valid,
      firstName: '',
      confirmPassword: 'Different1!',
    });

    expect(messagesFor(result, 'firstName')).toEqual(['First name is required.']);
    expect(messagesFor(result, 'confirmPassword')).toEqual(['Passwords do not match.']);
  });

  it('asks for the confirmation instead of reporting a mismatch when it is empty', () => {
    const result = registerSchema.safeParse({ ...valid, confirmPassword: '' });
    expect(messagesFor(result, 'confirmPassword')).toEqual(['Confirm your password.']);
  });
});

describe('changePasswordSchema', () => {
  it('rejects a new password equal to the current one (backend rule)', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'Str0ng!Pass',
      newPassword: 'Str0ng!Pass',
      confirmPassword: 'Str0ng!Pass',
    });
    expect(messagesFor(result, 'newPassword')).toEqual([
      'New password must be different from the current password.',
    ]);
  });

  it('accepts a different, strong, confirmed password', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'Old!Pass1',
      newPassword: 'N3w!Password',
      confirmPassword: 'N3w!Password',
    });
    expect(result.success).toBe(true);
  });
});
