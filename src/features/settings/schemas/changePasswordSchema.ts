import { z } from 'zod';

import { passwordSchema, passwordsMatch } from '@/schemas/common';

/**
 * Settings › Security. Lives in the (lazy) settings feature, not in auth: auth's public API is loaded by the
 * app shell on every page, and a Zod schema there pulled Zod into the entry bundle (Phase 16).
 */
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
