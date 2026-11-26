import { render, type RenderResult } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { StrictMode } from 'react';
import { createMemoryRouter, parsePath, type RouteObject } from 'react-router';
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
  /** Router state for the first entry (e.g. { email } for the "check your email" page). */
  state?: unknown;
  /** Render inside <StrictMode> (double-invoked effects, as in development). */
  strict?: boolean;
}

/**
 * Renders the app's real route tree in memory at `path`: guards, layouts and lazy pages all run.
 * Returns the router so tests can assert the final URL (router.state.location).
 */
export function renderRoute(
  path: string,
  { user = null, routes = createAppRoutes(), state, strict = false }: RenderRouteOptions = {},
): RenderResult & { user: UserEvent; router: MemoryRouter } {
  const router = createMemoryRouter(routes, { initialEntries: [{ ...parsePath(path), state }] });
  const userEventInstance = userEvent.setup();
  const app = (
    <AppProviders initialUser={user}>
      <RouterProvider router={router} />
    </AppProviders>
  );
  const result = render(strict ? <StrictMode>{app}</StrictMode> : app);
  return { ...result, user: userEventInstance, router };
}

/** "/projects/12?x=1" for assertions. */
export function currentUrl(router: MemoryRouter): string {
  const { pathname, search } = router.state.location;
  return `${pathname}${search}`;
}
