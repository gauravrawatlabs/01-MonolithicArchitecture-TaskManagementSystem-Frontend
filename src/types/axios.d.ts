import 'axios';

/** Our own per-request options, read by the auth interceptor (src/api/interceptors.ts). */
declare module 'axios' {
  export interface AxiosRequestConfig {
    /** Don't try a token refresh when this request gets 401 (login, register, logout…). */
    skipAuthRefresh?: boolean;
    /** Set after one refresh+retry, so a request is never retried twice. */
    _retry?: boolean;
  }
}
