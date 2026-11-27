import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { apiUrl, problem } from '../mocks/api';
import { buildDashboard, buildEmptyDashboard } from '../mocks/factories/dashboard';
import { buildPagedTasks, buildTask } from '../mocks/factories/tasks';
import { buildUser } from '../mocks/factories/users';
import { server } from '../mocks/server';
import { currentUrl, renderRoute } from '../utils/renderRoute';

const member = buildUser({ roles: ['User'] });
const manager = buildUser({ roles: ['Manager'] });
const admin = buildUser({ roles: ['Admin'] });

const day = 86_400_000;
const inDays = (n: number) => new Date(Date.now() + n * day).toISOString();

/** Serves /api/tasks by its query string, like the real API's filters, and records every query. */
function serveTaskLists() {
  const queries: URLSearchParams[] = [];
  server.use(
    http.get(apiUrl('/api/tasks'), ({ request }) => {
      const params = new URL(request.url).searchParams;
      queries.push(params);
      if (params.get('Overdue') === 'true') {
        return HttpResponse.json(
          buildPagedTasks([
            buildTask({
              title: 'Fix login bug',
              isOverdue: true,
              dueDateUtc: inDays(-2),
              priority: 'High',
            }),
          ]),
        );
      }
      if (params.has('DueFrom')) {
        return HttpResponse.json(
          buildPagedTasks([
            buildTask({ title: 'Write API docs', dueDateUtc: inDays(1), priority: 'Critical' }),
            buildTask({ title: 'Already finished', dueDateUtc: inDays(2), status: 'Done' }),
          ]),
        );
      }
      return HttpResponse.json(
        buildPagedTasks([
          buildTask({
            title: 'Design review',
            status: 'InReview',
            updatedAtUtc: new Date().toISOString(),
          }),
        ]),
      );
    }),
  );
  return queries;
}

const card = (title: string) => {
  const heading = screen.getByRole('heading', { name: title });
  const section = heading.closest('section');
  if (!section) throw new Error(`No card for ${title}`);
  return section;
};

describe('Dashboard', () => {
  it('shows the key figures from GET /api/dashboard', async () => {
    serveTaskLists();
    renderRoute('/dashboard', { user: member });

    const figures = await screen.findByRole('region', { name: 'Key figures' });
    expect(within(figures).getByRole('link', { name: /Projects\s*3/ })).toHaveAttribute(
      'href',
      '/projects',
    );
    expect(within(figures).getByText('Total tasks').closest('a')).toHaveTextContent('42');
    expect(within(figures).getByText('Completed').parentElement?.parentElement).toHaveTextContent(
      '15',
    );
    expect(within(figures).getByText('+6 in the last 7 days')).toBeInTheDocument();
    expect(within(figures).getByText('9 due in the next 7 days')).toBeInTheDocument();
    expect(within(figures).getByRole('link', { name: /Assigned to me\s*7/ })).toHaveAttribute(
      'href',
      '/tasks?assignedToMe=true',
    );
    expect(screen.getByText('Figures across the projects you belong to.')).toBeInTheDocument();
  });

  it('tells admins the figures cover all projects', async () => {
    serveTaskLists();
    server.use(
      http.get(apiUrl('/api/dashboard'), () =>
        HttpResponse.json(buildDashboard({ scope: 'AllProjects' })),
      ),
    );
    renderRoute('/dashboard', { user: admin });

    expect(
      await screen.findByText('Figures across all projects (administrator view).'),
    ).toBeInTheDocument();
  });

  it('offers the status breakdown as a table, in workflow order', async () => {
    serveTaskLists();
    const { user } = renderRoute('/dashboard', { user: member });
    await screen.findByRole('heading', { name: 'Tasks by status' });

    await user.click(within(card('Tasks by status')).getByRole('button', { name: 'Table' }));

    const rows = within(screen.getByRole('table', { name: 'Tasks by status' }))
      .getAllByRole('row')
      .slice(1);
    expect(rows.map((row) => row.textContent)).toEqual([
      'To do12',
      'In progress8',
      'In review5',
      'Done15',
      'Cancelled2',
    ]);
  });

  it('lists priorities most urgent first', async () => {
    serveTaskLists();
    const { user } = renderRoute('/dashboard', { user: member });
    await screen.findByRole('heading', { name: 'Tasks by priority' });

    await user.click(within(card('Tasks by priority')).getByRole('button', { name: 'Table' }));

    const rows = within(screen.getByRole('table', { name: 'Tasks by priority' }))
      .getAllByRole('row')
      .slice(1);
    expect(rows.map((row) => row.textContent)).toEqual(['Critical5', 'High11', 'Medium20', 'Low6']);
  });

  it('shows project progress as a meter list with overdue counts', async () => {
    serveTaskLists();
    renderRoute('/dashboard', { user: member });

    const progress = await screen.findByRole('progressbar', {
      name: 'Website Redesign completion',
    });
    expect(progress).toHaveAttribute('aria-valuenow', '40');
    const projects = card('Project progress');
    expect(within(projects).getByRole('link', { name: 'Website Redesign' })).toHaveAttribute(
      'href',
      '/projects/1',
    );
    expect(within(projects).getByText('3 overdue')).toBeInTheDocument();
    expect(within(projects).getByText('8 of 20 done · 12 open')).toBeInTheDocument();
  });

  it('asks the API for the right task lists and shows only open tasks in "Upcoming deadlines"', async () => {
    const queries = serveTaskLists();
    renderRoute('/dashboard', { user: member });

    await screen.findByRole('heading', { name: 'Upcoming deadlines' });
    const upcomingCard = card('Upcoming deadlines');
    expect(
      await within(upcomingCard).findByRole('link', { name: 'Write API docs' }),
    ).toHaveAttribute('href', expect.stringMatching(/^\/tasks\/\d+$/));
    expect(within(upcomingCard).getByText('Due tomorrow')).toBeInTheDocument();
    expect(within(upcomingCard).queryByText('Already finished')).not.toBeInTheDocument(); // Done is filtered out

    const overdueCard = card('My overdue tasks');
    expect(await within(overdueCard).findByText(/Overdue · 2 days ago/)).toBeInTheDocument();
    const recentCard = card('Recently updated');
    expect(await within(recentCard).findByText(/Updated just now/)).toBeInTheDocument();

    const described = queries.map((q) => Object.fromEntries(q.entries()));
    expect(described).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          Overdue: 'false',
          SortBy: 'DueDate',
          SortDirection: 'Asc',
          PageSize: '20',
        }),
        expect.objectContaining({ AssignedToMe: 'true', Overdue: 'true', SortBy: 'DueDate' }),
        expect.objectContaining({ SortBy: 'UpdatedAt', SortDirection: 'Desc', PageSize: '6' }),
      ]),
    );
    const upcomingQuery = described.find((q) => q.DueFrom !== undefined);
    expect(Date.parse(upcomingQuery?.DueTo ?? '') - Date.parse(upcomingQuery?.DueFrom ?? '')).toBe(
      7 * day,
    );
  });

  it('keeps the dashboard usable when one list fails, with a retry for that list', async () => {
    server.use(http.get(apiUrl('/api/tasks'), () => problem(503)));
    renderRoute('/dashboard', { user: member });

    await screen.findByRole('heading', { name: 'Recently updated' });
    const recentCard = card('Recently updated');
    expect(await within(recentCard).findByRole('alert')).toHaveTextContent(
      'Something went wrong on our side',
    );
    expect(within(recentCard).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Key figures' })).toBeInTheDocument();
  });

  it('shows an error with a reference and recovers on retry when the dashboard fails', async () => {
    serveTaskLists();
    let fail = true;
    server.use(
      http.get(apiUrl('/api/dashboard'), () =>
        fail ? problem(500, { correlationId: 'DASH-500' }) : HttpResponse.json(buildDashboard()),
      ),
    );
    const { user } = renderRoute('/dashboard', { user: member });

    expect(await screen.findByText("We couldn't load the dashboard")).toBeInTheDocument();
    expect(screen.getByText('DASH-500')).toBeInTheDocument();

    fail = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('region', { name: 'Key figures' })).toBeInTheDocument();
  });

  it('greets a manager without projects with a way to create one, and loads no task lists', async () => {
    const queries = serveTaskLists();
    server.use(http.get(apiUrl('/api/dashboard'), () => HttpResponse.json(buildEmptyDashboard())));
    const { user, router } = renderRoute('/dashboard', { user: manager });

    expect(await screen.findByRole('heading', { name: 'No projects yet' })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Go to projects' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Projects' })).toBeInTheDocument();
    expect(currentUrl(router)).toBe('/projects');
    expect(queries).toHaveLength(0);
  });

  it('tells a regular user without projects to ask for access (no button they cannot use)', async () => {
    server.use(http.get(apiUrl('/api/dashboard'), () => HttpResponse.json(buildEmptyDashboard())));
    renderRoute('/dashboard', { user: member });

    expect(
      await screen.findByText(/Ask a project owner or manager to add you/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Go to projects' })).not.toBeInTheDocument();
  });

  it('refreshes every widget from the header button', async () => {
    const queries = serveTaskLists();
    let dashboardCalls = 0;
    server.use(
      http.get(apiUrl('/api/dashboard'), () => {
        dashboardCalls += 1;
        return HttpResponse.json(buildDashboard());
      }),
    );
    const { user } = renderRoute('/dashboard', { user: member });
    await screen.findByRole('region', { name: 'Key figures' });
    await waitFor(() => {
      expect(queries).toHaveLength(3);
    });

    await user.click(await screen.findByRole('button', { name: 'Refresh dashboard' }));

    await waitFor(() => {
      expect(dashboardCalls).toBe(2);
      expect(queries).toHaveLength(6);
    });
  });
});
