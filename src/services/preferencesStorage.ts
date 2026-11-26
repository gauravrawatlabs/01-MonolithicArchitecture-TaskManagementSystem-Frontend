/**
 * Device-level UI preferences in localStorage. Keys are prefixed ("tms.") so they never clash with
 * other apps on the same origin. Every read is defensive: storage can be blocked (privacy mode)
 * or contain old/invalid values, and a preference must never crash the app.
 *
 * IMPORTANT: THEME_STORAGE_KEY is duplicated in the inline script in index.html, which must run
 * before any bundle loads. Keep both in sync.
 */
export const THEME_STORAGE_KEY = 'tms.theme';

export type ThemePreference = 'light' | 'dark' | 'system';

const THEME_PREFERENCES: readonly ThemePreference[] = ['light', 'dark', 'system'];

function isThemePreference(value: unknown): value is ThemePreference {
  return THEME_PREFERENCES.includes(value as ThemePreference);
}

export function readThemePreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

export function writeThemePreference(preference: ThemePreference): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Storage unavailable: the choice still applies for this visit.
  }
}

export const SIDEBAR_STORAGE_KEY = 'tms.sidebar';

/** Desktop sidebar: true = collapsed to the icon rail. Defaults to expanded. */
export function readSidebarCollapsed(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'collapsed';
  } catch {
    return false;
  }
}

export function writeSidebarCollapsed(collapsed: boolean): void {
  try {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? 'collapsed' : 'expanded');
  } catch {
    // Storage unavailable: the choice still applies for this visit.
  }
}
