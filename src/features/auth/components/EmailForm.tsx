import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { FormErrorSummary } from '@/components/forms/FormErrorSummary';
import { FormField } from '@/components/forms/FormField';
import { applyServerErrors } from '@/utils/formErrors';

import { emailOnlySchema, type EmailOnlyFormValues } from '../schemas/authSchemas';

export interface EmailFormProps {
  submitLabel: string;
  /** Sends the request; throw (e.g. an ApiError) to show the error in the form. */
  onSubmit: (email: string) => Promise<void>;
  defaultEmail?: string;
}

/** A single email field + submit. Used by "forgot password" and "resend confirmation email". */
export function EmailForm({ submitLabel, onSubmit, defaultEmail = '' }: EmailFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EmailOnlyFormValues>({
    resolver: zodResolver(emailOnlySchema),
    defaultValues: { email: defaultEmail },
  });

  const submit = handleSubmit(async ({ email }) => {
    try {
      await onSubmit(email);
    } catch (error) {
      applyServerErrors(setError, error, { fields: ['email'] });
    }
  });

  return (
    <form noValidate onSubmit={submit} className="grid gap-4">
      <FormErrorSummary message={errors.root?.server?.message} />
      <FormField label="Email" required error={errors.email?.message}>
        {(control) => (
          <Input {...control} type="email" autoComplete="email" {...register('email')} />
        )}
      </FormField>
      <Button type="submit" isLoading={isSubmitting} className="w-full">
        {submitLabel}
      </Button>
    </form>
  );
}
