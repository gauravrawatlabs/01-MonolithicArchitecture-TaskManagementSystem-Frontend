import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { apiUrl, problem } from '../mocks/api';
import { buildMember, buildProjectDetails } from '../mocks/factories/projects';
import { buildPagedTasks, buildTask } from '../mocks/factories/tasks';
import { buildUser } from '../mocks/factories/users';
import { serveProjects } from '../mocks/fakeProjectsApi';
import { serveTasks } from '../mocks/fakeTasksApi';
import { server } from '../mocks/server';
import { currentUrl, renderRoute } from '../utils/renderRoute';

const owner = buildUser({ firstName: 'Olivia', lastName: 'Owner', roles: ['Manager'] });
const assignee = buildUser({ firstName: 'Ana', lastName: 'Assignee' });
const bystander = buildUser({ firstName: 'Ben', lastName: 'Bystander' });
const project = buildProjectDetails({
  id: 7,
  name: 'Website Redesign',
  ownerId: owner.id,
  members: [
    buildMember({ userId: owner.id, fullName: 'Olivia Owner', memberRole: 'Owner' }),
    buildMember({ userId: assignee.id, fullName: 'Ana Assignee' }),
    buildMember({ userId: bystander.id, fullName: 'Ben Bystander' }),
  ],
});
const task = (
  id: number,
  title: string,
  status: Parameters<typeof buildTask>[0] extends infer T ? T : never,
) =>
  buildTask({
    id,
    title,
    projectId: 7,
    projectName: 'Website Redesign',
    createdById: owner.id,
    ...status,
  });
const copy = task(1, 'Write homepage copy', {
  status: 'Todo',
  priority: 'High',
  assignedToId: assignee.id,
  assignedToName: 'Ana Assignee',
});
const login = task(2, 'Fix login bug', { status: 'InReview', priority: 'Critical' });
const shipped = task(3, 'Ship v1', {
  status: 'Done',
  assignedToId: assignee.id,
  assignedToName: 'Ana Assignee',
});
const dropped = task(4, 'Old idea', { status: 'Cancelled' });

function serveBoard(user = owner, tasks = [copy, login, shipped, dropped]) {
  serveProjects([project], { currentUser: user });
  return serveTasks(tasks, { currentUser: user, projects: [project] });
}
const column = (name: string) => screen.getByRole('region', { name });
const cardTitles = (name: string) =>
  within(column(name))
    .queryAllByRole('article')
    .map((card) => within(card).getByRole('link').textContent);

describe('Project board', () => {
  it('shows four columns (one query each, most urgent first) and hides Cancelled until asked', async () => {
    const { listQueries } = serveBoard();
    const { user, router } = renderRoute('/projects/7/board', { user: owner });

    await screen.findByRole('link', { name: 'Fix login bug' });
    // (the toast viewport is a region too: count the columns only)
    expect(
      screen
        .getAllByRole('region')
        .map((r) => r.getAttribute('aria-labelledby'))
        .filter((id) => id?.startsWith('column-')),
    ).toEqual(['column-Todo', 'column-InProgress', 'column-InReview', 'column-Done']);
    expect(cardTitles('In review')).toEqual(['Fix login bug']);
    expect(within(column('To do')).getByText('1')).toBeInTheDocument();
    const statuses = listQueries.map((q) => q.get('Status')).sort();
    expect(statuses).toEqual(['Done', 'InProgress', 'InReview', 'Todo']);
    expect(Object.fromEntries(listQueries[0] ?? [])).toMatchObject({
      ProjectId: '7',
      SortBy: 'Priority',
      SortDirection: 'Desc',
      PageSize: '50',
    });

    await user.click(screen.getByRole('switch', { name: 'Show cancelled' }));
    expect(await screen.findByRole('link', { name: 'Old idea' })).toBeInTheDocument();
    expect(currentUrl(router)).toBe('/projects/7/board?cancelled=true');
  });

  it('moves a card at once (optimistic) with "Move to…", then the server confirms', async () => {
    const { requests } = serveBoard();
    let release: (() => void) | undefined;
    const answered = new Promise<void>((resolve) => {
      release = resolve;
    });
    const { user } = renderRoute('/projects/7/board', { user: owner });
    await screen.findByRole('link', { name: 'Write homepage copy' });
    // Hold the server's answer: what the user sees next comes from the optimistic update alone.
    server.use(
      http.patch(
        apiUrl('/api/tasks/:id/status'),
        async () => {
          await answered;
          return HttpResponse.json({ ...copy, status: 'InProgress' });
        },
        { once: true },
      ),
    );

    await user.click(screen.getByRole('button', { name: 'Move Write homepage copy to…' }));
    await user.click(await screen.findByRole('menuitem', { name: 'In progress' }));

    await waitFor(() => {
      expect(cardTitles('In progress')).toEqual(['Write homepage copy']);
    });
    expect(cardTitles('To do')).toEqual([]);
    release?.();
    await waitFor(() => {
      expect(cardTitles('In progress')).toEqual(['Write homepage copy']);
    });
    expect(requests).toHaveLength(0); // the held request went to the override above
  });

  it('keeps keyboard focus on the moved card (its handle in the new column)', async () => {
    serveBoard();
    const { user } = renderRoute('/projects/7/board', { user: owner });
    await screen.findByRole('link', { name: 'Write homepage copy' });

    await user.click(screen.getByRole('button', { name: 'Move Write homepage copy to…' }));
    await user.click(await screen.findByRole('menuitem', { name: 'In progress' }));

    await waitFor(() => {
      expect(
        within(column('In progress')).getByRole('button', { name: 'Drag Write homepage copy' }),
      ).toHaveFocus();
    });
  });

  it('puts the card back and explains when the API refuses the move (409)', async () => {
    serveBoard();
    server.use(
      http.patch(apiUrl('/api/tasks/:id/status'), () =>
        problem(409, {
          detail: 'A task cannot move from Done to InReview. Allowed next statuses: InProgress.',
        }),
      ),
    );
    const { user } = renderRoute('/projects/7/board', { user: owner });
    await screen.findByRole('link', { name: 'Fix login bug' });

    await user.click(screen.getByRole('button', { name: 'Move Fix login bug to…' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Done' }));

    expect(await screen.findByText('Can\'t move "Fix login bug" to Done')).toBeInTheDocument();
    await waitFor(() => {
      expect(cardTitles('In review')).toEqual(['Fix login bug']);
    });
    expect(cardTitles('Done')).toEqual(['Ship v1']);
  });

  it('offers moves per the rules: assignee moves own task, cannot reopen; others get no handle', async () => {
    serveBoard(assignee);
    renderRoute('/projects/7/board', { user: assignee });
    await screen.findByRole('link', { name: 'Write homepage copy' });

    expect(screen.getByRole('button', { name: 'Drag Write homepage copy' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Move Write homepage copy to…' }),
    ).toBeInTheDocument();
    // Done: reopening needs the project owner. Fix login bug: not hers at all.
    expect(screen.queryByRole('button', { name: 'Drag Ship v1' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Move Fix login bug to…' }),
    ).not.toBeInTheDocument();
  });

  it('filters every column by assignee (server-side) and keeps it in the URL', async () => {
    const { listQueries } = serveBoard();
    const { user, router } = renderRoute('/projects/7/board', { user: owner });
    await screen.findByRole('link', { name: 'Fix login bug' });

    await user.selectOptions(screen.getByRole('combobox', { name: 'Assignee' }), 'Ana Assignee');
    await waitFor(() => {
      expect(screen.queryByRole('link', { name: 'Fix login bug' })).not.toBeInTheDocument();
    });
    expect(listQueries.slice(-4).map((q) => q.get('AssignedToId'))).toEqual(
      Array(4).fill(assignee.id),
    );
    expect(currentUrl(router)).toBe(`/projects/7/board?assignee=${assignee.id}`);
  });

  it('loads more cards in a long column, up to the API limit', async () => {
    serveBoard();
    const many = Array.from({ length: 50 }, (_, i) =>
      task(100 + i, `Task ${i}`, { status: 'Todo' }),
    );
    const sizes: (string | null)[] = [];
    server.use(
      http.get(apiUrl('/api/tasks'), ({ request }) => {
        const query = new URL(request.url).searchParams;
        if (query.get('Status') !== 'Todo') return HttpResponse.json(buildPagedTasks([]));
        sizes.push(query.get('PageSize'));
        const size = Number(query.get('PageSize'));
        return HttpResponse.json(
          buildPagedTasks(size === 100 ? [...many, ...many.slice(0, 10)] : many, 1, size, 60),
        );
      }),
    );
    const { user } = renderRoute('/projects/7/board', { user: owner });

    await user.click(
      await within(await screen.findByRole('region', { name: 'To do' })).findByRole('button', {
        name: 'Load more (10)',
      }),
    );
    await waitFor(() => {
      expect(sizes).toEqual(['50', '100']);
    });
  });
});

describe('Board picker', () => {
  it('lists my projects, each opening its board', async () => {
    serveProjects([project], { currentUser: owner });
    renderRoute('/board', { user: owner });

    expect(await screen.findByRole('link', { name: /Website Redesign/ })).toHaveAttribute(
      'href',
      '/projects/7/board',
    );
  });
});
