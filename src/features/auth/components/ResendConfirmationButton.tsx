import { getErrorMessage } from '@/api/apiError';
import { Button } from '@/components/common/Button';
import { useToast } from '@/contexts/toast';
import { useCountdown } from '@/hooks/useCountdown';

import { RESEND_COOLDOWN_SECONDS } from '../constants';
import { useResendConfirmationMutation } from '../hooks/useAuthMutations';

/**
 * Sends a new confirmation link to the signed-in user's address, then waits 60 s before allowing another
 * (the same cooldown as after registration). The API answers the same whether or not anything was sent,
 * so the message is neutral.
 */
export function ResendConfirmationButton({ email }: { email: string }) {
  const toast = useToast();
  const resend = useResendConfirmationMutation();
  const { remaining, start } = useCountdown(RESEND_COOLDOWN_SECONDS);

  return (
    <Button
      variant="secondary"
      isLoading={resend.isPending}
      disabled={remaining > 0}
      onClick={() => {
        resend.mutate(email, {
          onSuccess: () => {
            toast.success(
              'Confirmation email sent',
              `Check ${email} for a new link. It expires in 3 hours.`,
            );
            start();
          },
          onError: (error) => {
            toast.error('Could not send the email', getErrorMessage(error));
          },
        });
      }}
    >
      {remaining > 0 ? `Resend available in ${String(remaining)} s` : 'Resend confirmation email'}
    </Button>
  );
}
