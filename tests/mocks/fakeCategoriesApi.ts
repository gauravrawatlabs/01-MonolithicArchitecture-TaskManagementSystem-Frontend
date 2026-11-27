import { http, HttpResponse } from 'msw';

import { type Category } from '@/types/api';

import { apiUrl, problem } from './api';
import { server } from './server';

export interface RecordedRequest {
  method: string;
  path: string;
  body: unknown;
}

/**
 * A stateful fake of CategoriesController for integration tests: list ordered by name, create/update with
 * the CASE-INSENSITIVE unique-name rule (409), delete, 404 for unknown ids. Every write is recorded.
 */
export function serveCategories(initial: Category[]) {
  const store = new Map(initial.map((category) => [category.id, { ...category }]));
  const requests: RecordedRequest[] = [];
  let nextId = Math.max(0, ...initial.map((c) => c.id)) + 1;

  const nameTaken = (name: string, exceptId?: number) =>
    [...store.values()].some(
      (c) => c.id !== exceptId && c.name.toLowerCase() === name.trim().toLowerCase(),
    );
  const duplicate = (name: string) =>
    problem(409, {
      title: 'Conflict',
      detail: `A category named '${name.trim()}' already exists.`,
    });

  server.use(
    http.get(apiUrl('/api/categories'), () =>
      HttpResponse.json([...store.values()].sort((a, b) => a.name.localeCompare(b.name))),
    ),
    http.post(apiUrl('/api/categories'), async ({ request }) => {
      const body = (await request.json()) as { name: string; description: string | null };
      requests.push({ method: 'POST', path: '/api/categories', body });
      if (nameTaken(body.name)) return duplicate(body.name);
      const created: Category = {
        id: nextId++,
        name: body.name.trim(),
        description: body.description,
        createdAtUtc: new Date().toISOString(),
        updatedAtUtc: null,
      };
      store.set(created.id, created);
      return HttpResponse.json(created, { status: 201 });
    }),
    http.put(apiUrl('/api/categories/:id'), async ({ request, params }) => {
      const id = Number(params.id);
      const body = (await request.json()) as { name: string; description: string | null };
      requests.push({ method: 'PUT', path: `/api/categories/${id}`, body });
      const existing = store.get(id);
      if (!existing) return problem(404, { detail: `Category with id '${id}' was not found.` });
      if (nameTaken(body.name, id)) return duplicate(body.name);
      const updated = {
        ...existing,
        name: body.name.trim(),
        description: body.description,
        updatedAtUtc: new Date().toISOString(),
      };
      store.set(id, updated);
      return HttpResponse.json(updated);
    }),
    http.delete(apiUrl('/api/categories/:id'), ({ params }) => {
      const id = Number(params.id);
      requests.push({ method: 'DELETE', path: `/api/categories/${id}`, body: undefined });
      if (!store.delete(id)) return problem(404);
      return new HttpResponse(null, { status: 204 });
    }),
  );

  return { store, requests };
}

let sequence = 0;
export function buildCategory(overrides: Partial<Category> = {}): Category {
  sequence += 1;
  return {
    id: sequence,
    name: `Category ${sequence}`,
    description: null,
    createdAtUtc: `2026-11-${String(10 + (sequence % 15)).padStart(2, '0')}T09:00:00Z`,
    updatedAtUtc: null,
    ...overrides,
  };
}
