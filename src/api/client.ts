import axios from 'axios';

import { env } from '@/constants/env';

import { installAuthInterceptors } from './interceptors';

/**
 * The single Axios instance for the ASP.NET Core API (docs/02 §7.1).
 * Feature api modules use it; components never import it.
 */
export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  // The Fetch API instead of XMLHttpRequest: the modern standard, and in the browser CORS works the
  // same either way (the API allows this origin and exposes X-Correlation-ID). It also lets MSW
  // intercept requests in tests; jsdom's XHR applies CORS checks that fake responses can't pass.
  adapter: 'fetch',
  timeout: 15_000,
  headers: { Accept: 'application/json' },
});

installAuthInterceptors(apiClient);
