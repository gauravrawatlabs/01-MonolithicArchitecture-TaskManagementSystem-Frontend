import axios, { type AxiosInstance } from 'axios';

import { getAccessToken, getRefreshToken } from '@/services/tokenStorage';

import { toApiError } from './apiError';
import { refreshSession } from './session';

/**
 * Authentication for every API request (docs/01 §14.3):
 *
 *   request  → Authorization: Bearer <access token of this tab>
 *   response → 401 on a normal request while a refresh token exists:
 *                refresh (shared by all concurrent 401s) → retry the request ONCE with the new token
 *              anything else → reject with ApiError (one error shape for the whole app)
 *
 * Never retried: requests marked skipAuthRefresh (login, register, logout…) and retries themselves.
 */
export function installAuthInterceptors(client: AxiosInstance): void {
  client.interceptors.request.use((config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
      const config = axios.isAxiosError(error) ? error.config : undefined;
      const isRetryable401 =
        axios.isAxiosError(error) &&
        error.response?.status === 401 &&
        config !== undefined &&
        !config.skipAuthRefresh &&
        !config._retry &&
        getRefreshToken() !== null;

      if (!isRetryable401) {
        return Promise.reject(toApiError(error));
      }

      config._retry = true;
      try {
        await refreshSession();
      } catch {
        // The session couldn't be renewed (expired → listeners already notified, or network).
        return Promise.reject(toApiError(error));
      }
      return client.request(config); // the request interceptor adds the NEW access token
    },
  );
}
