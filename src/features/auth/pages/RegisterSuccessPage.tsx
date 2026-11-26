import { MailCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router';

import { getErrorMessage } from '@/api/apiError';
import { Button } from '@/components/common/Button';
import { buttonVariants } from '@/components/common/Button.styles';
import { paths } from '@/constants/routes';
import { useToast } from '@/contexts/toast';
import { useCountdown } from '@/hooks/useCountdown';
import { maskEmail } from '@/utils/maskEmail';

import { AuthPageHeader } from '../components/AuthPageHeader';
import { EmailForm } from '../components/EmailForm';
import { useResendConfirmationMutation } from '../hooks/useAuthMutations';
import { readRegisteredEmail } from '../types';

export const RESEND_COOLDOWN_SECONDS = 60;
const SENT_MESSAGE = 'If the account exists and is not confirmed yet, a new link is on its way.';

/**
 * "Check your email" after registering. The address comes from router state, not the URL, so it
 * isn't kept in browser history or server logs. A direct visit has no address: the user types it.
 * Resend always answers 202, so the message never reveals whether an account exists.
 */
export function RegisterSuccessPage() {
  const email = readRegisteredEmail(useLocation().state);
  const toast = useToast();
  const resend = useResendConfirmationMutation();
  // Registration has just sent an email: the cooldown runs from the very first render.
  const { remaining, start } = useCountdown(RESEND_COOLDOWN_SECONDS, {
    startImmediately: Boolean(email),
  });

  const resendTo = async (address: string) => {
    await resend.mutateAsync(address);
    toast.success('Confirmation email sent', SENT_MESSAGE);
    start();
  };

  return (
    <>
      <span className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
        <MailCheck aria-hidden="true" className="size-6" />
      </span>
      <AuthPageHeader
        title="Check your email"
        description={
          email ? (
            <>
              We sent a confirmation link to{' '}
              <strong className="text-foreground">{maskEmail(email)}</strong>. Open it to activate
              your account. The link expires in 3 hours.
            </>
          ) : (
            'We sent you a link to confirm your email address. Enter your email below if you need a new one.'
          )
        }
      />

      {email ? (
        <Button
          variant="secondary"
          className="w-full"
          disabled={remaining > 0}
          isLoading={resend.isPending}
          onClick={() => {
            resendTo(email).catch((error: unknown) => {
              toast.error('Could not send the email', getErrorMessage(error));
            });
          }}
        >
          {remaining > 0 ? `Resend email (${remaining} s)` : 'Resend email'}
        </Button>
      ) : (
        <EmailForm submitLabel="Send a new link" onSubmit={resendTo} />
      )}

      <Link
        to={paths.login}
        className={buttonVariants({ variant: 'ghost', className: 'mt-4 w-full' })}
      >
        Back to sign in
      </Link>
    </>
  );
}
