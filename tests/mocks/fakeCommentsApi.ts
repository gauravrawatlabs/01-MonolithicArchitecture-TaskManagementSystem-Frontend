import { http, HttpResponse } from 'msw';

import { type Comment, type UserProfile } from '@/types/api';

import { apiUrl, problem } from './api';
import { server } from './server';

export interface RecordedRequest {
  method: string;
  path: string;
  body: unknown;
}

let sequence = 0;
export function buildComment(overrides: Partial<Comment> = {}): Comment {
  sequence += 1;
  return {
    id: 9000 + sequence,
    taskId: 501,
    authorId: '00000000-0000-4000-9000-0000000000c1',
    authorName: 'Someone',
    content: `Comment ${sequence}`,
    createdAtUtc: new Date(Date.UTC(2026, 10, 20, 9, sequence)).toISOString(),
    updatedAtUtc: null,
    ...overrides,
  };
}

/**
 * A stateful fake of CommentsController for one or more tasks: oldest first, paged (Page/PageSize), add
 * (400 when blank), edit (sets updatedAtUtc), delete. Rights (403) are tested by overriding an endpoint.
 */
export function serveComments(initial: Comment[], { currentUser }: { currentUser: UserProfile }) {
  const store = initial.map((c) => ({ ...c }));
  const requests: RecordedRequest[] = [];
  const pageQueries: URLSearchParams[] = [];
  let nextId = 20_000;

  server.use(
    http.get(apiUrl('/api/tasks/:taskId/comments'), ({ params, request }) => {
      const query = new URL(request.url).searchParams;
      pageQueries.push(query);
      const page = Number(query.get('Page') ?? 1);
      const pageSize = Number(query.get('PageSize') ?? 20);
      const all = store
        .filter((c) => c.taskId === Number(params.taskId))
        .sort((a, b) => a.createdAtUtc.localeCompare(b.createdAtUtc));
      const totalPages = Math.ceil(all.length / pageSize);
      return HttpResponse.json({
        items: all.slice((page - 1) * pageSize, page * pageSize),
        page,
        pageSize,
        totalCount: all.length,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
      });
    }),
    http.post(apiUrl('/api/tasks/:taskId/comments'), async ({ params, request }) => {
      const body = (await request.json()) as { content: string };
      requests.push({ method: 'POST', path: `/api/tasks/${String(params.taskId)}/comments`, body });
      if (!body.content.trim())
        return problem(400, { errors: { content: ['Content is required.'] } });
      const comment: Comment = {
        id: nextId++,
        taskId: Number(params.taskId),
        authorId: currentUser.id,
        authorName: `${currentUser.firstName} ${currentUser.lastName}`,
        content: body.content.trim(),
        createdAtUtc: new Date().toISOString(),
        updatedAtUtc: null,
      };
      store.push(comment);
      return HttpResponse.json(comment, { status: 201 });
    }),
    http.put(apiUrl('/api/comments/:id'), async ({ params, request }) => {
      const body = (await request.json()) as { content: string };
      requests.push({ method: 'PUT', path: `/api/comments/${String(params.id)}`, body });
      const comment = store.find((c) => c.id === Number(params.id));
      if (!comment) return problem(404);
      Object.assign(comment, {
        content: body.content.trim(),
        updatedAtUtc: new Date().toISOString(),
      });
      return HttpResponse.json(comment);
    }),
    http.delete(apiUrl('/api/comments/:id'), ({ params }) => {
      requests.push({
        method: 'DELETE',
        path: `/api/comments/${String(params.id)}`,
        body: undefined,
      });
      const index = store.findIndex((c) => c.id === Number(params.id));
      if (index === -1) return problem(404);
      store.splice(index, 1);
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return { store, requests, pageQueries };
}
