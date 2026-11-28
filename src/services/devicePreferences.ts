/**
 * Device preferences (Phase 1 gap G4): stored in THIS browser only (localStorage), never sent to the API.
 * Validated field by field on read: an old, partial or tampered value falls back to the default for that
 * field instead of breaking the app.
 */
export const DEVICE_PREFERENCES_KEY = 'tms.preferences';

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
export type ToastDuration = 'short' | 'normal' | 'long';
export type MotionPreference = 'system' | 'reduce';

export interface DevicePreferences {
  /** Rows per page in task and user tables (the URL still wins when it has ?size=). */
  pageSize: (typeof PAGE_SIZE_OPTIONS)[number];
  /** How long notifications stay before closing by themselves. */
  toastDuration: ToastDuration;
  /** Follow the operating system's setting, or always reduce motion in this app. */
  motion: MotionPreference;
}

export const DEFAULT_PREFERENCES: DevicePreferences = {
  pageSize: 20,
  toastDuration: 'normal',
  motion: 'system',
};

/**
 * Field validators. Plain checks, not Zod: this module loads at startup (PreferencesProvider), and Zod would add
 * ~83 KB to the entry bundle (Phase 16).
 */
const fields: {
  [K in keyof DevicePreferences]: (value: unknown) => value is DevicePreferences[K];
} = {
  pageSize: (v): v is DevicePreferences['pageSize'] =>
    (PAGE_SIZE_OPTIONS as readonly unknown[]).includes(v),
  toastDuration: (v): v is ToastDuration => v === 'short' || v === 'normal' || v === 'long',
  motion: (v): v is MotionPreference => v === 'system' || v === 'reduce',
};

/** Parses a stored value; every invalid or missing field gets its default. */
export function parsePreferences(raw: string | null): DevicePreferences {
  let data: Record<string, unknown> = {};
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (parsed && typeof parsed === 'object') data = parsed as Record<string, unknown>;
  } catch {
    // corrupt JSON: defaults
  }
  const pick = <K extends keyof DevicePreferences>(key: K): DevicePreferences[K] => {
    const value = data[key];
    return fields[key](value) ? value : DEFAULT_PREFERENCES[key];
  };
  return {
    pageSize: pick('pageSize'),
    toastDuration: pick('toastDuration'),
    motion: pick('motion'),
  };
}

export function readPreferences(): DevicePreferences {
  try {
    return parsePreferences(window.localStorage.getItem(DEVICE_PREFERENCES_KEY));
  } catch {
    return DEFAULT_PREFERENCES; // storage blocked (privacy mode)
  }
}

export function writePreferences(preferences: DevicePreferences): void {
  try {
    window.localStorage.setItem(DEVICE_PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    // storage blocked: the choice still applies until the tab closes
  }
}

/** Toast duration multipliers (errors stay longest in every setting). */
export const TOAST_DURATION_FACTOR: Record<ToastDuration, number> = {
  short: 0.6,
  normal: 1,
  long: 2,
};
