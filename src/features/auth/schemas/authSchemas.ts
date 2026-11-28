import { z } from 'zod';

import { emailSchema, passwordSchema, passwordsMatch, requiredText } from '@/schemas/common';

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
