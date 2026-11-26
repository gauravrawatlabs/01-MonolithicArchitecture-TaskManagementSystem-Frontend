import { createContext } from 'react';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastOptions {
  title: string;
  description?: string;
  /** Shown on error toasts so users can quote it to support (from ProblemDetails). */
  correlationId?: string;
}

export interface ToastApi {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string, correlationId?: string) => void;
  info: (title: string, description?: string) => void;
  /** Low-level variant used by the helpers above. */
  show: (variant: ToastVariant, options: ToastOptions) => void;
}

export const ToastContext = createContext<ToastApi | null>(null);
