import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Builds a className string: clsx handles conditions (`isActive && 'bg-primary'`),
 * tailwind-merge resolves conflicts so the LAST utility wins (`px-2` + `px-4` → `px-4`).
 * This is what lets callers safely override a component's default classes.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
