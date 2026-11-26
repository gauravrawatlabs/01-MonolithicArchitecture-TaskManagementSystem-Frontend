import { type Params } from 'react-router';

/**
 * Metadata attached to routes via `handle` and read with useMatches():
 *   breadcrumb → one crumb per matched route (Breadcrumbs component)
 *   title      → document.title for the deepest route that has one
 * A function receives the route params, e.g. (p) => `Task #${p.taskId}`.
 */
export interface RouteHandle {
  breadcrumb?: string | ((params: Params) => string);
  title?: string | ((params: Params) => string);
}

export function isRouteHandle(value: unknown): value is RouteHandle {
  return typeof value === 'object' && value !== null;
}

export function resolveHandleText(
  value: RouteHandle['breadcrumb'],
  params: Params,
): string | undefined {
  return typeof value === 'function' ? value(params) : value;
}
