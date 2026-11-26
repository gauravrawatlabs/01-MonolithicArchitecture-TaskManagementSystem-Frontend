import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';

import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { FormErrorSummary } from '@/components/forms/FormErrorSummary';
import { FormField } from '@/components/forms/FormField';
import { PasswordChecklist } from '@/components/forms/PasswordChecklist';
import { PasswordInput } from '@/components/forms/PasswordInput';
import { paths } from '@/constants/routes';
import { applyServerErrors } from '@/utils/formErrors';

import { AuthPageHeader } from '../components/AuthPageHeader';
import { useRegisterMutation } from '../hooks/useAuthMutations';
import { registerSchema, type RegisterFormValues } from '../schemas/authSchemas';
import { type RegisterSuccessLocationState } from '../types';

/**
 * POST /api/auth/register → 201 with no tokens (the user signs in after confirming their email).
 * 409 "email already exists" is shown on the email field; 400 field errors under each field.
 */
export function RegisterPage() {
  const navigate = useNavigate();
  const registerMutation = useRegisterMutation();
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '', confirmPassword: '' },
  });
  const password = useWatch({ control, name: 'password' });

  const submit = handleSubmit(async ({ firstName, lastName, email, password: newPassword }) => {
    try {
      await registerMutation.mutateAsync({ firstName, lastName, email, password: newPassword });
    } catch (error) {
      applyServerErrors(setError, error, {
        fields: ['firstName', 'lastName', 'email', 'password'],
        statusToField: { 409: 'email' },
      });
      return;
    }
    const state: RegisterSuccessLocationState = { email };
    await navigate(paths.registerSuccess, { state });
  });

  return (
    <>
      <AuthPageHeader title="Create your account" description="It takes less than a minute." />
      <FormErrorSummary title="Registration failed" message={errors.root?.server?.message} />

      <form noValidate onSubmit={submit} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="First name" required error={errors.firstName?.message}>
            {(controlProps) => (
              <Input {...controlProps} autoComplete="given-name" {...register('firstName')} />
            )}
          </FormField>
          <FormField label="Last name" required error={errors.lastName?.message}>
            {(controlProps) => (
              <Input {...controlProps} autoComplete="family-name" {...register('lastName')} />
            )}
          </FormField>
        </div>
        <FormField label="Email" required error={errors.email?.message}>
          {(controlProps) => (
            <Input {...controlProps} type="email" autoComplete="email" {...register('email')} />
          )}
        </FormField>
        <FormField
          label="Password"
          required
          error={errors.password?.message}
          hint={<PasswordChecklist password={password} />}
        >
          {(controlProps) => (
            <PasswordInput
              {...controlProps}
              autoComplete="new-password"
              {...register('password')}
            />
          )}
        </FormField>
        <FormField label="Confirm password" required error={errors.confirmPassword?.message}>
          {(controlProps) => (
            <PasswordInput
              {...controlProps}
              autoComplete="new-password"
              {...register('confirmPassword')}
            />
          )}
        </FormField>
        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to={paths.login} className="font-medium text-primary-text hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
