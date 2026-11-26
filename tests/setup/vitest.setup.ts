import '@testing-library/jest-dom/vitest';
import './browserMocks';

import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';

import { clearSession } from '@/services/tokenStorage';

import { server } from '../mocks/server';
import { resetMatchMedia } from '../utils/matchMedia';

// MSW 3 renamed onUnhandledRequest → onUnhandledFrame (it also covers WebSocket/SSE frames).
// 'error': any request without a handler fails the test, so no test can silently hit a real API.
beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});

afterEach(() => {
  cleanup(); // unmount rendered components between tests
  server.resetHandlers(); // drop per-test overrides added with server.use(...)
  window.localStorage.clear();
  clearSession(); // tokens live in module memory: never leak a session into the next test
  document.documentElement.className = '';
  resetMatchMedia();
});

afterAll(() => {
  server.close();
});
