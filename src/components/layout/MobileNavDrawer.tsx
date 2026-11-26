import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { type ReactNode } from 'react';

export interface MobileNavDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

/**
 * The sidebar as a slide-in drawer on phones (< 768 px). It's a modal dialog: focus is trapped,
 * Escape and the backdrop close it, and focus returns to the menu button.
 */
export function MobileNavDrawer({ open, onOpenChange, children }: MobileNavDrawerProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-overlay md:hidden" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] border-r shadow-xl focus:outline-none md:hidden"
        >
          <Dialog.Title className="sr-only">Navigation</Dialog.Title>
          <Dialog.Close
            aria-label="Close navigation"
            className="absolute top-4 right-3 inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-muted hover:text-foreground"
          >
            <X aria-hidden="true" className="size-4" />
          </Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
