import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import {
  DEFAULT_PREFERENCES,
  DEVICE_PREFERENCES_KEY,
  type DevicePreferences,
  parsePreferences,
  readPreferences,
  writePreferences,
} from '@/services/devicePreferences';

import { PreferencesContext, type PreferencesContextValue } from './preferencesContext';

/**
 * Holds the device preferences, saves every change, follows changes made in OTHER tabs (storage event), and
 * applies "reduce motion" as a class on <html> (styles/index.css turns animations off for it).
 */
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<DevicePreferences>(readPreferences);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === DEVICE_PREFERENCES_KEY || event.key === null)
        setPreferences(parsePreferences(event.newValue));
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', preferences.motion === 'reduce');
  }, [preferences.motion]);

  const setPreference = useCallback<PreferencesContextValue['setPreference']>((key, value) => {
    setPreferences((current) => {
      const next = { ...current, [key]: value };
      writePreferences(next);
      return next;
    });
  }, []);
  const resetPreferences = useCallback(() => {
    writePreferences(DEFAULT_PREFERENCES);
    setPreferences(DEFAULT_PREFERENCES);
  }, []);

  const value = useMemo(
    () => ({ preferences, setPreference, resetPreferences }),
    [preferences, setPreference, resetPreferences],
  );
  return <PreferencesContext value={value}>{children}</PreferencesContext>;
}
