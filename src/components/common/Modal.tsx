import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { type ReactNode, type RefObject, useLayoutEffect, useRef } from 'react';

import { cn } from '@/utils/cn';

export type ModalSize = 'sm' | 'md' | 'lg';

const sizes: Record<ModalSize, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
};

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  /** Action buttons, rendered in a footer bar. */
  footer?: ReactNode;
  size?: ModalSize;
  /** "alertdialog" for confirmations that need an explicit choice. */
  role?: 'dialog' | 'alertdialog';
  /** Set false to block closing (e.g. while a request is running). */
  dismissible?: boolean;
  /**
   * Element to focus when the modal opens, e.g. a form's first input. By default Radix focuses the
   * first focusable element (the close button). Use this instead of the autoFocus attribute.
   */
  initialFocusRef?: RefObject<HTMLElement | null>;
}

/**
 * Accessible modal built on Radix Dialog: focus is trapped inside and returned to the trigger on
 * close; Escape and the overlay close it; the title/description are wired to aria-labelledby /
 * aria-describedby. Full-screen sheet on phones, centred card from the `sm` breakpoint.
 *
 * Focus return: Radix only returns focus to its own <Dialog.Trigger>. Our modals are opened from
 * app state (buttons, menu items, table rows), so the Modal remembers what had focus when it
 * opened and puts focus back there on close. Keyboard users stay where they were.
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
  role = 'dialog',
  dismissible = true,
  initialFocusRef,
}: ModalProps) {
  const returnFocusRef = useRef<HTMLElement | null>(null);

  // Layout effects run before Radix's focus-trap effect moves focus into the dialog,
  // so document.activeElement is still the element that opened it.
  useLayoutEffect(() => {
    if (open && document.activeElement instanceof HTMLElement) {
      returnFocusRef.current = document.activeElement;
    }
  }, [open]);

  const blockIfNotDismissible = (event: Event) => {
    if (!dismissible) {
      event.preventDefault();
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-overlay" />
        <Dialog.Content
          role={role}
          // Without a description, tell Radix explicitly that none exists (avoids a dev warning).
          {...(description ? {} : { 'aria-describedby': undefined })}
          onOpenAutoFocus={(event) => {
            if (initialFocusRef?.current) {
              event.preventDefault();
              initialFocusRef.current.focus();
            }
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const target = returnFocusRef.current;
            if (target?.isConnected) {
              target.focus();
            }
          }}
          onEscapeKeyDown={blockIfNotDismissible}
          onPointerDownOutside={blockIfNotDismissible}
          onInteractOutside={blockIfNotDismissible}
          className={cn(
            'fixed inset-0 z-50 flex flex-col bg-surface text-foreground shadow-xl focus:outline-none',
            'sm:inset-auto sm:top-1/2 sm:left-1/2 sm:max-h-[85vh] sm:w-[calc(100%-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:border',
            sizes[size],
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            {dismissible ? (
              <Dialog.Close
                aria-label="Close"
                className="-mr-1 inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              >
                <X aria-hidden="true" className="size-4" />
              </Dialog.Close>
            ) : null}
          </div>
          {children ? <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div> : null}
          {footer ? (
            <div className="flex flex-col-reverse gap-2 border-t px-5 py-3 sm:flex-row sm:justify-end">
              {footer}
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
