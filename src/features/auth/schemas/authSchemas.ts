import { z } from 'zod';

import { emailSchema, passwordSchema, requiredText } from '@/schemas/common';

/** Passwords-match check that runs as soon as both fields have a value (not only when all else is valid). */
function passwordsMatch<T extends z.ZodType<Record<string, unknown>>>(
  schema: T,
  passwordField: string,
  confirmField: string,
) {
  return schema.refine((values) => values[passwordField] === values[confirmField], {
    path: [confirmField],
    error: 'Passwords do not match.',
    when: (payload) => {
      const value = payload.value as Record<string, unknown>;
      return (
        typeof value[passwordField] === 'string' &&
        typeof value[confirmField] === 'string' &&
        value[confirmField] !== ''
      );
    },
  });
}

/** Login only checks presence/format: the password policy is the server's business for existing accounts. */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required.'),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = passwordsMatch(
  z.object({
    firstName: requiredText('First name', 50),
    lastName: requiredText('Last name', 50),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm your password.'),
  }),
  'password',
  'confirmPassword',
);
export type RegisterFormValues = z.infer<typeof registerSchema>;

export const emailOnlySchema = z.object({ email: emailSchema });
export type EmailOnlyFormValues = z.infer<typeof emailOnlySchema>;

export const resetPasswordSchema = passwordsMatch(
  z.object({
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm your new password.'),
  }),
  'newPassword',
  'confirmPassword',
);
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = passwordsMatch(
  z.object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm your new password.'),
  }),
  'newPassword',
  'confirmPassword',
).refine((values) => values.newPassword !== values.currentPassword, {
  path: ['newPassword'],
  error: 'New password must be different from the current password.',
  when: (payload) => {
    const value = payload.value as Record<string, unknown>;
    return (
      typeof value.currentPassword === 'string' &&
      value.currentPassword !== '' &&
      typeof value.newPassword === 'string'
    );
  },
});
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
