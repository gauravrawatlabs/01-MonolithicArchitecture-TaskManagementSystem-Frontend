import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  readThemePreference,
  THEME_STORAGE_KEY,
  writeThemePreference,
} from '@/services/preferencesStorage';

describe('theme preference storage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to "system" when nothing is stored', () => {
    expect(readThemePreference()).toBe('system');
  });

  it('round-trips a valid preference under the shared key used by index.html', () => {
    writeThemePreference('dark');

    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(THEME_STORAGE_KEY).toBe('tms.theme');
    expect(readThemePreference()).toBe('dark');
  });

  it('ignores invalid stored values instead of crashing', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'purple');

    expect(readThemePreference()).toBe('system');
  });

  it('falls back safely when storage is blocked (e.g. privacy mode)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    expect(readThemePreference()).toBe('system');
    expect(() => {
      writeThemePreference('dark');
    }).not.toThrow();
  });
});
