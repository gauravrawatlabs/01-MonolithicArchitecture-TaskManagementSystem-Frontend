import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router';

import { toApiError } from '@/api/apiError';
import { Button } from '@/components/common/Button';
import { buttonVariants } from '@/components/common/Button.styles';
import { Spinner } from '@/components/common/Spinner';
import { paths } from '@/constants/routes';
import { useToast } from '@/contexts/toast';

import { AuthStatusMessage } from '../components/AuthStatusMessage';
import { EmailForm } from '../components/EmailForm';
import { useConfirmEmailMutation, useResendConfirmationMutation } from '../hooks/useAuthMutations';
import { useAuth } from '../useAuth';

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Opened from the confirmation email: /confirm-email?userId=…&token=… (the path is fixed by the
 * backend). Confirms automatically, exactly once. Works signed in or out.
 */
export function ConfirmEmailPage() {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId') ?? '';
  const token = searchParams.get('token') ?? '';
  const isWellFormed = GUID.test(userId) && token.length > 0;
  const { status } = useAuth();
  const toast = useToast();
  const confirm = useConfirmEmailMutation();
  const resend = useResendConfirmationMutation();
  const { mutate } = confirm;
  const started = useRef(false);

  // React StrictMode runs effects twice in development. The ref keeps it to ONE request:
  // a second request with the same (now used) token would fail and show a false error.
  useEffect(() => {
    if (!isWellFormed || started.current) return;
    started.current = true;
    mutate({ userId, token });
  }, [isWellFormed, mutate, userId, token]);

  const resendForm = (
    <div className="mt-6 w-full">
      <EmailForm
        submitLabel="Send a new confirmation link"
        onSubmit={async (email) => {
          await resend.mutateAsync(email);
          toast.success(
            'Confirmation email sent',
            'If the account exists and is not confirmed yet, a new link is on its way.',
          );
        }}
      />
    </div>
  );

  if (!isWellFormed) {
    return (
      <AuthStatusMessage variant="error" title="This confirmation link is incomplete">
        <p>Copy the whole link from the email, or request a new one below.</p>
        {resendForm}
      </AuthStatusMessage>
    );
  }

  if (confirm.isSuccess) {
    const next =
      status === 'authenticated' ? (
        <Link to={paths.dashboard} className={buttonVariants()}>
          Go to dashboard
        </Link>
      ) : (
        <Link to={paths.login} className={buttonVariants()}>
          Sign in
        </Link>
      );
    return (
      <AuthStatusMessage variant="success" title="Email confirmed" actions={next}>
        <p>Thanks! Your email address is verified and every feature is now unlocked.</p>
      </AuthStatusMessage>
    );
  }

  if (confirm.isError) {
    const isBadToken = Boolean(toApiError(confirm.error).fieldErrors.token);
    return isBadToken ? (
      <AuthStatusMessage variant="error" title="This confirmation link has expired">
        <p>Links work once and for 3 hours. Request a new one below.</p>
        {resendForm}
      </AuthStatusMessage>
    ) : (
      <AuthStatusMessage
        variant="error"
        title="We couldn't confirm your email"
        actions={
          <Button
            onClick={() => {
              mutate({ userId, token });
            }}
          >
            Try again
          </Button>
        }
      >
        <p>Something went wrong while contacting the server. Please try again.</p>
      </AuthStatusMessage>
    );
  }

  return (
    <div role="status" className="flex items-center gap-3 text-muted-foreground">
      <Spinner className="size-5 text-primary-text" label={null} />
      <h1 className="text-lg font-medium">Confirming your email…</h1>
    </div>
  );
}
