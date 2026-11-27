import { screen, waitFor, within } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { apiUrl, problem } from '../mocks/api';
import { buildLookupUser, buildMember, buildProjectDetails } from '../mocks/factories/projects';
import { buildPagedTasks, buildTask } from '../mocks/factories/tasks';
import { buildUser } from '../mocks/factories/users';
import { serveProjects } from '../mocks/fakeProjectsApi';
import { server } from '../mocks/server';
import { currentUrl, renderRoute } from '../utils/renderRoute';

const manager = buildUser({ firstName: 'Maya', lastName: 'Manager', roles: ['Manager'] });
const unverifiedManager = buildUser({ roles: ['Manager'], emailConfirmed: false });
const regular = buildUser({ firstName: 'Rui', lastName: 'Regular', roles: ['User'] });

const website = buildProjectDetails({
  name: 'Website Redesign',
  description: 'New marketing site',
  ownerId: manager.id,
  ownerName: 'Maya Manager',
  createdAtUtc: '2026-11-10T09:00:00Z',
  startDate: '2026-11-01',
  endDate: '2027-01-31',
});
const mobile = buildProjectDetails({ name: 'Mobile App', createdAtUtc: '2026-11-20T09:00:00Z' });
const api = buildProjectDetails({ name: 'API Platform', createdAtUtc: '2026-11-01T09:00:00Z' });

const cardTitles = () =>
  within(screen.getByRole('list', { name: 'Projects' }))
    .getAllByRole('heading', { level: 2 })
    .map((heading) => heading.textContent);

describe('Projects list', () => {
  it('shows projects newest first, as cards, with the backend default sort', async () => {
    const { listQueries } = serveProjects([website, mobile, api], { currentUser: manager });
    renderRoute('/projects', { user: manager });

    await screen.findByRole('link', { name: 'Mobile App' });
    expect(cardTitles()).toEqual(['Mobile App', 'Website Redesign', 'API Platform']);
    expect(Object.fromEntries(listQueries[0] ?? [])).toEqual({
      SortBy: 'CreatedAt',
      SortDirection: 'Desc',
      Page: '1',
      PageSize: '12',
    });
    // Owner badge only on my own project
    const mine = screen.getByRole('article', { name: 'Website Redesign' });
    expect(within(mine).getByText('Owner')).toBeInTheDocument();
    expect(
      within(mine).getByRole('progressbar', { name: 'Website Redesign progress' }),
    ).toBeInTheDocument();
  });

  it('searches on the server after typing pauses, and keeps every choice in the URL', async () => {
    const { listQueries } = serveProjects([website, mobile, api], { currentUser: manager });
    const { user, router } = renderRoute('/projects', { user: manager });
    await screen.findByRole('link', { name: 'Mobile App' });

    await user.type(screen.getByRole('searchbox', { name: 'Search projects' }), 'web');
    await waitFor(() => {
      expect(cardTitles()).toEqual(['Website Redesign']);
    });
    // One request for the whole word, not one per keystroke
    expect(listQueries.map((q) => q.get('Search'))).toEqual([null, 'web']);
    expect(currentUrl(router)).toBe('/projects?search=web');

    await user.click(screen.getByRole('switch', { name: 'Only projects I own' }));
    await waitFor(() => {
      expect(listQueries.at(-1)?.get('OwnedByMe')).toBe('true');
    });
    expect(currentUrl(router)).toBe('/projects?search=web&mine=true');
  });

  it('sorts and pages on the server', async () => {
    const many = Array.from({ length: 14 }, (_, i) =>
      buildProjectDetails({ name: `P${String(i + 1).padStart(2, '0')}` }),
    );
    const { listQueries } = serveProjects(many, { currentUser: manager });
    const { user, router } = renderRoute('/projects', { user: manager });
    await screen.findByText('Showing 1–12 of 14 projects');

    await user.selectOptions(screen.getByLabelText('Sort by'), 'Name:Asc');
    await waitFor(() => {
      expect(cardTitles()[0]).toBe('P01');
    });
    await user.click(screen.getByRole('button', { name: 'Page 2' }));

    await waitFor(() => {
      expect(cardTitles()).toEqual(['P13', 'P14']);
    });
    expect(Object.fromEntries(listQueries.at(-1) ?? [])).toMatchObject({
      SortBy: 'Name',
      SortDirection: 'Asc',
      Page: '2',
    });
    expect(currentUrl(router)).toBe('/projects?sort=Name&page=2');
  });

  it('switches to a table view (remembered in the URL)', async () => {
    serveProjects([website], { currentUser: manager });
    const { user, router } = renderRoute('/projects', { user: manager });
    await screen.findByRole('link', { name: 'Website Redesign' });

    await user.click(screen.getByRole('button', { name: 'Table' }));

    const table = screen.getByRole('table', { name: 'Projects' });
    expect(within(table).getByRole('link', { name: 'Website Redesign' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Table' })).toHaveAttribute('aria-pressed', 'true');
    expect(currentUrl(router)).toBe('/projects?view=table');
  });

  it('shows management actions only on projects the user may manage', async () => {
    serveProjects([website, mobile], { currentUser: manager });
    renderRoute('/projects', { user: manager });
    await screen.findByRole('link', { name: 'Mobile App' });

    expect(
      screen.getByRole('button', { name: 'Actions for Website Redesign' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Actions for Mobile App' }),
    ).not.toBeInTheDocument();
  });

  it('regular users cannot create projects and are told how projects reach them', async () => {
    serveProjects([], { currentUser: regular });
    renderRoute('/projects', { user: regular });

    expect(await screen.findByRole('heading', { name: 'No projects yet' })).toBeInTheDocument();
    expect(
      screen.getByText('When a manager adds you to a project, it will appear here.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New project' })).not.toBeInTheDocument();
  });

  it('tells an unverified manager why "New project" is disabled', async () => {
    serveProjects([], { currentUser: unverifiedManager });
    renderRoute('/projects', { user: unverifiedManager });

    expect(
      await screen.findByText('Verify your email address to create projects.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New project' })).toBeDisabled();
  });

  it('shows an error with a retry when the list cannot be loaded', async () => {
    let fail = true;
    serveProjects([website], { currentUser: manager });
    server.use(
      http.get(apiUrl('/api/projects'), () =>
        fail
          ? problem(500)
          : HttpResponse.json({
              items: [],
              page: 1,
              pageSize: 12,
              totalCount: 0,
              totalPages: 0,
              hasPreviousPage: false,
              hasNextPage: false,
            }),
      ),
    );
    const { user } = renderRoute('/projects', { user: manager });

    expect(await screen.findByText("We couldn't load the projects")).toBeInTheDocument();
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'No projects yet' })).toBeInTheDocument();
  });
});

describe('Creating and editing projects', () => {
  it('creates a project, validates dates first, and opens the new project', async () => {
    const { requests } = serveProjects([], { currentUser: manager });
    const { user, router } = renderRoute('/projects', { user: manager });

    // The page header and the empty state both offer "New project"; the first is the header's.
    const [newProject] = await screen.findAllByRole('button', { name: 'New project' });
    if (!newProject) throw new Error('No "New project" button');
    await user.click(newProject);
    const dialog = await screen.findByRole('dialog', { name: 'New project' });
    expect(within(dialog).getByLabelText('Name')).toHaveFocus();

    await user.type(within(dialog).getByLabelText('Name'), '  Launch  ');
    await user.type(within(dialog).getByLabelText('Start date'), '2026-12-10');
    await user.type(within(dialog).getByLabelText('End date'), '2026-12-01');
    await user.click(within(dialog).getByRole('button', { name: 'Create project' }));
    expect(
      await within(dialog).findByText('End date must be on or after the start date.'),
    ).toBeInTheDocument();
    expect(requests).toHaveLength(0);

    await user.clear(within(dialog).getByLabelText('End date'));
    await user.type(within(dialog).getByLabelText('End date'), '2026-12-31');
    await user.click(within(dialog).getByRole('button', { name: 'Create project' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Launch' })).toBeInTheDocument();
    expect(requests[0]?.body).toEqual({
      name: 'Launch',
      description: null,
      startDate: '2026-12-10',
      endDate: '2026-12-31',
    });
    expect(currentUrl(router)).toMatch(/^\/projects\/\d+$/);
  });

  it('shows a duplicate name (409, per owner) under the name field', async () => {
    serveProjects([website], { currentUser: manager });
    const { user } = renderRoute('/projects', { user: manager });

    await user.click(await screen.findByRole('button', { name: 'New project' }));
    const dialog = await screen.findByRole('dialog', { name: 'New project' });
    await user.type(within(dialog).getByLabelText('Name'), 'website redesign');
    await user.click(within(dialog).getByRole('button', { name: 'Create project' }));

    expect(
      await within(dialog).findByText("The owner already has a project named 'website redesign'."),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
  });

  it('edits a project from its page; the header and breadcrumb follow the new name', async () => {
    const { requests } = serveProjects([website], { currentUser: manager });
    const { user } = renderRoute(`/projects/${website.id}`, { user: manager });

    await user.click(await screen.findByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit project' });
    expect(within(dialog).getByLabelText('Start date')).toHaveValue('2026-11-01');
    await user.clear(within(dialog).getByLabelText('Name'));
    await user.type(within(dialog).getByLabelText('Name'), 'Website 2.0');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Website 2.0' }),
    ).toBeInTheDocument();
    expect(requests[0]).toMatchObject({
      method: 'PUT',
      body: { name: 'Website 2.0', endDate: '2027-01-31' },
    });
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    // The current page's crumb is text (aria-current), not a link
    expect(within(breadcrumb).getByText('Website 2.0')).toHaveAttribute('aria-current', 'page');
    await waitFor(() => {
      expect(document.title).toBe('Website 2.0 · Task Management System');
    });
  });

  it('deletes after warning that the tasks go too, then returns to the list', async () => {
    const { requests } = serveProjects([website], { currentUser: manager });
    server.use(
      http.get(apiUrl('/api/tasks'), ({ request }) => {
        const params = new URL(request.url).searchParams;
        const total =
          params.get('ProjectId') === String(website.id) &&
          !params.has('Status') &&
          !params.has('Overdue')
            ? 8
            : 0;
        return HttpResponse.json(buildPagedTasks(total ? [buildTask()] : [], 1, 1, total));
      }),
    );
    const { user, router } = renderRoute(`/projects/${website.id}`, { user: manager });

    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete "Website Redesign"?' });
    expect(
      await within(dialog).findByText(
        /Its 8 tasks and their comments will be deleted too\. Members lose access\./,
      ),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Delete project' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Projects' })).toBeInTheDocument();
    expect(currentUrl(router)).toBe('/projects');
    expect(requests).toEqual([
      { method: 'DELETE', path: `/api/projects/${website.id}`, body: undefined },
    ]);
  });
});

describe('Deleting from the list', () => {
  it('never shows the deleted project again, even while the list is still refetching', async () => {
    serveProjects([website, mobile], { currentUser: manager });
    const { user } = renderRoute('/projects', { user: manager });
    await screen.findByRole('link', { name: 'Website Redesign' });
    // From now on the server is SLOW to answer the list: what the user sees comes from the cache.
    server.use(
      http.get(apiUrl('/api/projects'), async () => {
        await delay('infinite');
        return HttpResponse.json({});
      }),
    );

    await user.click(screen.getByRole('button', { name: 'Actions for Website Redesign' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete "Website Redesign"?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete project' }));

    await waitFor(() => {
      expect(screen.queryByRole('link', { name: 'Website Redesign' })).not.toBeInTheDocument();
    });
    expect(cardTitles()).toEqual(['Mobile App']);
    expect(screen.getByText('Showing 1–1 of 1 projects')).toBeInTheDocument();
  });
});

describe('Project details', () => {
  it('says "not found" for a project that does not exist or is not visible (404)', async () => {
    serveProjects([], { currentUser: regular });
    renderRoute('/projects/999', { user: regular });

    expect(await screen.findByRole('heading', { name: 'Project not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to projects' })).toHaveAttribute(
      'href',
      '/projects',
    );
  });

  it('shows progress and task counts by status on the overview (cancelled not counted)', async () => {
    serveProjects([website], { currentUser: manager });
    const counts: Record<string, number> = {
      Todo: 2,
      InProgress: 1,
      InReview: 0,
      Done: 3,
      Cancelled: 1,
    };
    server.use(
      http.get(apiUrl('/api/tasks'), ({ request }) => {
        const params = new URL(request.url).searchParams;
        const total =
          params.get('Overdue') === 'true' ? 1 : (counts[params.get('Status') ?? ''] ?? 0);
        return HttpResponse.json(buildPagedTasks([], 1, 1, total));
      }),
    );
    renderRoute(`/projects/${website.id}`, { user: manager });

    expect(await screen.findByText('50%')).toBeInTheDocument(); // 3 done of 6 (7 − 1 cancelled)
    expect(screen.getByText(/3 of 6 tasks done/)).toHaveTextContent('(cancelled not counted)');
    expect(screen.getByText('1 overdue task')).toBeInTheDocument();
    const table = screen.getByRole('table', { name: 'Tasks by status' });
    expect(within(table).getByRole('row', { name: /To do 2/ })).toBeInTheDocument();
    expect(within(table).getByRole('row', { name: /Done 3/ })).toBeInTheDocument();
  });

  it('is read-only for members: no edit/delete, no member management', async () => {
    const shared = buildProjectDetails({
      name: 'Shared',
      members: [
        buildMember({ fullName: 'Olivia Owner', memberRole: 'Owner' }),
        buildMember({ userId: regular.id, fullName: 'Rui Regular' }),
      ],
    });
    serveProjects([shared], { currentUser: regular });
    renderRoute(`/projects/${shared.id}/members`, { user: regular });

    const table = await screen.findByRole('table', { name: 'Members of Shared' });
    expect(within(table).getByText('(you)')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Add a member' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Remove / })).not.toBeInTheDocument();
  });
});

describe('Project members', () => {
  const carla = buildLookupUser({ fullName: 'Carla Diaz', email: 'carla@example.test' });
  const carl = buildLookupUser({ fullName: 'Carl Stone', email: 'carl@example.test' });

  it('finds a user with the keyboard and adds them', async () => {
    const { requests } = serveProjects([website], {
      currentUser: manager,
      directory: [carla, carl],
    });
    const { user } = renderRoute(`/projects/${website.id}/members`, { user: manager });

    const input = await screen.findByRole('combobox', { name: 'Add a member' });
    await user.type(input, 'c');
    expect(screen.getByText('Type at least 2 characters to search.')).toBeInTheDocument();
    await user.type(input, 'arl');
    const list = await screen.findByRole('listbox', { name: 'Matching users' });
    expect(within(list).getAllByRole('option')).toHaveLength(2);

    await user.keyboard('{ArrowDown}{Enter}'); // second result
    expect(await screen.findByText('Member added')).toBeInTheDocument();
    expect(requests).toEqual([
      { method: 'POST', path: `/api/projects/${website.id}/members`, body: { userId: carl.id } },
    ]);
    const table = screen.getByRole('table', { name: 'Members of Website Redesign' });
    expect(await within(table).findByText('Carl Stone')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Members (2)' })).toBeInTheDocument();
  });

  it('shows existing members in the results but does not let you pick them', async () => {
    const withCarla = buildProjectDetails({
      ...website,
      members: [...website.members, buildMember({ userId: carla.id, fullName: carla.fullName })],
    });
    const { requests } = serveProjects([withCarla], { currentUser: manager, directory: [carla] });
    const { user } = renderRoute(`/projects/${withCarla.id}/members`, { user: manager });

    await user.type(await screen.findByRole('combobox', { name: 'Add a member' }), 'carla');
    const option = await screen.findByRole('option', { name: /Carla Diaz/ });
    expect(option).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('1 user found, 0 can be added.')).toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(requests).toHaveLength(0);
  });

  it('explains a server refusal when adding (422 inactive user)', async () => {
    const ghost = buildLookupUser({ fullName: 'Gone Ghost' });
    serveProjects([website], { currentUser: manager, directory: [carla] });
    server.use(http.get(apiUrl('/api/users/lookup'), () => HttpResponse.json([ghost])));
    const { user } = renderRoute(`/projects/${website.id}/members`, { user: manager });

    await user.type(await screen.findByRole('combobox', { name: 'Add a member' }), 'gone');
    await user.click(await screen.findByRole('option', { name: /Gone Ghost/ }));

    expect(await screen.findByText('Could not add the member')).toBeInTheDocument();
    expect(screen.getByText('The user does not exist or is inactive.')).toBeInTheDocument();
  });

  it('removes a member after saying how many of their tasks become unassigned; the owner has no remove button', async () => {
    const member = buildMember({ fullName: 'Dana Dev' });
    const team = buildProjectDetails({ ...website, members: [...website.members, member] });
    const { requests } = serveProjects([team], { currentUser: manager });
    server.use(
      http.get(apiUrl('/api/tasks'), ({ request }) =>
        HttpResponse.json(
          buildPagedTasks(
            [],
            1,
            1,
            new URL(request.url).searchParams.get('AssignedToId') === member.userId ? 2 : 0,
          ),
        ),
      ),
    );
    const { user } = renderRoute(`/projects/${team.id}/members`, { user: manager });

    await screen.findByRole('table', { name: 'Members of Website Redesign' });
    expect(screen.queryByRole('button', { name: 'Remove Maya Manager' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove Dana Dev' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Remove Dana Dev?' });
    expect(
      await within(dialog).findByText(
        /Their 2 assigned tasks in this project will become unassigned\./,
      ),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Remove member' }));

    expect(await screen.findByText('Member removed')).toBeInTheDocument();
    expect(requests).toEqual([
      {
        method: 'DELETE',
        path: `/api/projects/${team.id}/members/${member.userId}`,
        body: undefined,
      },
    ]);
    await waitFor(() => {
      expect(screen.queryByText('Dana Dev')).not.toBeInTheDocument();
    });
  });

  it('tells an owner without lookup permission why they cannot search', async () => {
    const demoted = buildUser({ roles: ['User'] });
    const owned = buildProjectDetails({
      name: 'Legacy',
      ownerId: demoted.id,
      ownerName: 'Demoted Owner',
    });
    serveProjects([owned], { currentUser: demoted });
    renderRoute(`/projects/${owned.id}/members`, { user: demoted });

    expect(
      await screen.findByText('Finding users requires a verified Admin or Manager account.'),
    ).toBeInTheDocument();
  });
});
