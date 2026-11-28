import { screen, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { setSession } from '@/services/tokenStorage';

import { apiUrl, problem } from '../mocks/api';
import { captureRequests } from '../mocks/capture';
import { buildAuthResponse } from '../mocks/factories/auth';
import { buildProjectDetails } from '../mocks/factories/projects';
import { buildPagedTasks, buildTask } from '../mocks/factories/tasks';
import { buildUser } from '../mocks/factories/users';
import { serveProjects } from '../mocks/fakeProjectsApi';
import { server } from '../mocks/server';
import { renderRoute } from '../utils/renderRoute';

/**
 * Cross-cutting behaviour (Phase 1 §17 test plan): what every page relies on, tested through real pages.
 */
const jane = buildUser({ firstName: 'Jane', lastName: 'Doe', roles: ['Manager'] });

describe('Resilience across pages', () => {
  it('six parallel requests hit an expired token → exactly ONE refresh, each retried once, page loads', async () => {
    // The project loads first; then the overview asks for 6 task counts AT ONCE (one per status + overdue),
    // and the access token has expired in between: all six get 401 together.
    setSession(buildAuthResponse(jane, { accessToken: 'EXPIRED', refreshToken: 'CURRENT' }));
    serveProjects([buildProjectDetails({ id: 7, name: 'Website', ownerId: jane.id })], {
      currentUser: jane,
    });
    const seen: string[] = [];
    server.use(
      http.get(apiUrl('/api/tasks'), ({ request }) => {
        const auth = request.headers.get('Authorization') ?? '';
        seen.push(auth);
        return auth === 'Bearer FRESH'
          ? HttpResponse.json(buildPagedTasks([], 1, 1, 2))
          : problem(401);
      }),
    );
    const refreshes = captureRequests('post', '/api/auth/refresh', () =>
      HttpResponse.json(buildAuthResponse(jane, { accessToken: 'FRESH', refreshToken: 'ROTATED' })),
    );
    renderRoute('/projects/7', { user: jane });

    expect(await screen.findByRole('table', { name: 'Tasks by status' })).toBeInTheDocument();
    expect(refreshes).toHaveLength(1);
    expect(seen.filter((a) => a === 'Bearer EXPIRED')).toHaveLength(6);
    expect(seen.filter((a) => a === 'Bearer FRESH')).toHaveLength(6);
  });

  it('a network failure explains itself and recovers on retry', async () => {
    let offline = true;
    server.use(
      http.get(apiUrl('/api/tasks'), () =>
        offline
          ? HttpResponse.error()
          : HttpResponse.json(buildPagedTasks([buildTask({ title: 'Back online' })])),
      ),
    );
    const { user } = renderRoute('/tasks', { user: jane });

    expect(await screen.findByText("We couldn't load the tasks")).toBeInTheDocument();
    expect(screen.getByText(/reach the server/)).toBeInTheDocument();
    offline = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('link', { name: 'Back online' })).toBeInTheDocument();
  });

  it('a slow response shows a loading state, then the data (no error flash)', async () => {
    server.use(
      http.get(apiUrl('/api/tasks'), async () => {
        await delay(400);
        return HttpResponse.json(buildPagedTasks([buildTask({ title: 'Worth the wait' })]));
      }),
    );
    renderRoute('/tasks', { user: jane });

    const table = await screen.findByRole('table', { name: 'Tasks' });
    expect(table).toHaveAttribute('aria-busy', 'true');
    expect(await screen.findByRole('link', { name: 'Worth the wait' })).toBeInTheDocument();
    await waitFor(() => {
      expect(table).not.toHaveAttribute('aria-busy');
    });
    expect(screen.queryByText("We couldn't load the tasks")).not.toBeInTheDocument();
  });
});
