import { UsersRound } from 'lucide-react';
import { Link } from 'react-router';

import { getErrorMessage } from '@/api/apiError';
import { Avatar } from '@/components/common/Avatar';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { SearchInput } from '@/components/forms/SearchInput';
import { PageHeader } from '@/components/layout/PageHeader';
import { paths } from '@/constants/routes';
import { useAuth } from '@/features/auth';
import { useUrlState } from '@/hooks/useUrlState';

import { TEAM_PROJECT_LIMIT, type TeamMember, useTeam } from '../hooks/useTeam';

function matches(member: TeamMember, term: string) {
  const needle = term.trim().toLocaleLowerCase();
  return (
    !needle ||
    member.fullName.toLocaleLowerCase().includes(needle) ||
    member.email.toLocaleLowerCase().includes(needle)
  );
}

/** /team: the people in my projects (search kept in the URL). */
export function TeamPage() {
  const { user } = useAuth();
  const team = useTeam();
  const [url, updateUrl] = useUrlState({ search: '' });
  const shown = team.members.filter((member) => matches(member, url.search));

  return (
    <>
      <PageHeader title="Team" description="Everyone in the projects you belong to." />
      {team.error ? (
        <Card>
          <ErrorState
            title="We couldn't load your team"
            description={getErrorMessage(team.error)}
            onRetry={team.refetch}
          />
        </Card>
      ) : team.isPending ? (
        <div
          role="status"
          aria-label="Loading team"
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
        >
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : team.members.length === 0 ? (
        <Card>
          <EmptyState
            icon={UsersRound}
            title="No team yet"
            description="Your team is everyone in your projects. Once you're in a project, its members appear here."
          />
        </Card>
      ) : (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SearchInput
              label="Search team"
              placeholder="Name or email"
              value={url.search}
              onValueChange={(value) => {
                updateUrl({ search: value });
              }}
              className="w-full sm:max-w-xs"
            />
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {url.search.trim()
                ? `${shown.length} of ${team.members.length} people`
                : `${team.members.length} people`}
            </p>
          </div>
          {team.failed > 0 ? (
            <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-warning">
              Some projects couldn't be loaded, so this list may be incomplete.
              <Button variant="secondary" size="sm" onClick={team.refetch}>
                Try again
              </Button>
            </div>
          ) : null}
          {team.projectCount > TEAM_PROJECT_LIMIT ? (
            <p className="text-sm text-muted-foreground">
              Showing the members of your first {TEAM_PROJECT_LIMIT} projects.
            </p>
          ) : null}
          {shown.length === 0 ? (
            <Card>
              <EmptyState icon={UsersRound} title={`Nobody matches "${url.search.trim()}"`} />
            </Card>
          ) : (
            <ul aria-label="Team members" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((member) => (
                <li
                  key={member.userId}
                  className="relative flex h-full gap-3 rounded-xl border bg-surface p-4 shadow-xs focus-within:border-primary hover:border-primary"
                >
                  <Avatar name={member.fullName} size="md" decorative />
                  <div className="min-w-0">
                    {/* Stretched link: its NAME is just the person's name (a link wrapping the whole card would
                        be announced as one run-together sentence); ::after makes the whole card clickable. */}
                    <Link
                      to={paths.teamMember(member.userId)}
                      className="block font-medium after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none"
                    >
                      {member.fullName}
                    </Link>
                    {member.userId === user?.id ? (
                      <span className="text-sm text-muted-foreground">(you)</span>
                    ) : null}
                    <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                    <ul
                      aria-label={`${member.fullName}'s projects`}
                      className="mt-2 flex flex-wrap gap-1"
                    >
                      {member.projects.map((p) => (
                        <li key={p.projectId}>
                          <Badge variant={p.memberRole === 'Owner' ? 'primary' : 'neutral'}>
                            {p.projectName}
                            {p.memberRole === 'Owner' ? ' · Owner' : ''}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}
