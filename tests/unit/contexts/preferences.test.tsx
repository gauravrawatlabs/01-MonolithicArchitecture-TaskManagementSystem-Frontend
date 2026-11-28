import { act, renderHook } from '@testing-library/react';
import { type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { PreferencesProvider, usePreferences } from '@/contexts/preferences';
import { DEVICE_PREFERENCES_KEY } from '@/services/devicePreferences';

const wrapper = ({ children }: { children: ReactNode }) => (
  <PreferencesProvider>{children}</PreferencesProvider>
);

describe('PreferencesProvider', () => {
  it('saves a change and applies "reduce motion" to the whole page', () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });

    act(() => {
      result.current.setPreference('motion', 'reduce');
    });
    expect(document.documentElement).toHaveClass('reduce-motion');
    expect(window.localStorage.getItem(DEVICE_PREFERENCES_KEY)).toContain('"motion":"reduce"');

    act(() => {
      result.current.resetPreferences();
    });
    expect(document.documentElement).not.toHaveClass('reduce-motion');
    expect(result.current.preferences.motion).toBe('system');
  });

  it('follows changes made in another tab', () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });
    const newValue = JSON.stringify({ pageSize: 50, toastDuration: 'short', motion: 'system' });

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: DEVICE_PREFERENCES_KEY, newValue }));
    });
    expect(result.current.preferences).toEqual({
      pageSize: 50,
      toastDuration: 'short',
      motion: 'system',
    });
  });

  it('falls back to the defaults outside the provider', () => {
    const { result } = renderHook(() => usePreferences());
    expect(result.current.preferences.pageSize).toBe(20);
  });
});
