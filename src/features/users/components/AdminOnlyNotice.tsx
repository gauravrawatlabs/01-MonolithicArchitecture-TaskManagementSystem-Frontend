import { ShieldAlert } from 'lucide-react';

import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/feedback/EmptyState';

/** Shown to an Admin whose email isn't verified: the API's AdminOnly pages also need EmailVerified. */
export function VerifyToAdminister() {
  return (
    <Card>
      <EmptyState
        icon={ShieldAlert}
        title="Verify your email address first"
        description="User administration requires a verified email address, even for administrators."
      />
    </Card>
  );
}
