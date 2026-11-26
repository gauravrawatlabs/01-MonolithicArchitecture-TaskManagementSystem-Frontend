import { afterEach, describe, expect, it, vi } from 'vitest';

import { onOtherTabSessionChange, withRefreshLock } from '@/services/sessionSync';
import { REFRESH_TOKEN_STORAGE_KEY } from '@/services/tokenStorage';

describe('withRefreshLock', () => {
  afterEach(() => {
    // Remove the stubbed Web Locks API again (jsdom doesn't have one).
    Reflect.deleteProperty(navigator, 'locks');
  });

  it('runs tasks one after another (fallback lock without the Web Locks API)', async () => {
    const order: string[] = [];
    let releaseFirst: () => void = () => undefined;

    const first = withRefreshLock(async () => {
      order.push('first:start');
      await new Promise<void>((resolve) => {
        releaseFirst = resolve;
      });
      order.push('first:end');
      return 1;
    });
    const second = withRefreshLock(() => {
      order.push('second:start');
      return Promise.resolve(2);
    });

    await Promise.resolve(); // let the first task start
    releaseFirst();

    expect(await Promise.all([first, second])).toEqual([1, 2]);
    expect(order).toEqual(['first:start', 'first:end', 'second:start']);
  });

  it('releases the lock when a task fails', async () => {
    await expect(withRefreshLock(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom');

    await expect(withRefreshLock(() => Promise.resolve('next'))).resolves.toBe('next');
  });

  it('uses the browser-wide Web Lock when available', async () => {
    const request = vi.fn((_name: string, task: () => Promise<unknown>) => task());
    // Add ONLY the locks property to the real navigator (spreading it would drop its prototype).
    Object.defineProperty(navigator, 'locks', { value: { request }, configurable: true });

    await expect(withRefreshLock(() => Promise.resolve('locked'))).resolves.toBe('locked');
    expect(request).toHaveBeenCalledWith('tms-auth-refresh', expect.any(Function));
  });
});

describe('onOtherTabSessionChange', () => {
  const fire = (init: StorageEventInit) => {
    window.dispatchEvent(new StorageEvent('storage', init));
  };

  it('reports sign-out, sign-in and rotation in other tabs, and ignores other keys', () => {
    const listener = vi.fn();
    const unsubscribe = onOtherTabSessionChange(listener);

    fire({ key: REFRESH_TOKEN_STORAGE_KEY, oldValue: '{"token":"a"}', newValue: null });
    fire({ key: REFRESH_TOKEN_STORAGE_KEY, oldValue: null, newValue: '{"token":"b"}' });
    fire({ key: REFRESH_TOKEN_STORAGE_KEY, oldValue: '{"token":"b"}', newValue: '{"token":"c"}' });
    fire({ key: null }); // localStorage.clear() in another tab
    fire({ key: 'tms.theme', oldValue: 'light', newValue: 'dark' });

    expect(listener.mock.calls).toEqual([
      ['signedOutElsewhere'],
      ['signedInElsewhere'],
      ['rotatedElsewhere'],
      ['signedOutElsewhere'],
    ]);

    unsubscribe();
    fire({ key: REFRESH_TOKEN_STORAGE_KEY, newValue: null });
    expect(listener).toHaveBeenCalledTimes(4);
  });
});
