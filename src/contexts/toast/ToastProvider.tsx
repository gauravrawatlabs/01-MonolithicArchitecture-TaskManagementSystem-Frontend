import * as RadixToast from '@radix-ui/react-toast';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { type ReactNode, useCallback, useMemo, useRef, useState } from 'react';

import { cn } from '@/utils/cn';

import { type ToastApi, ToastContext, type ToastOptions, type ToastVariant } from './toastContext';

interface ToastItem extends ToastOptions {
  id: number;
  variant: ToastVariant;
}

/** Errors stay longer: they usually need to be read. */
const DURATION_MS: Record<ToastVariant, number> = { success: 4000, info: 5000, error: 8000 };
const MAX_VISIBLE = 4;

const variantStyles: Record<ToastVariant, { icon: typeof Info; iconClassName: string }> = {
  success: { icon: CircleCheck, iconClassName: 'text-success' },
  error: { icon: CircleAlert, iconClassName: 'text-danger' },
  info: { icon: Info, iconClassName: 'text-info' },
};

/**
 * Toast notifications built on Radix Toast: announced to screen readers, paused on hover/focus,
 * swipe-to-dismiss on touch, F8 jumps to the toast region. Call useToast() anywhere below this provider.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const remove = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback((variant: ToastVariant, options: ToastOptions) => {
    const id = nextId.current++;
    setToasts((current) => [...current, { ...options, id, variant }].slice(-MAX_VISIBLE));
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (title, description) => {
        show('success', { title, ...(description ? { description } : {}) });
      },
      info: (title, description) => {
        show('info', { title, ...(description ? { description } : {}) });
      },
      error: (title, description, correlationId) => {
        show('error', {
          title,
          ...(description ? { description } : {}),
          ...(correlationId ? { correlationId } : {}),
        });
      },
    }),
    [show],
  );

  return (
    <ToastContext value={api}>
      <RadixToast.Provider swipeDirection="right" label="Notifications">
        {children}
        {toasts.map((toast) => {
          const { icon: Icon, iconClassName } = variantStyles[toast.variant];
          return (
            <RadixToast.Root
              key={toast.id}
              duration={DURATION_MS[toast.variant]}
              type={toast.variant === 'error' ? 'foreground' : 'background'}
              onOpenChange={(open) => {
                if (!open) remove(toast.id);
              }}
              className={cn(
                'pointer-events-auto flex w-full items-start gap-3 rounded-xl border bg-surface p-4 text-foreground shadow-lg',
                'data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=end]:translate-x-full',
              )}
            >
              <Icon aria-hidden="true" className={cn('mt-0.5 size-5 shrink-0', iconClassName)} />
              <div className="min-w-0 flex-1">
                <RadixToast.Title className="text-sm font-semibold">{toast.title}</RadixToast.Title>
                {toast.description ? (
                  <RadixToast.Description className="mt-0.5 text-sm text-muted-foreground">
                    {toast.description}
                  </RadixToast.Description>
                ) : null}
                {toast.correlationId ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Reference: <code className="font-mono">{toast.correlationId}</code>
                  </p>
                ) : null}
              </div>
              <RadixToast.Close
                aria-label="Dismiss notification"
                className="-m-1 inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              >
                <X aria-hidden="true" className="size-4" />
              </RadixToast.Close>
            </RadixToast.Root>
          );
        })}
        <RadixToast.Viewport className="fixed right-0 bottom-0 z-[100] flex w-full max-w-sm flex-col gap-2 p-4 outline-none" />
      </RadixToast.Provider>
    </ToastContext>
  );
}
