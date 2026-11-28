import { createContext } from 'react';

import { type DevicePreferences } from '@/services/devicePreferences';

export interface PreferencesContextValue {
  preferences: DevicePreferences;
  setPreference: <K extends keyof DevicePreferences>(key: K, value: DevicePreferences[K]) => void;
  resetPreferences: () => void;
}

export const PreferencesContext = createContext<PreferencesContextValue | null>(null);
