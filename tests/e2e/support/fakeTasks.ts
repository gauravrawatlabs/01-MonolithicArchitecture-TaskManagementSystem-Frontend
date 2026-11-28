import { type Page } from '@playwright/test';

import { FAKE_USER_ID, fakeApiHandler } from './fakeApi';

export const TEAMMATE = '00000000-0000-4000-8000-0000000000bb';
const OTHER = '00000000-0000-4000-8000-0000000000aa';
type Status = 'Todo' | 'InProgress' | 'InReview' | 'Done' | 'Cancelled';
const NEXT: Record<Status, Status[]> = {
  Todo: ['InProgress', 'Cancelled'],
  InProgress: ['Todo', 'InReview', 'Cancelled'],
  InReview: ['InProgress', 'Done', 'Cancelled'],
  Done: ['InProgress'],
  Cancelled: ['Todo'],
};

/**
 * A stateful project (owned by the signed-in user or not) and TasksController in the browser.
 * Enough rules to behave like the API: workflow (409), members-only assignment (422).
 */
export async function fakeTaskWorld(page: Page, { iOwnTheProject }: { iOwnTheProject: boolean }) {
  const me = {
    userId: FAKE_USER_ID,
    fullName: iOwnTheProject ? 'Max Manager' : 'Uma User',
    email: 'me@example.test',
  };
  const owner = iOwnTheProject
    ? me
    : { userId: OTHER, fullName: 'Olivia Owner', email: 'olivia@example.test' };
  const members = [
    { ...owner, memberRole: 'Owner', joinedAtUtc: '2026-11-01T09:00:00Z' },
    ...(iOwnTheProject
      ? []
      : [{ ...me, memberRole: 'Member', joinedAtUtc: '2026-11-01T09:00:00Z' }]),
    {
      userId: TEAMMATE,
      fullName: 'Tara Teammate',
      email: 'tara@example.test',
      memberRole: 'Member',
      joinedAtUtc: '2026-11-02T09:00:00Z',
    },
  ];
  const project = {
    id: 7,
    name: 'Website Redesign',
    description: null,
    startDate: null,
    endDate: null,
    ownerId: owner.userId,
    ownerName: owner.fullName,
    members,
    createdAtUtc: '2026-11-01T09:00:00Z',
    updatedAtUtc: null,
  };
  const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();
  const base = {
    description: null,
    completedAtUtc: null,
    isOverdue: false,
    projectId: 7,
    projectName: 'Website Redesign',
    categoryId: null,
    categoryName: null,
    createdById: OTHER,
    createdByName: 'Olivia Owner',
    createdAtUtc: '2026-11-20T09:00:00Z',
    updatedAtUtc: null,
  };
  const tasks = new Map<number, Record<string, unknown>>([
    [
      1,
      {
        ...base,
        id: 1,
        title: 'Write homepage copy',
        status: 'Todo',
        priority: 'High',
        dueDateUtc: inDays(2),
        assignedToId: FAKE_USER_ID,
        assignedToName: me.fullName,
      },
    ],
    [
      2,
      {
        ...base,
        id: 2,
        title: 'Fix login bug',
        status: 'InReview',
        priority: 'Critical',
        dueDateUtc: inDays(-1),
        isOverdue: true,
        assignedToId: TEAMMATE,
        assignedToName: 'Tara Teammate',
      },
    ],
  ]);
  let nextId = 3;

  await fakeApiHandler(page, '/api/projects', () => [
    200,
    {
      items: [
        {
          ...project,
          members: undefined,
          memberCount: members.length,
          taskCount: 2,
          openTaskCount: 2,
          doneTaskCount: 0,
          completionPercent: 0,
        },
      ],
      page: 1,
      pageSize: 100,
      totalCount: 1,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    },
  ]);
  await fakeApiHandler(page, '/api/projects/*', () => [200, project]);
  await fakeApiHandler(page, '/api/tasks', ({ method, body }) => {
    if (method === 'GET') {
      const items = [...tasks.values()];
      return [
        200,
        {
          items,
          page: 1,
          pageSize: 20,
          totalCount: items.length,
          totalPages: 1,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      ];
    }
    const request = body as Record<string, unknown>;
    const task = {
      ...base,
      ...request,
      id: nextId++,
      status: 'Todo',
      priority: request.priority ?? 'Medium',
      createdById: FAKE_USER_ID,
      createdByName: me.fullName,
      assignedToId: null,
      assignedToName: null,
    };
    tasks.set(task.id, task);
    return [201, task];
  });
  await fakeApiHandler(page, '/api/tasks/*', ({ method, path, body }) => {
    const [, , , rawId, action] = path.split('/');
    const task = tasks.get(Number(rawId));
    if (!task) return [404, { status: 404, title: 'Not Found' }];
    if (action === 'status') {
      const to = (body as { status: Status }).status;
      if (!NEXT[task.status as Status].includes(to))
        return [409, { status: 409, detail: 'Invalid move.' }];
      Object.assign(task, {
        status: to,
        isOverdue: false,
        completedAtUtc: to === 'Done' ? new Date().toISOString() : null,
      });
      return [200, task];
    }
    if (action === 'assignee') {
      const id = (body as { assignedToId: string | null }).assignedToId;
      const member = members.find((m) => m.userId === id);
      if (id && !member) return [422, { status: 422, detail: 'Not a member.' }];
      Object.assign(task, { assignedToId: id, assignedToName: member?.fullName ?? null });
      return [200, task];
    }
    if (method === 'DELETE') {
      tasks.delete(Number(rawId));
      return [204];
    }
    if (method === 'PUT') Object.assign(task, body);
    return [200, task];
  });
}
