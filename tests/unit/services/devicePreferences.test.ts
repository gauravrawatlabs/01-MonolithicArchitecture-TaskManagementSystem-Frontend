import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PREFERENCES,
  DEVICE_PREFERENCES_KEY,
  parsePreferences,
  readPreferences,
  writePreferences,
} from '@/services/devicePreferences';

describe('device preferences (stored in this browser)', () => {
  it('uses the defaults when nothing or garbage is stored', () => {
    expect(parsePreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences('{not json')).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences('"a string"')).toEqual(DEFAULT_PREFERENCES);
  });

  it('keeps valid fields and replaces only the invalid ones (old or tampered values never break the app)', () => {
    expect(
      parsePreferences(
        JSON.stringify({ pageSize: 50, toastDuration: 'forever', motion: 'reduce' }),
      ),
    ).toEqual({
      pageSize: 50,
      toastDuration: 'normal',
      motion: 'reduce',
    });
    expect(parsePreferences(JSON.stringify({ pageSize: 7 })).pageSize).toBe(20); // not an option
  });

  it('round-trips through localStorage under its own key', () => {
    writePreferences({ pageSize: 100, toastDuration: 'long', motion: 'system' });
    expect(JSON.parse(window.localStorage.getItem(DEVICE_PREFERENCES_KEY) ?? '')).toEqual({
      pageSize: 100,
      toastDuration: 'long',
      motion: 'system',
    });
    expect(readPreferences()).toEqual({ pageSize: 100, toastDuration: 'long', motion: 'system' });
  });
});
