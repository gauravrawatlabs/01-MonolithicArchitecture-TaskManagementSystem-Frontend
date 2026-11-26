import { useMatches } from 'react-router';

import { isRouteHandle, resolveHandleText } from '@/types/routing';

export interface Crumb {
  label: string;
  to: string;
}

/** The breadcrumb trail from route `handle.breadcrumb` values, e.g. Projects › Project #12 › Board. */
export function useBreadcrumbs(): Crumb[] {
  return useMatches().flatMap((match) => {
    if (!isRouteHandle(match.handle)) return [];
    const label = resolveHandleText(match.handle.breadcrumb, match.params);
    return label ? [{ label, to: match.pathname }] : [];
  });
}
