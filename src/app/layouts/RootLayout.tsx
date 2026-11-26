import { useEffect } from 'react';
import { Outlet, ScrollRestoration, useMatches } from 'react-router';

import { env } from '@/constants/env';
import { isRouteHandle, resolveHandleText } from '@/types/routing';

/** document.title = deepest route's title (or breadcrumb) + app name, e.g. "Board · Task Management System". */
function useRouteDocumentTitle(): void {
  const matches = useMatches();

  let pageTitle: string | undefined;
  for (const match of matches) {
    if (!isRouteHandle(match.handle)) continue;
    pageTitle =
      resolveHandleText(match.handle.title, match.params) ??
      resolveHandleText(match.handle.breadcrumb, match.params) ??
      pageTitle;
  }

  useEffect(() => {
    document.title = pageTitle ? `${pageTitle} · ${env.appName}` : env.appName;
  }, [pageTitle]);
}

/**
 * Top of the route tree: page titles (screen readers announce them on navigation) and scroll
 * restoration (new page → top; Back → previous scroll position).
 */
export function RootLayout() {
  useRouteDocumentTitle();

  return (
    <>
      <ScrollRestoration />
      <Outlet />
    </>
  );
}
