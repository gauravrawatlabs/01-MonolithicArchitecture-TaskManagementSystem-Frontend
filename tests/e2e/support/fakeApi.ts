import { expect, type Page } from '@playwright/test';

const API = 'http://localhost:5075';
const CORS = {
  'Access-Control-Allow-Origin': 'http://localhost:3000',
  'Access-Control-Expose-Headers': 'X-Correlation-ID',
};

/**
 * Fakes one API endpoint in the real browser (UI tests that run without the backend).
 * The browser applies CORS to fulfilled responses exactly as to the real API, so the
 * preflight (OPTIONS) and the Access-Control headers are part of the fake.
 */
export async function fakeApi(
  page: Page,
  path: string,
  status: number,
  body?: unknown,
): Promise<void> {
  // Match on the PATH only, so query strings (?SortBy=…&PageSize=…) don't matter.
  await page.route(
    (url) => url.origin === API && url.pathname === path,
    async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({
          status: 204,
          headers: {
            ...CORS,
            'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        });
        return;
      }
      await route.fulfill({
        status,
        contentType: 'application/json',
        headers: CORS,
        body: body === undefined ? '' : JSON.stringify(body),
      });
    },
  );
}

export interface FakeRequest {
  method: string;
  path: string;
  /** Query string parameters (e.g. Status, ProjectId). */
  query: URLSearchParams;
  body: unknown;
}

/**
 * A fake endpoint with custom logic (e.g. a stateful CRUD store). `respond` gets the request and returns
 * [status, body]. Paths may end with "/*" to match one more segment (e.g. /api/categories/*).
 */
export async function fakeApiHandler(
  page: Page,
  path: string,
  respond: (request: FakeRequest) => [number, unknown?],
): Promise<void> {
  const matches = (pathname: string) =>
    path.endsWith('/*')
      ? pathname.startsWith(path.slice(0, -1)) && pathname.length > path.length - 1
      : pathname === path;
  await page.route(
    (url) => url.origin === API && matches(url.pathname),
    async (route) => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        await route.fulfill({
          status: 204,
          headers: {
            ...CORS,
            'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        });
        return;
      }
      const raw = request.postData();
      const [status, body] = respond({
        method: request.method(),
        path: new URL(request.url()).pathname,
        query: new URL(request.url()).searchParams,
        body: raw ? (JSON.parse(raw) as unknown) : undefined,
      });
      await route.fulfill({
        status,
        contentType: 'application/json',
        headers: CORS,
        body: body === undefined ? '' : JSON.stringify(body),
      });
    },
  );
}

/** Every fake user has this id (tests sign in as one user at a time). */
export const FAKE_USER_ID = '00000000-0000-4000-8000-0000000000e2';

export interface FakeUser {
  firstName: string;
  lastName: string;
  roles: string[];
  emailConfirmed?: boolean;
}

/** A backend AuthResponse for the fake user (shape of the real DTO). */
export function fakeAuthResponse({ firstName, lastName, roles, emailConfirmed = true }: FakeUser) {
  return {
    accessToken: 'e2e-access-token',
    tokenType: 'Bearer',
    accessTokenExpiresAtUtc: new Date(Date.now() + 15 * 60_000).toISOString(),
    refreshToken: 'e2e-refresh-token',
    refreshTokenExpiresAtUtc: new Date(Date.now() + 7 * 24 * 3_600_000).toISOString(),
    user: {
      id: FAKE_USER_ID,
      email: `${firstName.toLowerCase()}@example.test`,
      firstName,
      lastName,
      jobTitle: null,
      emailConfirmed,
      isActive: true,
      roles,
      createdAtUtc: '2026-11-01T09:00:00Z',
      lastLoginAtUtc: null,
    },
  };
}

export const FAKE_USERS = {
  admin: { firstName: 'Ada', lastName: 'Admin', roles: ['Admin'] },
  manager: { firstName: 'Max', lastName: 'Manager', roles: ['Manager'] },
  user: { firstName: 'Uma', lastName: 'User', roles: ['User'] },
  unverified: { firstName: 'Nina', lastName: 'Newcomer', roles: ['User'], emailConfirmed: false },
} satisfies Record<string, FakeUser>;

/**
 * Signs in through the REAL login form against a faked auth API (login, refresh, logout), then
 * waits for the signed-in shell. Opens `path` first, so the guard's redirect + returnUrl are exercised.
 */
export async function signInWithFakeApi(
  page: Page,
  fakeUser: FakeUser,
  path = '/dashboard',
): Promise<void> {
  const auth = fakeAuthResponse(fakeUser);
  await fakeApi(page, '/api/auth/login', 200, auth);
  await fakeApi(page, '/api/auth/refresh', 200, auth);
  await fakeApi(page, '/api/auth/logout', 204);

  await page.goto(path);
  await page.getByLabel('Email').fill(auth.user.email);
  await page.getByLabel('Password', { exact: true }).fill('Fake!Passw0rd');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('button', { name: /Account menu for/ })).toBeVisible();
}

/**
 * Default workspace data for UI tests that land on the dashboard but don't test it: an empty dashboard
 * and no tasks. Register it FIRST (e.g. in beforeEach): Playwright gives routes registered LATER
 * priority, so a test's own fakes still override it. Without it, such tests would depend on whether a
 * real backend happens to be running.
 */
export async function fakeEmptyWorkspace(page: Page): Promise<void> {
  await fakeApi(page, '/api/dashboard', 200, {
    generatedAtUtc: new Date().toISOString(),
    scope: 'MyProjects',
    projectCount: 0,
    tasks: { total: 0, open: 0, overdue: 0, dueInNext7Days: 0, completedInLast7Days: 0 },
    myWork: { assignedOpen: 0, assignedOverdue: 0, assignedDueInNext7Days: 0 },
    tasksByStatus: { Todo: 0, InProgress: 0, InReview: 0, Done: 0, Cancelled: 0 },
    tasksByPriority: { Low: 0, Medium: 0, High: 0, Critical: 0 },
    projects: [],
  });
  await fakeApi(page, '/api/tasks', 200, {
    items: [],
    page: 1,
    pageSize: 20,
    totalCount: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  });
  await fakeApi(page, '/api/categories', 200, []);
  await fakeApi(page, '/api/projects', 200, {
    items: [],
    page: 1,
    pageSize: 12,
    totalCount: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  });
  // Any project id opens "Website Redesign", owned by someone else (so navigation tests can visit tabs).
  await fakeApiHandler(page, '/api/projects/*', ({ path }) => [
    200,
    {
      id: Number(path.split('/')[3]),
      name: 'Website Redesign',
      description: null,
      startDate: null,
      endDate: null,
      ownerId: '00000000-0000-4000-8000-0000000000aa',
      ownerName: 'Olivia Owner',
      members: [
        {
          userId: '00000000-0000-4000-8000-0000000000aa',
          fullName: 'Olivia Owner',
          email: 'olivia@example.test',
          memberRole: 'Owner',
          joinedAtUtc: '2026-11-01T09:00:00Z',
        },
      ],
      createdAtUtc: '2026-11-01T09:00:00Z',
      updatedAtUtc: null,
    },
  ]);
}
