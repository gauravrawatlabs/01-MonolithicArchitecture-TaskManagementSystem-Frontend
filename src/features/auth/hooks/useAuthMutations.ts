import { useMutation } from '@tanstack/react-query';

import { refreshSession } from '@/api/session';

import { type LoginRequest, type RegisterRequest } from '@/types/api';

import { accountApi, authApi } from '../api/authApi';
import { useAuth } from '../useAuth';

/**
 * TanStack Query mutations for the account pages. A mutation gives each form `isPending`
 * (spinner, disabled button) and `mutateAsync` (await + catch for server errors) for free.
 * They are writes, so they are never retried automatically (queryClient defaults).
 */

/** Login → store tokens + user. RequireGuest then redirects to the returnUrl. */
export function useLoginMutation() {
  const { completeSignIn } = useAuth();
  return useMutation({
    mutationFn: (body: LoginRequest) => authApi.login(body),
    onSuccess: completeSignIn,
  });
}

export function useRegisterMutation() {
  return useMutation({ mutationFn: (body: RegisterRequest) => authApi.register(body) });
}

export function useResendConfirmationMutation() {
  return useMutation({ mutationFn: (email: string) => accountApi.resendConfirmation({ email }) });
}

export function useForgotPasswordMutation() {
  return useMutation({ mutationFn: (email: string) => accountApi.forgotPassword({ email }) });
}

export function useResetPasswordMutation() {
  return useMutation({ mutationFn: accountApi.resetPassword });
}

/**
 * If someone is signed in while confirming, get a NEW token pair: the old access token still says
 * email_verified=false, so write actions would get 403 until it expired. The refreshed user also
 * makes the "verify your email" banner disappear.
 */
export function useConfirmEmailMutation() {
  const { status } = useAuth();
  return useMutation({
    mutationFn: accountApi.confirmEmail,
    onSuccess: async () => {
      if (status === 'authenticated') {
        await refreshSession().catch(() => undefined);
      }
    },
  });
}

/** Success revokes every session on the server, so the caller signs out locally too. */
export function useChangePasswordMutation() {
  return useMutation({ mutationFn: accountApi.changePassword });
}

/** Revokes every session of this user (all browsers and devices), then signs out here. */
export function useLogoutAllMutation() {
  const { signOut } = useAuth();
  return useMutation({
    mutationFn: authApi.logoutAll,
    onSuccess: () => signOut({ notice: 'signedOutEverywhere' }),
  });
}
