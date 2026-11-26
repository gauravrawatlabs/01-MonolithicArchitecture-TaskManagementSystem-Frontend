import { REFRESH_TOKEN_STORAGE_KEY } from './tokenStorage';

const REFRESH_LOCK_NAME = 'tms-auth-refresh';

/** In-tab fallback for browsers (and jsdom) without the Web Locks API: a promise chain. */
let fallbackQueue: Promise<unknown> = Promise.resolve();

/**
 * Runs `task` while holding a lock shared by ALL tabs of this origin (Web Locks API), so only one
 * tab refreshes at a time. The backend revokes every session if the same refresh token is used
 * twice, and two tabs refreshing in parallel would do exactly that.
 */
export async function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && 'locks' in navigator) {
    // The DOM typings say request() resolves to what the callback returns (here a Promise);
    // `await` unwraps it, at runtime and for TypeScript.
    return await navigator.locks.request(REFRESH_LOCK_NAME, task);
  }
  const run = fallbackQueue.then(task, task);
  fallbackQueue = run.catch(() => undefined);
  return await run;
}

export type SessionStorageChange = 'signedOutElsewhere' | 'signedInElsewhere' | 'rotatedElsewhere';

/**
 * Reports refresh-token changes made by OTHER tabs (the `storage` event never fires in the tab that
 * made the change). Returns an unsubscribe function.
 */
export function onOtherTabSessionChange(
  listener: (change: SessionStorageChange) => void,
): () => void {
  const handleStorage = (event: StorageEvent) => {
    // key === null means localStorage.clear() in another tab.
    if (event.key !== REFRESH_TOKEN_STORAGE_KEY && event.key !== null) return;
    if (event.newValue === null) {
      listener('signedOutElsewhere');
    } else {
      listener(event.oldValue === null ? 'signedInElsewhere' : 'rotatedElsewhere');
    }
  };
  window.addEventListener('storage', handleStorage);
  return () => {
    window.removeEventListener('storage', handleStorage);
  };
}
