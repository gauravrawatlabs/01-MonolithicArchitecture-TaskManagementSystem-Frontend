import { use } from 'react';

import { DEFAULT_PREFERENCES } from '@/services/devicePreferences';

import { PreferencesContext, type PreferencesContextValue } from './preferencesContext';

const FALLBACK: PreferencesContextValue = {
  preferences: DEFAULT_PREFERENCES,
  setPreference: () => undefined,
  resetPreferences: () => undefined,
};

/** Device preferences. Outside the provider (isolated component tests) the defaults apply. */
export function usePreferences(): PreferencesContextValue {
  return use(PreferencesContext) ?? FALLBACK;
}
