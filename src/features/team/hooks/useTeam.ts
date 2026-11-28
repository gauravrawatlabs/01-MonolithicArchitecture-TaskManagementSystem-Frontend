import { useQueries } from '@tanstack/react-query';

import { projectKeys, projectsApi, useProjects } from '@/features/projects';

export interface TeamMembership {
  projectId: number;
  projectName: string;
  memberRole: string;
  joinedAtUtc: string;
}

export interface TeamMember {
  userId: string;
  fullName: string;
  email: string;
  projects: TeamMembership[];
}

/** The API's page-size limit: Team covers the first 100 projects (by name). */
export const TEAM_PROJECT_LIMIT = 100;

/**
 * "Team" = everyone in MY projects (Phase 1 gap G5, option A). There is no team endpoint and other users'
 * profiles are Admin-only, so this gathers project members from each project's details (one request per
 * project, in parallel, cached under the same keys as the project pages) and merges them per person.
 */
export function useTeam() {
  const projects = useProjects({
    SortBy: 'Name',
    SortDirection: 'Asc',
    Page: 1,
    PageSize: TEAM_PROJECT_LIMIT,
  });
  const ids = (projects.data?.items ?? []).map((p) => p.id);

  return useQueries({
    queries: ids.map((id) => ({
      queryKey: projectKeys.detail(id),
      queryFn: ({ signal }: { signal: AbortSignal }) => projectsApi.getProject(id, signal),
      staleTime: 30_000,
    })),
    combine: (results) => {
      const byUser = new Map<string, TeamMember>();
      for (const project of results.flatMap((r) => (r.data ? [r.data] : []))) {
        for (const member of project.members) {
          const entry = byUser.get(member.userId) ?? {
            userId: member.userId,
            fullName: member.fullName,
            email: member.email,
            projects: [],
          };
          entry.projects.push({
            projectId: project.id,
            projectName: project.name,
            memberRole: member.memberRole,
            joinedAtUtc: member.joinedAtUtc,
          });
          byUser.set(member.userId, entry);
        }
      }
      return {
        members: [...byUser.values()].sort((a, b) => a.fullName.localeCompare(b.fullName)),
        isPending: projects.isPending || results.some((r) => r.isPending),
        /** Projects whose details failed: the list is then incomplete, and the page says so. */
        failed: results.filter((r) => r.isError).length,
        error: projects.error,
        refetch: () => {
          void projects.refetch();
          for (const r of results) if (r.isError) void r.refetch();
        },
        projectCount: projects.data?.totalCount ?? 0,
      };
    },
  });
}
