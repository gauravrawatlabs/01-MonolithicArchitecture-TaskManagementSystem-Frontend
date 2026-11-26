import { useSyncExternalStore } from 'react';

/**
 * Live result of a CSS media query, e.g. useMediaQuery('(min-width: 1024px)').
 * useSyncExternalStore subscribes to the browser's MediaQueryList, so the component re-renders
 * exactly when the answer changes (window resize, rotation) — no resize listeners, no tearing.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mediaQueryList = window.matchMedia(query);
      mediaQueryList.addEventListener('change', onChange);
      return () => {
        mediaQueryList.removeEventListener('change', onChange);
      };
    },
    () => window.matchMedia(query).matches,
  );
}

/** Tailwind's lg breakpoint: full sidebar from here up (Phase 1 §12). */
export const DESKTOP_QUERY = '(min-width: 1024px)';
/** Tailwind's md breakpoint: icon rail from here up, drawer below. */
export const TABLET_QUERY = '(min-width: 768px)';
