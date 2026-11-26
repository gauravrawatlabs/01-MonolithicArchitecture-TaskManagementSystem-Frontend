import { apiClient } from '@/api/client';
import {
  type AuthResponse,
  type ChangePasswordRequest,
  type ConfirmEmailRequest,
  type ForgotPasswordRequest,
  type LoginRequest,
  type RefreshTokenRequest,
  type RegisterRequest,
  type ResendConfirmationEmailRequest,
  type ResetPasswordRequest,
  type UserProfile,
} from '@/types/api';

/**
 * One typed function per backend endpoint (AuthController + AccountController).
 * No React, no toasts: just HTTP. Errors arrive as ApiError (see api/client.ts).
 * POST /api/auth/refresh lives in src/api/session.ts (session infrastructure, not a feature call).
 *
 * `skipAuthRefresh`: a 401 from these endpoints means "wrong credentials" or "not signed in",
 * not "access token expired", so the interceptor must not refresh and retry.
 */
const noRefresh = { skipAuthRefresh: true } as const;

export const authApi = {
  /** 200 AuthResponse · 401 invalid credentials / locked / inactive */
  login: async (body: LoginRequest) =>
    (await apiClient.post<AuthResponse>('/api/auth/login', body, noRefresh)).data,

  /** 201 UserProfileResponse (no tokens) · 400 validation · 409 email already registered */
  register: async (body: RegisterRequest) =>
    (await apiClient.post<UserProfile>('/api/auth/register', body, noRefresh)).data,

  /** 204 · also for unknown or already revoked tokens */
  logout: async (body: RefreshTokenRequest) => {
    await apiClient.post('/api/auth/logout', body, noRefresh);
  },

  /** 204 · revokes every refresh token of the signed-in user (all devices) · 401 */
  logoutAll: async () => {
    await apiClient.post('/api/auth/logout-all');
  },

  /** 200 UserProfileResponse · 401 */
  me: async () => (await apiClient.get<UserProfile>('/api/auth/me')).data,
};

export const accountApi = {
  /** 204 · 400 { token: ["The link is invalid or has expired…"] } */
  confirmEmail: async (body: ConfirmEmailRequest) => {
    await apiClient.post('/api/account/confirm-email', body);
  },

  /** Always 202 (prevents account enumeration). */
  resendConfirmation: async (body: ResendConfirmationEmailRequest) => {
    await apiClient.post('/api/account/resend-confirmation', body);
  },

  /** Always 202 (prevents account enumeration). */
  forgotPassword: async (body: ForgotPasswordRequest) => {
    await apiClient.post('/api/account/forgot-password', body);
  },

  /** 204 (all sessions revoked) · 400 token invalid/expired or password policy (newPassword) */
  resetPassword: async (body: ResetPasswordRequest) => {
    await apiClient.post('/api/account/reset-password', body);
  },

  /** 204 (all sessions revoked) · 400 currentPassword wrong or newPassword policy · 401 */
  changePassword: async (body: ChangePasswordRequest) => {
    await apiClient.post('/api/account/change-password', body);
  },
};
