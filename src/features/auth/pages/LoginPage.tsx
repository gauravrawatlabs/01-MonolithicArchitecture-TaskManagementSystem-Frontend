import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useLocation } from 'react-router';

import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Banner } from '@/components/feedback/Banner';
import { FormErrorSummary } from '@/components/forms/FormErrorSummary';
import { FormField } from '@/components/forms/FormField';
import { PasswordInput } from '@/components/forms/PasswordInput';
import { paths } from '@/constants/routes';
import { applyServerErrors } from '@/utils/formErrors';

import { AuthPageHeader } from '../components/AuthPageHeader';
import { useLoginMutation } from '../hooks/useAuthMutations';
import { loginSchema, type LoginFormValues } from '../schemas/authSchemas';
import { type LoginNotice, readLoginNotice } from '../types';

/** Messages for the sign-in page after a redirect; the tone matches what happened. */
const NOTICES: Record<LoginNotice, { variant: 'success' | 'info' | 'warning'; text: string }> = {
  passwordReset: {
    variant: 'success',
    text: 'Your password has been reset. Sign in with your new password.',
  },
  passwordChanged: {
    variant: 'success',
    text: 'Your password was changed and you were signed out everywhere. Please sign in again.',
  },
  sessionExpired: {
    variant: 'warning',
    text: 'Your session has expired. Sign in again to continue where you left off.',
  },
  signedOutElsewhere: { variant: 'info', text: 'You signed out in another tab.' },
  signedOutEverywhere: { variant: 'success', text: 'You were signed out on all devices.' },
};

/**
 * POST /api/auth/login. On success the tokens and user are stored (useLoginMutation), and
 * RequireGuest sends the user on to the returnUrl. A 401 is shown as ONE generic form message:
 * saying which field was wrong would tell attackers whether an email has an account.
 */
export function LoginPage() {
  const location = useLocation();
  const notice = readLoginNotice(location.state);
  const login = useLoginMutation();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const submit = handleSubmit(async (values) => {
    try {
      await login.mutateAsync(values);
    } catch (error) {
      applyServerErrors(setError, error, { fields: ['email', 'password'] });
    }
  });

  return (
    <>
      <AuthPageHeader title="Welcome back" description="Sign in to your workspace." />

      {notice ? (
        <Banner variant={NOTICES[notice].variant} title={NOTICES[notice].text} className="mb-4" />
      ) : null}
      <FormErrorSummary title="Sign in failed" message={errors.root?.server?.message} />

      <form noValidate onSubmit={submit} className="grid gap-4">
        <FormField label="Email" required error={errors.email?.message}>
          {(control) => (
            <Input {...control} type="email" autoComplete="username" {...register('email')} />
          )}
        </FormField>
        <FormField label="Password" required error={errors.password?.message}>
          {(control) => (
            <PasswordInput {...control} autoComplete="current-password" {...register('password')} />
          )}
        </FormField>
        <div className="-mt-2 text-right">
          <Link
            to={paths.forgotPassword}
            className="text-sm font-medium text-primary-text hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        No account?{' '}
        <Link to={paths.register} className="font-medium text-primary-text hover:underline">
          Create one
        </Link>
      </p>
    </>
  );
}
