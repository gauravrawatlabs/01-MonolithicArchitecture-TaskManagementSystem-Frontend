import {
  type PagedProjects,
  type ProjectDetails,
  type ProjectMember,
  type ProjectSummary,
  type UserLookup,
} from '@/types/api';

let sequence = 0;
const OWNER_ID = '00000000-0000-4000-9000-0000000000aa';

/** A ProjectMemberResponse. */
export function buildMember(overrides: Partial<ProjectMember> = {}): ProjectMember {
  sequence += 1;
  return {
    userId: `00000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`,
    fullName: `Member ${sequence}`,
    email: `member${sequence}@example.test`,
    memberRole: 'Member',
    joinedAtUtc: '2026-11-02T09:00:00Z',
    ...overrides,
  };
}

/** A ProjectDetailsResponse. The owner is always in `members` (as the backend guarantees), first. */
export function buildProjectDetails(overrides: Partial<ProjectDetails> = {}): ProjectDetails {
  sequence += 1;
  const ownerId = overrides.ownerId ?? OWNER_ID;
  const ownerName = overrides.ownerName ?? 'Olivia Owner';
  return {
    id: 100 + sequence,
    name: `Project ${sequence}`,
    description: null,
    startDate: null,
    endDate: null,
    ownerId,
    ownerName,
    members: [
      buildMember({
        userId: ownerId,
        fullName: ownerName,
        email: 'owner@example.test',
        memberRole: 'Owner',
      }),
    ],
    createdAtUtc: '2026-11-01T09:00:00Z',
    updatedAtUtc: null,
    ...overrides,
  };
}

/** A ProjectSummaryResponse (list item, with the progress fields). */
export function buildProjectSummary(overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  sequence += 1;
  return {
    id: 100 + sequence,
    name: `Project ${sequence}`,
    description: null,
    startDate: null,
    endDate: null,
    ownerId: OWNER_ID,
    ownerName: 'Olivia Owner',
    memberCount: 1,
    taskCount: 0,
    openTaskCount: 0,
    doneTaskCount: 0,
    completionPercent: 0,
    createdAtUtc: '2026-11-01T09:00:00Z',
    updatedAtUtc: null,
    ...overrides,
  };
}

export function buildPagedProjects(
  items: ProjectSummary[],
  page = 1,
  pageSize = 12,
  totalCount = items.length,
): PagedProjects {
  const totalPages = Math.ceil(totalCount / pageSize);
  return {
    items,
    page,
    pageSize,
    totalCount,
    totalPages,
    hasPreviousPage: page > 1,
    hasNextPage: page < totalPages,
  };
}

export function buildLookupUser(overrides: Partial<UserLookup> = {}): UserLookup {
  sequence += 1;
  return {
    id: `00000000-0000-4000-7000-${String(sequence).padStart(12, '0')}`,
    fullName: `Person ${sequence}`,
    email: `person${sequence}@example.test`,
    jobTitle: null,
    ...overrides,
  };
}
