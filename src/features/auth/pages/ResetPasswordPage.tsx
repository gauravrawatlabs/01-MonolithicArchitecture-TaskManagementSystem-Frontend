import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';

import { toApiError } from '@/api/apiError';
import { Button } from '@/components/common/Button';
import { buttonVariants } from '@/components/common/Button.styles';
import { FormErrorSummary } from '@/components/forms/FormErrorSummary';
import { FormField } from '@/components/forms/FormField';
import { PasswordChecklist } from '@/components/forms/PasswordChecklist';
import { PasswordInput } from '@/components/forms/PasswordInput';
import { paths } from '@/constants/routes';
import { applyServerErrors } from '@/utils/formErrors';
import { maskEmail } from '@/utils/maskEmail';

import { AuthPageHeader } from '../components/AuthPageHeader';
import { AuthStatusMessage } from '../components/AuthStatusMessage';
import { useResetPasswordMutation } from '../hooks/useAuthMutations';
import { resetPasswordSchema, type ResetPasswordFormValues } from '../schemas/authSchemas';
import { type LoginLocationState } from '../types';

function InvalidLink({ reason }: { reason: string }) {
  return (
    <AuthStatusMessage
      variant="error"
      title="This reset link can't be used"
      actions={
        <Link to={paths.forgotPassword} className={buttonVariants()}>
          Request a new link
        </Link>
      }
    >
      <p>{reason}</p>
    </AuthStatusMessage>
  );
}

/**
 * Opened from the reset email: /reset-password?email=…&token=… (the path is fixed by the backend).
 * 204 → every session was revoked → sign in again. An invalid or expired token (400 errors.token)
 * replaces the form with a "request a new link" message.
 */
export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();
  const resetPassword = useResetPasswordMutation();
  const [linkExpired, setLinkExpired] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });
  const newPassword = useWatch({ control, name: 'newPassword' });

  if (!email || !token) {
    return (
      <InvalidLink reason="The link is incomplete. Copy the whole link from the email, or request a new one." />
    );
  }
  if (linkExpired) {
    return (
      <InvalidLink reason="The link is invalid or has expired. Reset links work once and for 3 hours." />
    );
  }

  const submit = handleSubmit(async ({ newPassword: password }) => {
    try {
      await resetPassword.mutateAsync({ email, token, newPassword: password });
    } catch (error) {
      if (toApiError(error).fieldErrors.token) {
        setLinkExpired(true);
        return;
      }
      applyServerErrors(setError, error, { fields: ['newPassword'] });
      return;
    }
    const state: LoginLocationState = { notice: 'passwordReset' };
    await navigate(paths.login, { replace: true, state });
  });

  return (
    <>
      <AuthPageHeader
        title="Choose a new password"
        description={
          <>
            For <strong className="text-foreground">{maskEmail(email)}</strong>. You&apos;ll be
            signed out of all devices.
          </>
        }
      />
      <FormErrorSummary message={errors.root?.server?.message} />
      <form noValidate onSubmit={submit} className="grid gap-4">
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
        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Reset password
        </Button>
      </form>
    </>
  );
}
