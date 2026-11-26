import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router';

import { buttonVariants } from '@/components/common/Button.styles';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import { paths } from '@/constants/routes';

/** Shown inside the app shell when a role guard (or later a 403 from the API) denies access. */
export function ForbiddenPage() {
  return (
    <>
      <PageHeader title="Access denied" />
      <Card>
        <EmptyState
          icon={ShieldAlert}
          title="You don't have permission to view this page"
          description="If you think you should have access, ask an administrator to update your role."
          action={
            <Link to={paths.dashboard} className={buttonVariants({ variant: 'secondary' })}>
              Back to dashboard
            </Link>
          }
        />
      </Card>
    </>
  );
}
