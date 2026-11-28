import { useState } from 'react';

import { getErrorMessage } from '@/api/apiError';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { useToast } from '@/contexts/toast';
import { useAuth } from '@/features/auth';
import { type UserProfile } from '@/types/api';

import { useUpdateStatus } from '../hooks/useUsers';
import { canChangeStatus, fullName } from '../userRules';

/**
 * Activate / deactivate (PATCH /api/users/{id}/status). Deactivating signs the person out everywhere (all
 * sessions revoked) and they can't sign in until reactivated; the dialog says so. Your own account: no
 * button, and the reason as text (the API refuses with 422).
 */
export function AccountStatusControl({ user }: { user: UserProfile }) {
  const { user: me } = useAuth();
  const toast = useToast();
  const update = useUpdateStatus();
  const [confirming, setConfirming] = useState(false);
  const name = fullName(user);

  return (
    <div className="grid gap-3">
      <p className="flex items-center gap-2 text-sm">
        Status:{' '}
        {user.isActive ? (
          <Badge variant="success">Active</Badge>
        ) : (
          <Badge variant="danger">Deactivated</Badge>
        )}
      </p>
      {canChangeStatus(me, user) ? (
        <Button
          variant={user.isActive ? 'danger' : 'secondary'}
          className="justify-self-start"
          onClick={() => {
            setConfirming(true);
          }}
        >
          {user.isActive ? 'Deactivate account' : 'Reactivate account'}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">You can't deactivate your own account.</p>
      )}

      {confirming ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setConfirming(false);
          }}
          title={user.isActive ? `Deactivate ${name}?` : `Reactivate ${name}?`}
          description={
            user.isActive
              ? `${name} will be signed out on every device and can't sign in until reactivated. Their projects, tasks and comments stay.`
              : `${name} will be able to sign in again.`
          }
          confirmLabel={user.isActive ? 'Deactivate' : 'Reactivate'}
          onConfirm={async () => {
            try {
              const saved = await update.mutateAsync({ id: user.id, isActive: !user.isActive });
              toast.success(saved.isActive ? 'Account reactivated' : 'Account deactivated', name);
            } catch (error) {
              toast.error('Could not change the account status', getErrorMessage(error));
              throw error;
            }
          }}
        />
      ) : null}
    </div>
  );
}
