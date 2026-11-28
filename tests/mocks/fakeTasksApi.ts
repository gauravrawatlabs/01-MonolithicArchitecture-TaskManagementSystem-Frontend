import { http, HttpResponse } from 'msw';

import { nextStatuses } from '@/features/tasks/taskRules';
import {
  type CreateTaskRequest,
  type ProjectDetails,
  type Task,
  type TaskItemStatus,
  type UserProfile,
} from '@/types/api';

import { apiUrl, problem } from './api';
import { buildPagedTasks } from './factories/tasks';
import { server } from './server';

export interface RecordedRequest {
  method: string;
  path: string;
  body: unknown;
}

const PRIORITY_RANK = { Low: 0, Medium: 1, High: 2, Critical: 3 } as const;

/**
 * A stateful fake of TasksController for integration tests:
 *  • list: ProjectId, Status, Priority, CategoryId, AssignedToMe/AssignedToId, Overdue, Search, SortBy/Direction, paging;
 *  • create/update: future due date for new/changed values (400 dueDateUtc), not after project end (422);
 *  • status: the real workflow (409 for an invalid move);
 *  • assignee: members only (422);
 *  • every write and every list query is recorded.
 * Permissions (403) are tested by overriding single endpoints in the test.
 */
export function serveTasks(
  initial: Task[],
  {
    currentUser,
    projects,
    now = () => new Date(),
  }: { currentUser: UserProfile; projects: ProjectDetails[]; now?: () => Date },
) {
  const store = new Map(initial.map((task) => [task.id, structuredClone(task)]));
  const requests: RecordedRequest[] = [];
  const listQueries: URLSearchParams[] = [];
  let nextId = Math.max(5000, ...initial.map((t) => t.id)) + 1;
  const projectOf = (id: number) => projects.find((p) => p.id === id);
  const me = `${currentUser.firstName} ${currentUser.lastName}`;

  const dueProblem = (dueUtc: string | null, original: string | null, projectId: number) => {
    if (!dueUtc || dueUtc === original) return null;
    if (new Date(dueUtc) <= now()) {
      return problem(400, { errors: { dueDateUtc: ['Due date must be in the future.'] } });
    }
    const end = projectOf(projectId)?.endDate;
    if (end && dueUtc.slice(0, 10) > end) {
      return problem(422, {
        detail: `The due date must not be after the project's end date (${end}).`,
      });
    }
    return null;
  };

  server.use(
    http.get(apiUrl('/api/tasks'), ({ request }) => {
      const params = new URL(request.url).searchParams;
      listQueries.push(params);
      const search = params.get('Search')?.toLowerCase();
      const sortBy = params.get('SortBy') ?? 'DueDate';
      const desc =
        (params.get('SortDirection') ?? (sortBy === 'Priority' ? 'Desc' : 'Asc')) === 'Desc';
      const page = Number(params.get('Page') ?? 1);
      const pageSize = Number(params.get('PageSize') ?? 20);
      const all = [...store.values()]
        .filter((t) => !params.has('ProjectId') || t.projectId === Number(params.get('ProjectId')))
        .filter((t) => !params.has('Status') || t.status === params.get('Status'))
        .filter((t) => !params.has('Priority') || t.priority === params.get('Priority'))
        .filter(
          (t) => !params.has('CategoryId') || t.categoryId === Number(params.get('CategoryId')),
        )
        .filter((t) => params.get('AssignedToMe') !== 'true' || t.assignedToId === currentUser.id)
        .filter((t) => !params.has('AssignedToId') || t.assignedToId === params.get('AssignedToId'))
        .filter((t) => params.get('Overdue') !== 'true' || t.isOverdue)
        .filter(
          (t) =>
            !search ||
            t.title.toLowerCase().includes(search) ||
            (t.description?.toLowerCase().includes(search) ?? false),
        );
      const key = (t: Task): string | number =>
        sortBy === 'Priority'
          ? PRIORITY_RANK[t.priority]
          : sortBy === 'Title'
            ? t.title
            : (t.dueDateUtc ?? '9999');
      all.sort((a, b) => {
        const [x, y] = [key(a), key(b)];
        const order = x < y ? -1 : x > y ? 1 : 0;
        return desc ? -order : order;
      });
      return HttpResponse.json(
        buildPagedTasks(
          all.slice((page - 1) * pageSize, page * pageSize),
          page,
          pageSize,
          all.length,
        ),
      );
    }),

    http.get(apiUrl('/api/tasks/:id'), ({ params }) => {
      const task = store.get(Number(params.id));
      return task
        ? HttpResponse.json(task)
        : problem(404, { detail: `Task with id '${String(params.id)}' was not found.` });
    }),

    http.post(apiUrl('/api/tasks'), async ({ request }) => {
      const body = (await request.json()) as CreateTaskRequest;
      requests.push({ method: 'POST', path: '/api/tasks', body });
      const project = projectOf(body.projectId);
      if (!project) return problem(404, { detail: 'Project not found.' });
      const refused = dueProblem(body.dueDateUtc, null, body.projectId);
      if (refused) return refused;
      const task: Task = {
        id: nextId++,
        title: body.title,
        description: body.description,
        status: 'Todo',
        priority: body.priority ?? 'Medium', // as the backend: no priority → Medium
        dueDateUtc: body.dueDateUtc,
        completedAtUtc: null,
        isOverdue: false,
        projectId: project.id,
        projectName: project.name,
        categoryId: body.categoryId,
        categoryName: null,
        createdById: currentUser.id,
        createdByName: me,
        assignedToId: null,
        assignedToName: null,
        createdAtUtc: now().toISOString(),
        updatedAtUtc: null,
      };
      store.set(task.id, task);
      return HttpResponse.json(task, { status: 201 });
    }),

    http.put(apiUrl('/api/tasks/:id'), async ({ params, request }) => {
      const body = (await request.json()) as Pick<
        Task,
        'title' | 'description' | 'priority' | 'dueDateUtc' | 'categoryId'
      >;
      requests.push({ method: 'PUT', path: `/api/tasks/${String(params.id)}`, body });
      const task = store.get(Number(params.id));
      if (!task) return problem(404);
      const refused = dueProblem(body.dueDateUtc, task.dueDateUtc, task.projectId);
      if (refused) return refused;
      Object.assign(task, body, { updatedAtUtc: now().toISOString() });
      return HttpResponse.json(task);
    }),

    http.delete(apiUrl('/api/tasks/:id'), ({ params }) => {
      requests.push({ method: 'DELETE', path: `/api/tasks/${String(params.id)}`, body: undefined });
      return store.delete(Number(params.id))
        ? new HttpResponse(null, { status: 204 })
        : problem(404);
    }),

    http.patch(apiUrl('/api/tasks/:id/assignee'), async ({ params, request }) => {
      const body = (await request.json()) as { assignedToId: string | null };
      requests.push({ method: 'PATCH', path: `/api/tasks/${String(params.id)}/assignee`, body });
      const task = store.get(Number(params.id));
      if (!task) return problem(404);
      const member = projectOf(task.projectId)?.members.find((m) => m.userId === body.assignedToId);
      if (body.assignedToId && !member) {
        return problem(422, {
          detail: 'A task can only be assigned to an active member of its project.',
        });
      }
      Object.assign(task, {
        assignedToId: body.assignedToId,
        assignedToName: member?.fullName ?? null,
      });
      return HttpResponse.json(task);
    }),

    http.patch(apiUrl('/api/tasks/:id/status'), async ({ params, request }) => {
      const body = (await request.json()) as { status: TaskItemStatus };
      requests.push({ method: 'PATCH', path: `/api/tasks/${String(params.id)}/status`, body });
      const task = store.get(Number(params.id));
      if (!task) return problem(404);
      const allowed = nextStatuses(task.status).map((m) => m.to);
      if (!allowed.includes(body.status)) {
        return problem(409, {
          detail: `A task cannot move from ${task.status} to ${body.status}. Allowed next statuses: ${allowed.join(', ')}.`,
        });
      }
      Object.assign(task, {
        status: body.status,
        completedAtUtc: body.status === 'Done' ? now().toISOString() : null,
        isOverdue: false,
      });
      return HttpResponse.json(task);
    }),
  );

  return { store, requests, listQueries };
}
