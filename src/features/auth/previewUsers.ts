import { type UserProfile } from '@/types/api';

/**
 * TEMPORARY (Phase 5 only, development builds only): sample accounts for previewing role-based
 * navigation before real authentication exists. They never reach the API and are deleted in Phase 7.
 * The objects use the real UserProfileResponse type, so they can't drift from the backend contract.
 */
export type PreviewAccount = 'admin' | 'manager' | 'user' | 'unverified';

const base = {
  jobTitle: null,
  isActive: true,
  createdAtUtc: '2026-11-01T09:00:00Z',
  lastLoginAtUtc: '2026-11-26T08:30:00Z',
} as const;

export const PREVIEW_USERS: Record<PreviewAccount, UserProfile> = {
  admin: {
    ...base,
    id: '00000000-0000-4000-8000-000000000001',
    email: 'admin@preview.local',
    firstName: 'Alex',
    lastName: 'Admin',
    jobTitle: 'System administrator',
    emailConfirmed: true,
    roles: ['Admin'],
  },
  manager: {
    ...base,
    id: '00000000-0000-4000-8000-000000000002',
    email: 'manager@preview.local',
    firstName: 'Maria',
    lastName: 'Manager',
    jobTitle: 'Project manager',
    emailConfirmed: true,
    roles: ['Manager'],
  },
  user: {
    ...base,
    id: '00000000-0000-4000-8000-000000000003',
    email: 'user@preview.local',
    firstName: 'Uma',
    lastName: 'User',
    emailConfirmed: true,
    roles: ['User'],
  },
  unverified: {
    ...base,
    id: '00000000-0000-4000-8000-000000000004',
    email: 'new@preview.local',
    firstName: 'Nina',
    lastName: 'Newcomer',
    emailConfirmed: false,
    roles: ['User'],
  },
};
