import { BadgeCheck, MailWarning } from 'lucide-react';
import { Link } from 'react-router';

import { Card, CardContent, CardHeader } from '@/components/common/Card';
import { paths } from '@/constants/routes';
import { isEmailVerified, ResendConfirmationButton, useAuth } from '@/features/auth';
import { RoleBadges } from '@/features/users';
import { formatDate } from '@/utils/dates';

/** Settings › Account: sign-in identity, verification (with resend), roles, and where to change what. */
export function AccountSettings() {
  const { user } = useAuth();
  if (!user) return null;
  const verified = isEmailVerified(user);

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader title="Email address" description="You sign in with this address." />
        <CardContent className="grid gap-3">
          <p className="font-medium break-all">{user.email}</p>
          {verified ? (
            <p className="flex items-center gap-1.5 text-sm text-success">
              <BadgeCheck aria-hidden="true" className="size-4" /> Verified
            </p>
          ) : (
            <>
              <p className="flex items-center gap-1.5 text-sm text-warning">
                <MailWarning aria-hidden="true" className="size-4" /> Not verified yet
              </p>
              <p className="text-sm text-muted-foreground">
                Until you confirm your address, you can look around but not create or change
                anything. Open the link we emailed you, or ask for a new one.
              </p>
              <ResendConfirmationButton email={user.email} />
            </>
          )}
          <p className="text-xs text-muted-foreground">
            The email address itself can't be changed.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Account" />
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Name</dt>
              <dd className="mt-0.5">
                {user.firstName} {user.lastName}{' '}
                <Link to={paths.profile} className="ml-1 font-medium text-primary hover:underline">
                  Edit in Profile
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Roles</dt>
              <dd className="mt-1">
                <RoleBadges roles={user.roles} />
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Member since</dt>
              <dd className="mt-0.5">{formatDate(user.createdAtUtc)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Closing your account</dt>
              <dd className="mt-0.5">Ask an administrator: they can deactivate it.</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
