import { use } from 'react';

import { type ToastApi, ToastContext } from './toastContext';

/** toast.success('Task created'), toast.error('Could not save', detail, correlationId), … */
export function useToast(): ToastApi {
  const context = use(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside <ToastProvider>.');
  }
  return context;
}
