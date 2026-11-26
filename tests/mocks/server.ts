import { setupServer } from 'msw/node';

import { handlers } from './handlers';

/**
 * MSW server for Vitest. It intercepts HTTP requests at the network level (Node's fetch/http),
 * so the REAL Axios client and interceptors run in tests — only the backend is replaced.
 */
export const server = setupServer(...handlers);
