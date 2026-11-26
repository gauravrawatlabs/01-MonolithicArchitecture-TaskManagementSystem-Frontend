import { type UserProfile } from '@/types/api';

let sequence = 0;

/**
 * Test-data builder for the backend's UserProfileResponse. Typed with the generated DTO, so a
 * contract change breaks the tests at compile time. Override only what a test cares about:
 *   buildUser({ roles: ['Admin'] })
 */
export function buildUser(overrides: Partial<UserProfile> = {}): UserProfile {
  sequence += 1;
  return {
    id: `00000000-0000-4000-9000-${String(sequence).padStart(12, '0')}`,
    email: `user${sequence}@example.test`,
    firstName: 'Test',
    lastName: `User${sequence}`,
    jobTitle: null,
    emailConfirmed: true,
    isActive: true,
    roles: ['User'],
    createdAtUtc: '2026-11-01T09:00:00Z',
    lastLoginAtUtc: null,
    ...overrides,
  };
}
