import '@testing-library/jest-dom/vitest';
import './browserMocks';

import { cleanup, configure } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';

import { clearSession } from '@/services/tokenStorage';

import { server } from '../mocks/server';
import { resetMatchMedia } from '../utils/matchMedia';

// findBy*/waitFor wait up to 10 s (default 1 s): lazy pages load real code, and with many test files the
// workers compete for CPU at startup. Assertions still finish as soon as they pass.
configure({ asyncUtilTimeout: 10_000 });

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
