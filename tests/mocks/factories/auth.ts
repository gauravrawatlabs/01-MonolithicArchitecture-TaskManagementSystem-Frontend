import { type AuthResponse, type UserProfile } from '@/types/api';

import { buildUser } from './users';

/** A successful login/refresh response (backend AuthResponse), typed with the generated DTO. */
export function buildAuthResponse(
  user: UserProfile = buildUser(),
  overrides: Partial<AuthResponse> = {},
): AuthResponse {
  return {
    accessToken: 'test-access-token',
    tokenType: 'Bearer',
    accessTokenExpiresAtUtc: '2099-01-01T00:15:00Z',
    refreshToken: 'test-refresh-token',
    refreshTokenExpiresAtUtc: '2099-01-08T00:00:00Z',
    user,
    ...overrides,
  };
}
