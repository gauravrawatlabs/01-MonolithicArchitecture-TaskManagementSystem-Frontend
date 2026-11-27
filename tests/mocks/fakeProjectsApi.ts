import { http, HttpResponse } from 'msw';

import {
  type ProjectDetails,
  type ProjectSummary,
  type UserLookup,
  type UserProfile,
} from '@/types/api';

import { apiUrl, problem } from './api';
import { buildMember, buildPagedProjects } from './factories/projects';
import { server } from './server';

export interface RecordedRequest {
  method: string;
  path: string;
  body: unknown;
}

interface ProjectBody {
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
}

/**
 * A stateful fake of ProjectsController (+ /api/users/lookup) for integration tests:
 *  • list: Search (name/description), OwnedByMe, SortBy/SortDirection, Page/PageSize, as the backend does;
 *  • create/update: name unique PER OWNER, case-insensitive (409);
 *  • members: 409 already a member, 422 unknown user, 422 removing the owner;
 *  • every write and every list query is recorded.
 * `taskCounts` lets a test give list items progress figures.
 */
export function serveProjects(
  initial: ProjectDetails[],
  { currentUser, directory = [] }: { currentUser: UserProfile; directory?: UserLookup[] },
) {
  const store = new Map(initial.map((project) => [project.id, structuredClone(project)]));
  const requests: RecordedRequest[] = [];
  const listQueries: URLSearchParams[] = [];
  let nextId = Math.max(100, ...initial.map((p) => p.id)) + 1;
  const me = `${currentUser.firstName} ${currentUser.lastName}`;

  const toSummary = (p: ProjectDetails): ProjectSummary => ({
    id: p.id,
    name: p.name,
    description: p.description,
    startDate: p.startDate,
    endDate: p.endDate,
    ownerId: p.ownerId,
    ownerName: p.ownerName,
    memberCount: p.members.length,
    taskCount: 0,
    openTaskCount: 0,
    doneTaskCount: 0,
    completionPercent: 0,
    createdAtUtc: p.createdAtUtc,
    updatedAtUtc: p.updatedAtUtc,
  });
  const nameTaken = (ownerId: string, name: string, exceptId?: number) =>
    [...store.values()].some(
      (p) =>
        p.id !== exceptId && p.ownerId === ownerId && p.name.toLowerCase() === name.toLowerCase(),
    );
  const duplicate = (name: string) =>
    problem(409, { title: 'Conflict', detail: `The owner already has a project named '${name}'.` });
  const notFound = (id: unknown) =>
    problem(404, { title: 'Not Found', detail: `Project with id '${String(id)}' was not found.` });

  server.use(
    http.get(apiUrl('/api/projects'), ({ request }) => {
      const params = new URL(request.url).searchParams;
      listQueries.push(params);
      const search = params.get('Search')?.toLowerCase();
      const sortBy = params.get('SortBy') ?? 'CreatedAt';
      const direction = params.get('SortDirection') ?? (sortBy === 'CreatedAt' ? 'Desc' : 'Asc');
      const page = Number(params.get('Page') ?? 1);
      const pageSize = Number(params.get('PageSize') ?? 20);
      const key = {
        CreatedAt: 'createdAtUtc',
        Name: 'name',
        StartDate: 'startDate',
        EndDate: 'endDate',
      }[sortBy] as 'createdAtUtc' | 'name' | 'startDate' | 'endDate';

      const all = [...store.values()]
        .filter((p) => params.get('OwnedByMe') !== 'true' || p.ownerId === currentUser.id)
        .filter(
          (p) =>
            !search ||
            p.name.toLowerCase().includes(search) ||
            (p.description?.toLowerCase().includes(search) ?? false),
        )
        .sort((a, b) => (a[key] ?? '').localeCompare(b[key] ?? ''));
      if (direction === 'Desc') all.reverse();
      const items = all.slice((page - 1) * pageSize, page * pageSize).map(toSummary);
      return HttpResponse.json(buildPagedProjects(items, page, pageSize, all.length));
    }),

    http.get(apiUrl('/api/projects/:id'), ({ params }) => {
      const project = store.get(Number(params.id));
      return project ? HttpResponse.json(project) : notFound(params.id);
    }),

    http.post(apiUrl('/api/projects'), async ({ request }) => {
      const body = (await request.json()) as ProjectBody;
      requests.push({ method: 'POST', path: '/api/projects', body });
      if (nameTaken(currentUser.id, body.name)) return duplicate(body.name);
      const created: ProjectDetails = {
        id: nextId++,
        ...body,
        ownerId: currentUser.id,
        ownerName: me,
        members: [
          buildMember({
            userId: currentUser.id,
            fullName: me,
            email: currentUser.email,
            memberRole: 'Owner',
          }),
        ],
        createdAtUtc: new Date().toISOString(),
        updatedAtUtc: null,
      };
      store.set(created.id, created);
      return HttpResponse.json(created, { status: 201 });
    }),

    http.put(apiUrl('/api/projects/:id'), async ({ params, request }) => {
      const body = (await request.json()) as ProjectBody;
      requests.push({ method: 'PUT', path: `/api/projects/${String(params.id)}`, body });
      const project = store.get(Number(params.id));
      if (!project) return notFound(params.id);
      if (nameTaken(project.ownerId, body.name, project.id)) return duplicate(body.name);
      Object.assign(project, body, { updatedAtUtc: new Date().toISOString() });
      return HttpResponse.json(project);
    }),

    http.delete(apiUrl('/api/projects/:id'), ({ params }) => {
      requests.push({
        method: 'DELETE',
        path: `/api/projects/${String(params.id)}`,
        body: undefined,
      });
      return store.delete(Number(params.id))
        ? new HttpResponse(null, { status: 204 })
        : notFound(params.id);
    }),

    http.post(apiUrl('/api/projects/:id/members'), async ({ params, request }) => {
      const body = (await request.json()) as { userId: string };
      requests.push({ method: 'POST', path: `/api/projects/${String(params.id)}/members`, body });
      const project = store.get(Number(params.id));
      if (!project) return notFound(params.id);
      if (project.members.some((m) => m.userId === body.userId)) {
        return problem(409, { detail: 'The user is already a member of this project.' });
      }
      const user = directory.find((u) => u.id === body.userId);
      if (!user) return problem(422, { detail: 'The user does not exist or is inactive.' });
      project.members.push(
        buildMember({ userId: user.id, fullName: user.fullName, email: user.email }),
      );
      return HttpResponse.json(project);
    }),

    http.delete(apiUrl('/api/projects/:id/members/:userId'), ({ params }) => {
      const path = `/api/projects/${String(params.id)}/members/${String(params.userId)}`;
      requests.push({ method: 'DELETE', path, body: undefined });
      const project = store.get(Number(params.id));
      if (!project) return notFound(params.id);
      const member = project.members.find((m) => m.userId === params.userId);
      if (!member) return problem(404, { detail: 'The user is not a member of this project.' });
      if (member.memberRole === 'Owner') {
        return problem(422, { detail: 'The project owner cannot be removed from the project.' });
      }
      project.members = project.members.filter((m) => m !== member);
      return new HttpResponse(null, { status: 204 });
    }),

    http.get(apiUrl('/api/users/lookup'), ({ request }) => {
      const search = (new URL(request.url).searchParams.get('Search') ?? '').trim().toLowerCase();
      if (search.length < 2)
        return problem(400, { detail: 'Search must be at least 2 characters long.' });
      return HttpResponse.json(
        directory.filter(
          (u) =>
            u.fullName.toLowerCase().includes(search) || u.email.toLowerCase().includes(search),
        ),
      );
    }),
  );

  return { store, requests, listQueries };
}
