import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env.CI);
const baseURL = 'http://localhost:3000';

/**
 * End-to-end tests run in a real browser against the running app (and, from Phase 7 on,
 * the real ASP.NET Core API). Three projects cover the responsive breakpoints from Phase 1 §12;
 * the "backend" project runs complete flows against the real API.
 * Only Chromium is installed locally (npm run test:e2e:install); tablet uses Chromium too.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  // Each worker is a Chromium instance; accessibility scans (axe) are CPU-heavy. Playwright's default
  // (half the logical cores = 11 here) oversubscribed a developer machine that is also running an IDE and
  // the API, and long tests timed out. 6 workers finished FASTER and without timeouts.
  workers: isCI ? undefined : 6,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    // UI tests: no backend needed (API calls are faked with page.route where required).
    { name: 'desktop', testIgnore: '**/*.backend.spec.ts', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'tablet',
      testIgnore: '**/*.backend.spec.ts',
      use: { ...devices['iPad Mini'], browserName: 'chromium' },
    },
    { name: 'mobile', testIgnore: '**/*.backend.spec.ts', use: { ...devices['Pixel 7'] } },
    // Full flows against the REAL ASP.NET Core API (must be running): npm run test:e2e:backend
    // A real backend (debug build, real database, exceptions for 401/400) answers far slower than a
    // fake, so assertions there may wait up to 15 s instead of the default 5 s.
    {
      name: 'backend',
      testMatch: '**/*.backend.spec.ts',
      expect: { timeout: 15_000 },
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // A BUNDLED build (a few files per page) instead of the dev server (hundreds of modules per page): with
  // ~11 parallel browsers, one dev server became the bottleneck and tests timed out on a busy machine.
  // NODE_ENV=development keeps dev-only routes (design system) and React's development checks.
  // Locally, an already running server on :3000 (e.g. `npm run dev`) is reused.
  webServer: {
    command: 'npm run e2e:serve',
    env: { NODE_ENV: 'development' },
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
