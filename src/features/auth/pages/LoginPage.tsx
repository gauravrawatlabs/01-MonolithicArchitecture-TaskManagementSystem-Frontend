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
import { type PreviewAccount } from '../previewUsers';
import { loginSchema, type LoginFormValues } from '../schemas/authSchemas';
import { readLoginNotice } from '../types';
import { useAuth } from '../useAuth';

const NOTICES = {
  passwordReset: 'Your password has been reset. Sign in with your new password.',
  passwordChanged:
    'Your password was changed and you were signed out everywhere. Please sign in again.',
} as const;

const PREVIEW_ACCOUNTS: { account: PreviewAccount; label: string }[] = [
  { account: 'admin', label: 'Admin' },
  { account: 'manager', label: 'Manager' },
  { account: 'user', label: 'User' },
  { account: 'unverified', label: 'User (email not verified)' },
];

/**
 * POST /api/auth/login. On success the tokens and user are stored (useLoginMutation), and
 * RequireGuest sends the user on to the returnUrl. A 401 is shown as ONE generic form message:
 * saying which field was wrong would tell attackers whether an email has an account.
 */
export function LoginPage() {
  const location = useLocation();
  const notice = readLoginNotice(location.state);
  const { previewSignIn } = useAuth();
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

      {notice ? <Banner variant="success" title={NOTICES[notice]} className="mb-4" /> : null}
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

      {/* TEMPORARY (until Phase 7). import.meta.env.DEV is a build-time constant: removed from production. */}
      {import.meta.env.DEV && previewSignIn ? (
        <section
          aria-labelledby="preview-heading"
          className="mt-8 rounded-xl border border-dashed p-4"
        >
          <h2 id="preview-heading" className="text-sm font-semibold">
            Development preview
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Explore the UI without the backend. No API call is made, so pages that load data will
            fail; reloading signs you out. Removed in Phase 7.
          </p>
          <div className="mt-3 grid gap-2">
            {PREVIEW_ACCOUNTS.map(({ account, label }) => (
              <Button
                key={account}
                variant="secondary"
                onClick={() => {
                  previewSignIn(account);
                }}
              >
                Continue as {label}
              </Button>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
