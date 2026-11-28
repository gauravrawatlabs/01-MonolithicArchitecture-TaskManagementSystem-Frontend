/**
 * Runtime configuration, validated once when the app starts.
 *
 * Why validate? import.meta.env values are plain strings filled in at BUILD time. A missing or
 * mistyped API URL would otherwise surface later as confusing network errors on every page.
 * Validating here turns it into one clear error message at startup.
 *
 * Plain checks instead of Zod ON PURPOSE (Phase 16): this module runs on every page load, and importing
 * Zod here put ~83 KB (minified) of it into the entry bundle. Forms still use Zod, in their lazy pages.
 */
export interface AppEnv {
  /** API base URL without a trailing slash, e.g. "http://localhost:5075". */
  readonly apiBaseUrl: string;
  /** Display name of the application. */
  readonly appName: string;
}

const DEFAULT_APP_NAME = 'Task Management System';

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value === '') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Validates raw environment variables. Exported separately so it can be unit-tested. */
export function parseEnv(raw: Record<string, unknown>): AppEnv {
  const apiBaseUrl = raw.VITE_API_BASE_URL;
  if (!isHttpUrl(apiBaseUrl)) {
    throw new Error(
      'Invalid environment configuration:\n' +
        '✖ VITE_API_BASE_URL must be an http(s) URL.\n' +
        'See .env.example for the required variables.',
    );
  }
  const appName = typeof raw.VITE_APP_NAME === 'string' ? raw.VITE_APP_NAME.trim() : '';

  return Object.freeze({
    apiBaseUrl: apiBaseUrl.replace(/\/+$/, ''), // "http://host/" → "http://host"
    appName: appName || DEFAULT_APP_NAME,
  });
}

/** Optional runtime configuration from /config.js (see public/config.js). */
export interface RuntimeConfig {
  apiBaseUrl?: string;
  appName?: string;
}

declare global {
  interface Window {
    __APP_CONFIG__?: RuntimeConfig;
  }
}

/**
 * Build-time variables, overridden by non-empty runtime values. This is what lets ONE build (e.g. a Docker
 * image) be configured per environment at start-up instead of being rebuilt.
 */
export function withRuntimeConfig(
  buildTime: Record<string, unknown>,
  runtime: RuntimeConfig | undefined,
): Record<string, unknown> {
  return {
    ...buildTime,
    ...(runtime?.apiBaseUrl ? { VITE_API_BASE_URL: runtime.apiBaseUrl } : {}),
    ...(runtime?.appName ? { VITE_APP_NAME: runtime.appName } : {}),
  };
}

/** The validated configuration. Import this instead of reading import.meta.env directly. */
export const env: AppEnv = parseEnv(
  withRuntimeConfig(
    import.meta.env,
    typeof window === 'undefined' ? undefined : window.__APP_CONFIG__,
  ),
);
