import { z } from 'zod';

/**
 * Runtime configuration, validated once when the app starts.
 *
 * Why validate? import.meta.env values are plain strings filled in at BUILD time. A missing or
 * mistyped API URL would otherwise surface later as confusing network errors on every page.
 * Validating here turns it into one clear error message at startup.
 */
const envSchema = z.object({
  VITE_API_BASE_URL: z
    .url({ protocol: /^https?$/, error: 'VITE_API_BASE_URL must be an http(s) URL.' })
    .transform((url) => url.replace(/\/+$/, '')), // "http://host/" → "http://host"
  VITE_APP_NAME: z.string().trim().min(1).default('Task Management System'),
});

export interface AppEnv {
  /** API base URL without a trailing slash, e.g. "http://localhost:5075". */
  readonly apiBaseUrl: string;
  /** Display name of the application. */
  readonly appName: string;
}

/** Validates raw environment variables. Exported separately so it can be unit-tested. */
export function parseEnv(raw: Record<string, unknown>): AppEnv {
  const result = envSchema.safeParse(raw);

  if (!result.success) {
    throw new Error(
      `Invalid environment configuration:\n${z.prettifyError(result.error)}\n` +
        'See .env.example for the required variables.',
    );
  }

  return Object.freeze({
    apiBaseUrl: result.data.VITE_API_BASE_URL,
    appName: result.data.VITE_APP_NAME,
  });
}

/** The validated configuration. Import this instead of reading import.meta.env directly. */
export const env: AppEnv = parseEnv(import.meta.env);
