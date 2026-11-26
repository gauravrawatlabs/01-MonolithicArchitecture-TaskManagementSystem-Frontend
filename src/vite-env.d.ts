/// <reference types="vite/client" />

/**
 * Typed environment variables. Only VITE_-prefixed variables reach the browser bundle,
 * and they are PUBLIC: never put secrets here. Values are validated at startup in
 * src/constants/env.ts, so code should import `env` from there instead of reading import.meta.env.
 */
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_APP_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
