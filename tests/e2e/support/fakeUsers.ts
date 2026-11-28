import { type Page } from '@playwright/test';

import { type FakeUser, fakeApiHandler, fakeAuthResponse } from './fakeApi';

/** A small stateful UsersController (list, details, roles, status, /me) in the browser. */
export async function fakeUsers(page: Page, me: FakeUser) {
  // Widen the nullable fields (the fake response has them as literal null).
  const self = {
    ...fakeAuthResponse(me).user,
    jobTitle: null as string | null,
    lastLoginAtUtc: null as string | null,
  };
  const maya = {
    ...self,
    id: '00000000-0000-4000-8000-0000000000a1',
    email: 'maya@example.test',
    firstName: 'Maya',
    lastName: 'Manager',
    roles: ['Manager'],
    lastLoginAtUtc: '2026-11-27T09:00:00Z',
  };
  const store = new Map<string, typeof self>([
    [self.id, self],
    [maya.id, maya],
  ]);
  await fakeApiHandler(page, '/api/users', ({ query }) => {
    const items = [...store.values()].filter(
      (u) => !query.has('IsActive') || String(u.isActive) === query.get('IsActive'),
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
  });
  await fakeApiHandler(page, '/api/users/*', ({ method, path, body }) => {
    const [, , , id, action] = path.split('/');
    const target = id === 'me' ? store.get(self.id) : store.get(id ?? '');
    if (!target) return [404, { status: 404, title: 'Not Found' }];
    if (method === 'PUT' && id === 'me') Object.assign(target, body);
    if (action === 'roles') Object.assign(target, body);
    if (action === 'status') target.isActive = (body as { isActive: boolean }).isActive;
    return [200, target];
  });
  await fakeApiHandler(page, '/api/auth/me', () => [200, store.get(self.id)]);
  return { maya };
}
