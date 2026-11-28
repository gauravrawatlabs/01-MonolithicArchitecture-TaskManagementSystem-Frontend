import { http, HttpResponse } from 'msw';

import { type UserProfile } from '@/types/api';

import { apiUrl, problem } from './api';
import { server } from './server';

export interface RecordedRequest {
  method: string;
  path: string;
  body: unknown;
}

/**
 * A stateful fake of UsersController (+ GET /api/auth/me for the signed-in user): list with Search
 * (email/first/last), Role, IsActive, SortBy/SortDirection, paging; details (404); roles (400 empty,
 * 422 own Admin role); status (422 own account); PUT /me. Every write and list query is recorded.
 */
export function serveUsers(initial: UserProfile[], { currentUser }: { currentUser: UserProfile }) {
  const store = new Map(initial.map((u) => [u.id, structuredClone(u)]));
  if (!store.has(currentUser.id)) store.set(currentUser.id, structuredClone(currentUser));
  const requests: RecordedRequest[] = [];
  const listQueries: URLSearchParams[] = [];

  server.use(
    http.get(apiUrl('/api/users'), ({ request }) => {
      const q = new URL(request.url).searchParams;
      listQueries.push(q);
      const search = q.get('Search')?.toLowerCase();
      const sortBy = q.get('SortBy') ?? 'Email';
      const desc =
        (q.get('SortDirection') ??
          (sortBy === 'CreatedAt' || sortBy === 'LastLogin' ? 'Desc' : 'Asc')) === 'Desc';
      const page = Number(q.get('Page') ?? 1);
      const pageSize = Number(q.get('PageSize') ?? 20);
      const key = (u: UserProfile) =>
        sortBy === 'Name'
          ? `${u.firstName} ${u.lastName}`
          : sortBy === 'CreatedAt'
            ? u.createdAtUtc
            : sortBy === 'LastLogin'
              ? (u.lastLoginAtUtc ?? '')
              : u.email;
      const all = [...store.values()]
        .filter(
          (u) =>
            !search ||
            [u.email, u.firstName, u.lastName].some((v) => v.toLowerCase().includes(search)),
        )
        .filter((u) => !q.has('Role') || u.roles.includes(q.get('Role') ?? ''))
        .filter((u) => !q.has('IsActive') || String(u.isActive) === q.get('IsActive'))
        .sort((a, b) => (desc ? key(b).localeCompare(key(a)) : key(a).localeCompare(key(b))));
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
    http.put(apiUrl('/api/users/me'), async ({ request }) => {
      const body = (await request.json()) as Pick<
        UserProfile,
        'firstName' | 'lastName' | 'jobTitle'
      >;
      requests.push({ method: 'PUT', path: '/api/users/me', body });
      const me = store.get(currentUser.id);
      if (!me) return problem(401);
      Object.assign(me, body);
      return HttpResponse.json(me);
    }),
    http.get(apiUrl('/api/auth/me'), () => HttpResponse.json(store.get(currentUser.id))),
    http.get(apiUrl('/api/users/:id'), ({ params }) => {
      const user = store.get(String(params.id));
      return user
        ? HttpResponse.json(user)
        : problem(404, { detail: `User with id '${String(params.id)}' was not found.` });
    }),
    http.put(apiUrl('/api/users/:id/roles'), async ({ params, request }) => {
      const body = (await request.json()) as { roles: string[] };
      requests.push({ method: 'PUT', path: `/api/users/${String(params.id)}/roles`, body });
      const user = store.get(String(params.id));
      if (!user) return problem(404);
      if (body.roles.length === 0)
        return problem(400, { errors: { roles: ['At least one role is required.'] } });
      if (user.id === currentUser.id && !body.roles.includes('Admin')) {
        return problem(422, { detail: 'You cannot remove the Admin role from your own account.' });
      }
      user.roles = body.roles;
      return HttpResponse.json(user);
    }),
    http.patch(apiUrl('/api/users/:id/status'), async ({ params, request }) => {
      const body = (await request.json()) as { isActive: boolean };
      requests.push({ method: 'PATCH', path: `/api/users/${String(params.id)}/status`, body });
      const user = store.get(String(params.id));
      if (!user) return problem(404);
      if (user.id === currentUser.id && !body.isActive) {
        return problem(422, { detail: 'You cannot deactivate your own account.' });
      }
      user.isActive = body.isActive;
      return HttpResponse.json(user);
    }),
  );
  return { store, requests, listQueries };
}
