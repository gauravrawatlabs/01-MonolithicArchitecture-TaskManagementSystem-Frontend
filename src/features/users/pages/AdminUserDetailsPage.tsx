import { UserX } from 'lucide-react';
import { Link, useParams } from 'react-router';

import { getErrorMessage, toApiError } from '@/api/apiError';
import { Avatar } from '@/components/common/Avatar';
import { buttonVariants } from '@/components/common/Button.styles';
import { Card, CardContent, CardHeader } from '@/components/common/Card';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useBreadcrumbLabel } from '@/components/layout/breadcrumbLabels';
import { PageHeader } from '@/components/layout/PageHeader';
import { paths } from '@/constants/routes';
import { useAuth } from '@/features/auth';
import { formatDateTime } from '@/utils/dates';

import { AccountStatusControl } from '../components/AccountStatusControl';
import { VerifyToAdminister } from '../components/AdminOnlyNotice';
import { RoleBadges } from '../components/RoleBadges';
import { RolesEditor } from '../components/RolesEditor';
import { useUser } from '../hooks/useUsers';
import { canAdministerUsers, fullName } from '../userRules';

/** /admin/users/:userId: one account, its roles and its status. */
export function AdminUserDetailsPage() {
  const { userId = '' } = useParams();
  const { user: me } = useAuth();
  const allowed = canAdministerUsers(me);
  const user = useUser(allowed ? userId : '');
  useBreadcrumbLabel('/admin/users/:userId', user.data ? fullName(user.data) : null);
  const error = user.isError ? toApiError(user.error) : null;

  if (!allowed) return <VerifyToAdminister />;
  if (error?.kind === 'notFound' || error?.kind === 'validation') {
    return (
      <Card>
        <EmptyState
          icon={UserX}
          title="User not found"
          description="There is no account with this id."
          action={
            <Link to={paths.adminUsers} className={buttonVariants({ variant: 'secondary' })}>
              Back to users
            </Link>
          }
        />
      </Card>
    );
  }
  if (user.isError) {
    return (
      <Card>
        <ErrorState
          title="We couldn't load this user"
          description={getErrorMessage(user.error)}
          correlationId={error?.correlationId}
          onRetry={() => void user.refetch()}
        />
      </Card>
    );
  }
  if (!user.data) {
    return (
      <div role="status" aria-label="Loading user" className="grid gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const account = user.data;
  const isMe = account.id === me?.id;
  return (
    <>
      <PageHeader
        title={fullName(account)}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <RoleBadges roles={account.roles} />
            {isMe ? <span>This is your account.</span> : null}
          </span>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="content-start">
          <CardContent className="grid justify-items-center gap-1 pt-6 text-center">
            <Avatar name={fullName(account)} size="lg" decorative />
            <p className="font-semibold">{fullName(account)}</p>
            {account.jobTitle ? (
              <p className="text-sm text-muted-foreground">{account.jobTitle}</p>
            ) : null}
          </CardContent>
          <CardContent>
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="mt-0.5 break-all">{account.email}</dd>
                <dd className="text-xs text-muted-foreground">
                  {account.emailConfirmed ? 'Verified' : 'Not verified'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Joined</dt>
                <dd className="mt-0.5">{formatDateTime(account.createdAtUtc)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Last sign-in</dt>
                <dd className="mt-0.5">
                  {account.lastLoginAtUtc ? formatDateTime(account.lastLoginAtUtc) : 'Never'}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
        <div className="grid content-start gap-6 lg:col-span-2">
          <Card>
            <CardHeader title="Roles" description="What this person may do across the system." />
            <CardContent>
              {/* key: a fresh editor when the account (or its saved roles) changes */}
              <RolesEditor key={`${account.id}:${account.roles.join(',')}`} user={account} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="Account status" />
            <CardContent>
              <AccountStatusControl user={account} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
