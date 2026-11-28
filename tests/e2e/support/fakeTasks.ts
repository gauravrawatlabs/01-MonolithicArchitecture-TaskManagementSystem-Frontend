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
  let nextCommentId = 100;
  const comments: Record<string, unknown>[] = [
    {
      id: 1,
      taskId: 1,
      authorId: TEAMMATE,
      authorName: 'Tara Teammate',
      content: 'I can take the hero section.',
      createdAtUtc: '2026-11-21T09:00:00Z',
      updatedAtUtc: null,
    },
  ];
  await fakeApiHandler(page, '/api/comments/*', ({ method, path, body }) => {
    const id = Number(path.split('/').pop());
    const comment = comments.find((c) => c.id === id);
    if (!comment) return [404, { status: 404, title: 'Not Found' }];
    if (method === 'DELETE') {
      comments.splice(comments.indexOf(comment), 1);
      return [204];
    }
    Object.assign(comment, {
      content: (body as { content: string }).content.trim(),
      updatedAtUtc: new Date().toISOString(),
    });
    return [200, comment];
  });

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
  await fakeApiHandler(page, '/api/tasks', ({ method, body, query }) => {
    if (method === 'GET') {
      // Enough filtering for the board (one query per status column) and the lists.
      const items = [...tasks.values()].filter(
        (t) =>
          (!query.has('Status') || t.status === query.get('Status')) &&
          (!query.has('AssignedToId') || t.assignedToId === query.get('AssignedToId')),
      );
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
    if (action === 'comments') {
      if (method === 'POST') {
        const comment = {
          id: nextCommentId++,
          taskId: task.id,
          authorId: FAKE_USER_ID,
          authorName: me.fullName,
          content: (body as { content: string }).content.trim(),
          createdAtUtc: new Date().toISOString(),
          updatedAtUtc: null,
        };
        comments.push(comment);
        return [201, comment];
      }
      const items = comments.filter((c) => c.taskId === task.id);
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
