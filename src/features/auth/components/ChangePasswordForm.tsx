import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';

import { Button } from '@/components/common/Button';
import { FormErrorSummary } from '@/components/forms/FormErrorSummary';
import { FormField } from '@/components/forms/FormField';
import { PasswordChecklist } from '@/components/forms/PasswordChecklist';
import { PasswordInput } from '@/components/forms/PasswordInput';
import { applyServerErrors } from '@/utils/formErrors';

import { useChangePasswordMutation } from '../hooks/useAuthMutations';
import { changePasswordSchema, type ChangePasswordFormValues } from '../schemas/authSchemas';
import { useAuth } from '../useAuth';

/**
 * POST /api/account/change-password. Success revokes EVERY session on the server, so this browser
 * signs out too and asks for a fresh sign-in (the login page explains why).
 */
export function ChangePasswordForm() {
  const { signOut } = useAuth();
  const changePassword = useChangePasswordMutation();
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });
  const newPassword = useWatch({ control, name: 'newPassword' });

  const submit = handleSubmit(async ({ currentPassword, newPassword: password }) => {
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword: password });
    } catch (error) {
      applyServerErrors(setError, error, { fields: ['currentPassword', 'newPassword'] });
      return;
    }
    // RequireAuth sees the ended session and shows the sign-in page with this notice.
    // (Navigating here as well would race with the guard: see AuthContextValue.endedSession.)
    await signOut({ notice: 'passwordChanged' });
  });

  return (
    <form noValidate onSubmit={submit} className="grid max-w-md gap-4">
      <FormErrorSummary message={errors.root?.server?.message} />
      <FormField label="Current password" required error={errors.currentPassword?.message}>
        {(controlProps) => (
          <PasswordInput
            {...controlProps}
            autoComplete="current-password"
            {...register('currentPassword')}
          />
        )}
      </FormField>
      <FormField
        label="New password"
        required
        error={errors.newPassword?.message}
        hint={<PasswordChecklist password={newPassword} />}
      >
        {(controlProps) => (
          <PasswordInput
            {...controlProps}
            autoComplete="new-password"
            {...register('newPassword')}
          />
        )}
      </FormField>
      <FormField label="Confirm new password" required error={errors.confirmPassword?.message}>
        {(controlProps) => (
          <PasswordInput
            {...controlProps}
            autoComplete="new-password"
            {...register('confirmPassword')}
          />
        )}
      </FormField>
      <div>
        <Button type="submit" isLoading={isSubmitting}>
          Change password
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          You&apos;ll be signed out on all devices.
        </p>
      </div>
    </form>
  );
}
