import { useState } from 'react';
import { Link } from 'react-router';

import { buttonVariants } from '@/components/common/Button.styles';
import { paths } from '@/constants/routes';

import { AuthPageHeader } from '../components/AuthPageHeader';
import { AuthStatusMessage } from '../components/AuthStatusMessage';
import { EmailForm } from '../components/EmailForm';
import { useForgotPasswordMutation } from '../hooks/useAuthMutations';

/**
 * POST /api/account/forgot-password always answers 202, and so does this page: the same neutral
 * message whether or not the account exists (no account enumeration).
 */
export function ForgotPasswordPage() {
  const forgotPassword = useForgotPasswordMutation();
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <AuthStatusMessage
        variant="success"
        title="Check your email"
        actions={
          <Link to={paths.login} className={buttonVariants({ variant: 'secondary' })}>
            Back to sign in
          </Link>
        }
      >
        <p>If an account exists for that address, we&apos;ve sent a link to reset your password.</p>
        <p>The link expires in 3 hours. Check your spam folder if it doesn&apos;t arrive.</p>
      </AuthStatusMessage>
    );
  }

  return (
    <>
      <AuthPageHeader
        title="Forgot your password?"
        description="Enter your account's email address and we'll send you a link to choose a new password."
      />
      <EmailForm
        submitLabel="Send reset link"
        onSubmit={async (email) => {
          await forgotPassword.mutateAsync(email);
          setSent(true);
        }}
      />
      <Link
        to={paths.login}
        className={buttonVariants({ variant: 'ghost', className: 'mt-4 w-full' })}
      >
        Back to sign in
      </Link>
    </>
  );
}
