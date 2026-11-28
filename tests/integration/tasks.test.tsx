import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { utcToLocalInput } from '@/features/tasks/dueDates';

import { apiUrl, problem } from '../mocks/api';
import { buildMember, buildProjectDetails } from '../mocks/factories/projects';
import { buildTask } from '../mocks/factories/tasks';
import { buildUser } from '../mocks/factories/users';
import { serveProjects } from '../mocks/fakeProjectsApi';
import { serveTasks } from '../mocks/fakeTasksApi';
import { server } from '../mocks/server';
import { currentUrl, renderRoute } from '../utils/renderRoute';

const owner = buildUser({ firstName: 'Olivia', lastName: 'Owner', roles: ['Manager'] });
const creator = buildUser({ firstName: 'Cara', lastName: 'Creator' });
const assignee = buildUser({ firstName: 'Ana', lastName: 'Assignee' });
const bystander = buildUser({ firstName: 'Ben', lastName: 'Bystander' });

const project = buildProjectDetails({
  id: 7,
  name: 'Website Redesign',
  ownerId: owner.id,
  ownerName: 'Olivia Owner',
  endDate: '2099-12-31',
  members: [
    buildMember({ userId: owner.id, fullName: 'Olivia Owner', memberRole: 'Owner' }),
    buildMember({ userId: creator.id, fullName: 'Cara Creator' }),
    buildMember({ userId: assignee.id, fullName: 'Ana Assignee' }),
    buildMember({ userId: bystander.id, fullName: 'Ben Bystander' }),
  ],
});
const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

const homepage = buildTask({
  id: 501,
  title: 'Write homepage copy',
  projectId: 7,
  projectName: 'Website Redesign',
  status: 'Todo',
  priority: 'High',
  dueDateUtc: inDays(3),
  createdById: creator.id,
  createdByName: 'Cara Creator',
  assignedToId: assignee.id,
  assignedToName: 'Ana Assignee',
});
const login = buildTask({
  id: 502,
  title: 'Fix login bug',
  projectId: 7,
  projectName: 'Website Redesign',
  status: 'InReview',
  priority: 'Critical',
  dueDateUtc: inDays(-1),
  isOverdue: true,
  createdById: owner.id,
});
const shipped = buildTask({
  id: 503,
  title: 'Ship v1',
  projectId: 7,
  projectName: 'Website Redesign',
  status: 'Done',
  priority: 'Low',
  createdById: creator.id,
  assignedToId: assignee.id,
  assignedToName: 'Ana Assignee',
});

function serveAll(user = owner, tasks = [homepage, login, shipped]) {
  serveProjects([project], { currentUser: user });
  return serveTasks(tasks, { currentUser: user, projects: [project] });
}
const rows = () =>
  within(screen.getByRole('table', { name: 'Tasks' }))
    .getAllByRole('row')
    .slice(1);
const titles = () => rows().map((row) => within(row).getAllByRole('link')[0]?.textContent);

describe('Task lists', () => {
  it('lists tasks by due date (backend default) with project, status, priority and due date', async () => {
    const { listQueries } = serveAll();
    renderRoute('/tasks', { user: owner });

    expect(await screen.findByRole('heading', { level: 1, name: 'All tasks' })).toBeInTheDocument();
    await screen.findByRole('link', { name: 'Fix login bug' });
    expect(titles()).toEqual(['Fix login bug', 'Write homepage copy', 'Ship v1']); // no due date last
    expect(Object.fromEntries(listQueries[0] ?? [])).toEqual({
      SortBy: 'DueDate',
      SortDirection: 'Asc',
      Page: '1',
      PageSize: '20',
    });
    const overdue = screen.getByRole('row', { name: /Fix login bug/ });
    expect(within(overdue).getAllByText(/Overdue/)[0]).toBeInTheDocument();
    expect(within(overdue).getAllByText('Website Redesign')[0]).toBeInTheDocument();
  });

  it('"My tasks" asks the API for tasks assigned to me', async () => {
    const { listQueries } = serveAll(assignee);
    renderRoute('/tasks?assignedToMe=true', { user: assignee });

    expect(await screen.findByRole('heading', { level: 1, name: 'My tasks' })).toBeInTheDocument();
    await screen.findByRole('link', { name: 'Write homepage copy' });
    expect(listQueries[0]?.get('AssignedToMe')).toBe('true');
    expect(titles()).toEqual(['Write homepage copy', 'Ship v1']);
  });

  it('filters on the server, keeps filters in the URL, and clears them', async () => {
    const { listQueries } = serveAll();
    const { user, router } = renderRoute('/tasks', { user: owner });
    await screen.findByRole('link', { name: 'Fix login bug' });

    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'InReview');
    await waitFor(() => {
      expect(titles()).toEqual(['Fix login bug']);
    });
    await user.selectOptions(screen.getByRole('combobox', { name: 'Due date' }), 'overdue');
    await waitFor(() => {
      expect(listQueries.at(-1)?.get('Overdue')).toBe('true');
    });
    expect(currentUrl(router)).toBe('/tasks?status=InReview&due=overdue');

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => {
      expect(titles()).toHaveLength(3);
    });
    expect(currentUrl(router)).toBe('/tasks');
  });

  it('folds the filters behind a "Filters" button (for phones) that shows how many are active', async () => {
    serveAll();
    const { user } = renderRoute('/tasks?status=Todo&due=overdue', { user: owner });
    await screen.findByRole('table', { name: 'Tasks' });

    const toggle = screen.getByRole('button', { name: 'Filters (2)' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    const panel = document.getElementById(toggle.getAttribute('aria-controls') ?? '');
    expect(panel).toContainElement(screen.getByRole('combobox', { name: 'Status' }));
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('searches after typing pauses (one request) and sorts by priority, most urgent first', async () => {
    const { listQueries } = serveAll();
    const { user, router } = renderRoute('/tasks', { user: owner });
    await screen.findByRole('link', { name: 'Fix login bug' });

    await user.type(screen.getByRole('searchbox', { name: 'Search tasks' }), 'copy');
    await waitFor(() => {
      expect(titles()).toEqual(['Write homepage copy']);
    });
    expect(listQueries.map((q) => q.get('Search'))).toEqual([null, 'copy']);

    await user.clear(screen.getByRole('searchbox', { name: 'Search tasks' }));
    await user.click(screen.getByRole('button', { name: 'Priority' }));
    await waitFor(() => {
      expect(titles()).toEqual(['Fix login bug', 'Write homepage copy', 'Ship v1']);
    });
    expect(listQueries.at(-1)?.get('SortDirection')).toBe('Desc');
    expect(currentUrl(router)).toBe('/tasks?sort=Priority');
  });

  it("a project's Tasks tab is fixed to that project (no project filter or column)", async () => {
    const { listQueries } = serveAll();
    renderRoute('/projects/7/tasks', { user: owner });

    await screen.findByRole('link', { name: 'Fix login bug' });
    expect(listQueries[0]?.get('ProjectId')).toBe('7');
    expect(screen.queryByRole('combobox', { name: 'Project' })).not.toBeInTheDocument();
  });

  it('offers each user only the actions the API allows: the assignee may move status, not edit', async () => {
    const { requests } = serveAll(assignee);
    const { user } = renderRoute('/tasks', { user: assignee });
    await screen.findByRole('link', { name: 'Write homepage copy' });

    await user.click(
      await screen.findByRole('button', { name: 'Actions for Write homepage copy' }),
    );
    const menu = await screen.findByRole('menu');
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.textContent.trim()),
    ).toEqual(['Start', 'Cancel task']);
    await user.click(within(menu).getByRole('menuitem', { name: 'Start' }));

    expect(await screen.findByText('Moved to In progress')).toBeInTheDocument();
    expect(requests).toEqual([
      { method: 'PATCH', path: '/api/tasks/501/status', body: { status: 'InProgress' } },
    ]);
    await waitFor(() => {
      expect(
        within(screen.getByRole('row', { name: /Write homepage copy/ })).getAllByText(
          'In progress',
        )[0],
      ).toBeInTheDocument();
    });
    // Done task: reopening needs the project owner, so the assignee gets no menu at all.
    expect(screen.queryByRole('button', { name: 'Actions for Ship v1' })).not.toBeInTheDocument();
  });

  it('edits and deletes from the row menu (owner)', async () => {
    const { requests } = serveAll(owner);
    const { user } = renderRoute('/tasks', { user: owner });
    await screen.findByRole('link', { name: 'Fix login bug' });

    await user.click(await screen.findByRole('button', { name: 'Actions for Fix login bug' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit task' });
    await user.clear(within(dialog).getByLabelText(/^Title/));
    await user.type(within(dialog).getByLabelText(/^Title/), 'Fix login bug on Safari');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(
      await screen.findByRole('link', { name: 'Fix login bug on Safari' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Actions for Fix login bug on Safari' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    const confirm = await screen.findByRole('alertdialog', {
      name: 'Delete "Fix login bug on Safari"?',
    });
    await user.click(within(confirm).getByRole('button', { name: 'Delete task' }));
    await waitFor(() => {
      expect(
        screen.queryByRole('link', { name: 'Fix login bug on Safari' }),
      ).not.toBeInTheDocument();
    });
    expect(requests.map((r) => r.method)).toEqual(['PUT', 'DELETE']);
  });

  it('pages through long lists and changes the page size (both on the server, in the URL)', async () => {
    const many = Array.from({ length: 25 }, (_, i) =>
      buildTask({
        id: 600 + i,
        title: `Task ${String(i + 1).padStart(2, '0')}`,
        projectId: 7,
        projectName: 'Website Redesign',
        createdById: owner.id,
      }),
    );
    const { listQueries } = serveAll(owner, many);
    const { user, router } = renderRoute('/tasks?sort=Title', { user: owner });
    await screen.findByText('Showing 1–20 of 25 tasks');

    await user.click(screen.getByRole('button', { name: 'Page 2' }));
    expect(await screen.findByText('Showing 21–25 of 25 tasks')).toBeInTheDocument();
    expect(listQueries.at(-1)?.get('Page')).toBe('2');

    await user.selectOptions(screen.getByLabelText('Per page'), '50');
    expect(await screen.findByText('Showing 1–25 of 25 tasks')).toBeInTheDocument();
    expect(currentUrl(router)).toBe('/tasks?sort=Title&size=50'); // page reset to 1
  });

  it('shows an error with a retry when the list cannot be loaded', async () => {
    serveAll();
    let fail = true;
    server.use(
      http.get(apiUrl('/api/tasks'), () =>
        fail
          ? problem(500)
          : HttpResponse.json({
              items: [],
              page: 1,
              pageSize: 20,
              totalCount: 0,
              totalPages: 0,
              hasPreviousPage: false,
              hasNextPage: false,
            }),
      ),
    );
    const { user } = renderRoute('/tasks', { user: owner });

    expect(await screen.findByText("We couldn't load the tasks")).toBeInTheDocument();
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'No tasks yet' })).toBeInTheDocument();
  });
});

describe('Creating and editing tasks', () => {
  async function openNewTask(user: ReturnType<typeof renderRoute>['user']) {
    await user.click(await screen.findByRole('button', { name: 'New task' }));
    const dialog = await screen.findByRole('dialog', { name: 'New task' });
    await waitFor(() => {
      expect(within(dialog).getByLabelText(/^Project/)).toHaveValue('7');
    });
    return dialog;
  }

  it('creates a task in the project (past due date refused first) and opens it', async () => {
    const { requests } = serveAll(creator);
    const { user, router } = renderRoute('/projects/7/tasks', { user: creator });
    const dialog = await openNewTask(user);

    expect(within(dialog).getByLabelText(/^Project/)).toBeDisabled();
    expect(within(dialog).getByLabelText(/^Title/)).toHaveFocus();
    expect(within(dialog).queryByLabelText(/^Assignee/)).not.toBeInTheDocument(); // only the owner assigns
    await user.type(within(dialog).getByLabelText(/^Title/), '  Draft FAQ  ');
    fireEvent.change(within(dialog).getByLabelText(/^Due date/), {
      target: { value: utcToLocalInput(inDays(-2)) },
    });
    await user.click(within(dialog).getByRole('button', { name: 'Create task' }));
    expect(await within(dialog).findByText('Due date must be in the future.')).toBeInTheDocument();
    expect(requests).toHaveLength(0);

    const due = utcToLocalInput(inDays(5));
    fireEvent.change(within(dialog).getByLabelText(/^Due date/), { target: { value: due } });
    await user.selectOptions(within(dialog).getByLabelText(/^Priority/), 'Critical');
    await user.click(within(dialog).getByRole('button', { name: 'Create task' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Draft FAQ' })).toBeInTheDocument();
    expect(requests[0]?.body).toEqual({
      projectId: 7,
      title: 'Draft FAQ',
      description: null,
      priority: 'Critical',
      categoryId: null,
      dueDateUtc: new Date(due).toISOString(),
    });
    expect(currentUrl(router)).toMatch(/^\/tasks\/\d+$/);
  });

  it('lets the project owner assign while creating (a second request), and says so if that part fails', async () => {
    const { requests } = serveAll(owner);
    server.use(
      http.patch(apiUrl('/api/tasks/:id/assignee'), () =>
        problem(422, { detail: 'A task can only be assigned to an active member of its project.' }),
      ),
    );
    const { user } = renderRoute('/projects/7/tasks', { user: owner });
    const dialog = await openNewTask(user);

    await user.type(within(dialog).getByLabelText(/^Title/), 'Plan launch');
    await user.selectOptions(await within(dialog).findByLabelText(/^Assignee/), 'Ana Assignee');
    await user.click(within(dialog).getByRole('button', { name: 'Create task' }));

    expect(await screen.findByText('Task created, but not assigned')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Plan launch' }),
    ).toBeInTheDocument();
    expect(requests.map((r) => r.method)).toEqual(['POST']); // the PATCH went to the override
  });

  it('keeps an unchanged past due date when editing, and shows business rules from the API', async () => {
    const { requests } = serveAll(owner);
    server.use(
      http.put(
        apiUrl('/api/tasks/:id'),
        () => problem(422, { detail: 'Category 9 does not exist.' }),
        { once: true },
      ),
    );
    const { user } = renderRoute('/tasks/502', { user: owner });

    await user.click(await screen.findByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit task' });
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(await within(dialog).findByText('Category 9 does not exist.')).toBeInTheDocument();

    await user.clear(within(dialog).getByLabelText(/^Title/));
    await user.type(within(dialog).getByLabelText(/^Title/), 'Fix login bug (Safari)');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Fix login bug (Safari)' }),
    ).toBeInTheDocument();
    expect(requests.at(-1)?.body).toMatchObject({ dueDateUtc: login.dueDateUtc }); // past, but untouched
  });

  it("puts the API's due-date validation error under the due date field", async () => {
    serveAll(owner);
    server.use(
      http.put(apiUrl('/api/tasks/:id'), () =>
        problem(400, { errors: { dueDateUtc: ['Due date must be in the future.'] } }),
      ),
    );
    const { user } = renderRoute('/tasks/501', { user: owner });

    await user.click(await screen.findByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit task' });
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    const field = within(dialog).getByLabelText(/^Due date/);
    await waitFor(() => {
      expect(field).toHaveAttribute('aria-invalid', 'true');
    });
    expect(field).toHaveAccessibleDescription(/Due date must be in the future\./);
  });
});

describe('Task details', () => {
  it('says "not found" for a task that does not exist or is not visible', async () => {
    serveAll();
    renderRoute('/tasks/999', { user: bystander });
    expect(await screen.findByRole('heading', { name: 'Task not found' })).toBeInTheDocument();
  });

  it('shows the task with breadcrumb and title, and offers the assignee only valid status moves', async () => {
    const { requests } = serveAll(assignee);
    const { user } = renderRoute('/tasks/501', { user: assignee });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Write homepage copy' }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(document.title).toBe('Write homepage copy · Task Management System');
    });
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument(); // assignee ≠ creator
    const moves = await screen.findByRole('group', { name: 'Change status' });
    expect(
      within(moves)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Start', 'Cancel task']);

    await user.click(within(moves).getByRole('button', { name: 'Start' }));
    await waitFor(() => {
      expect(
        within(screen.getByRole('group', { name: 'Change status' }))
          .getAllByRole('button')
          .map((b) => b.textContent),
      ).toEqual(['Back to to do', 'Send to review', 'Cancel task']);
    });
    expect(requests).toEqual([
      { method: 'PATCH', path: '/api/tasks/501/status', body: { status: 'InProgress' } },
    ]);
  });

  it('explains why a closed task cannot be reopened by the assignee; the owner can reopen it', async () => {
    serveAll(assignee);
    const first = renderRoute('/tasks/503', { user: assignee });
    expect(
      await screen.findByText('Only the project owner can reopen this task.'),
    ).toBeInTheDocument();
    first.unmount();

    serveAll(owner);
    renderRoute('/tasks/503', { user: owner });
    expect(await screen.findByRole('button', { name: 'Reopen' })).toBeInTheDocument();
  });

  it('a member who is neither creator nor assignee can only read', async () => {
    serveAll(bystander);
    renderRoute('/tasks/501', { user: bystander });

    expect(
      await screen.findByText(
        'Only the project owner, the task creator or the assignee can change the status.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Assignee')).not.toBeInTheDocument();
  });

  it('an unverified user sees why nothing can be changed, in the list and on the task (EmailVerified)', async () => {
    const unverified = { ...creator, emailConfirmed: false };
    serveAll(unverified);
    const first = renderRoute('/projects/7/tasks', { user: unverified });

    expect(
      await screen.findByText('Verify your email address to create or change tasks.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New task' })).not.toBeInTheDocument();
    await screen.findByRole('link', { name: 'Write homepage copy' });
    expect(screen.queryByRole('button', { name: /^Actions for/ })).not.toBeInTheDocument();
    first.unmount();

    renderRoute('/tasks/501', { user: unverified });
    expect(
      await screen.findByText('Verify your email address to create or change tasks.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Change status' })).not.toBeInTheDocument();
  });

  it("explains the API's refusal when the status changed meanwhile (409)", async () => {
    serveAll(owner);
    server.use(
      http.patch(apiUrl('/api/tasks/:id/status'), () =>
        problem(409, {
          detail: 'A task cannot move from Done to InReview. Allowed next statuses: InProgress.',
        }),
      ),
    );
    const { user } = renderRoute('/tasks/502', { user: owner });

    await user.click(await screen.findByRole('button', { name: 'Mark done' }));
    expect(await screen.findByText('Could not change the status')).toBeInTheDocument();
    expect(screen.getByText(/Allowed next statuses: InProgress\./)).toBeInTheDocument();
  });

  it('the owner assigns and unassigns from the details', async () => {
    const { requests } = serveAll(owner);
    const { user } = renderRoute('/tasks/502', { user: owner });

    const select = await screen.findByLabelText('Assignee');
    await user.selectOptions(select, 'Ana Assignee');
    expect(await screen.findByText('Assigned to Ana Assignee')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Assignee'), '');
    expect(await screen.findByText('Task unassigned')).toBeInTheDocument();

    expect(requests.map((r) => r.body)).toEqual([
      { assignedToId: assignee.id },
      { assignedToId: null },
    ]);
  });

  it("deletes a task and returns to its project's task list", async () => {
    const { requests } = serveAll(creator);
    const { user, router } = renderRoute('/tasks/501', { user: creator });

    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('alertdialog', {
      name: 'Delete "Write homepage copy"?',
    });
    await user.click(within(dialog).getByRole('button', { name: 'Delete task' }));

    await waitFor(() => {
      expect(currentUrl(router)).toBe('/projects/7/tasks');
    });
    expect(requests).toEqual([{ method: 'DELETE', path: '/api/tasks/501', body: undefined }]);
    await screen.findByRole('link', { name: 'Fix login bug' });
    expect(screen.queryByRole('link', { name: 'Write homepage copy' })).not.toBeInTheDocument();
  });
});
