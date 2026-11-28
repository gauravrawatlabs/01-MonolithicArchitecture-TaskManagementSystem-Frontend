import { LogOut } from 'lucide-react';
import { useState } from 'react';

import { getErrorMessage } from '@/api/apiError';
import { Button } from '@/components/common/Button';
import { Card, CardContent, CardHeader } from '@/components/common/Card';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { useToast } from '@/contexts/toast';
import { useLogoutAllMutation } from '@/features/auth';

/**
 * Settings › Security: POST /api/auth/logout-all revokes every refresh token of this user, on every
 * browser and device (e.g. after losing a phone). Other devices are signed out at their next refresh.
 */
export function SessionsCard() {
  const [open, setOpen] = useState(false);
  const logoutAll = useLogoutAllMutation();
  const toast = useToast();

  return (
    <Card>
      <CardHeader
        title="Sessions"
        description="Signed in on a device you no longer use? End every session at once."
      />
      <CardContent>
        <Button
          variant="secondary"
          leftIcon={<LogOut aria-hidden="true" />}
          onClick={() => {
            setOpen(true);
          }}
        >
          Sign out of all devices
        </Button>
        <ConfirmDialog
          open={open}
          onOpenChange={setOpen}
          title="Sign out of all devices?"
          description="Every browser and device signed in to your account, including this one, will need to sign in again."
          confirmLabel="Sign out everywhere"
          onConfirm={async () => {
            try {
              await logoutAll.mutateAsync();
            } catch (error) {
              toast.error('Could not sign out everywhere', getErrorMessage(error));
              throw error; // keeps the dialog open
            }
          }}
        />
      </CardContent>
    </Card>
  );
}
