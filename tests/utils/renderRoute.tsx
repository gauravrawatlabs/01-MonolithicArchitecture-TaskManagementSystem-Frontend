import { render, type RenderResult } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { createMemoryRouter, type RouteObject } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import { AppProviders } from '@/app/providers/AppProviders';
import { createAppRoutes } from '@/app/router/routes';
import { type UserProfile } from '@/types/api';

type MemoryRouter = ReturnType<typeof createMemoryRouter>;

export interface RenderRouteOptions {
  /** Start signed in as this user (default: signed out). */
  user?: UserProfile | null;
  /** Custom route tree (default: the real app routes). */
  routes?: RouteObject[];
}

/**
 * Renders the app's real route tree in memory at `path`: guards, layouts and lazy pages all run.
 * Returns the router so tests can assert the final URL (router.state.location).
 */
export function renderRoute(
  path: string,
  { user = null, routes = createAppRoutes() }: RenderRouteOptions = {},
): RenderResult & { user: UserEvent; router: MemoryRouter } {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const userEventInstance = userEvent.setup();
  const result = render(
    <AppProviders initialUser={user}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return { ...result, user: userEventInstance, router };
}

/** "/projects/12?x=1" for assertions. */
export function currentUrl(router: MemoryRouter): string {
  const { pathname, search } = router.state.location;
  return `${pathname}${search}`;
}
