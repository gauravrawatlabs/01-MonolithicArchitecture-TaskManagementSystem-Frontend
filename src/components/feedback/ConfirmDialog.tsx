import { useState } from 'react';

import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  /**
   * Runs when the user confirms. If it returns a promise, the dialog shows a spinner, can't be
   * dismissed while it runs, closes on success and STAYS OPEN on failure (the caller shows the
   * error, e.g. a toast), so the user can retry or cancel.
   */
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
}: ConfirmDialogProps) {
  const [isPending, setIsPending] = useState(false);

  const handleConfirm = async () => {
    setIsPending(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      // Keep the dialog open; the caller is responsible for showing the error.
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      size="sm"
      role="alertdialog"
      dismissible={!isPending}
      footer={
        <>
          <Button
            variant="secondary"
            disabled={isPending}
            onClick={() => {
              onOpenChange(false);
            }}
          >
            {cancelLabel}
          </Button>
          <Button variant={variant} isLoading={isPending} onClick={() => void handleConfirm()}>
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
