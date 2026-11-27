import { useMatches } from 'react-router';

import { isRouteHandle, resolveHandleText } from '@/types/routing';

import { useBreadcrumbLabels } from './breadcrumbLabels';

export interface Crumb {
  label: string;
  to: string;
}

/** The breadcrumb trail from route `handle.breadcrumb` values, e.g. Projects › Project #12 › Board. */
export function useBreadcrumbs(): Crumb[] {
  const overrides = useBreadcrumbLabels();
  return useMatches().flatMap((match) => {
    if (!isRouteHandle(match.handle)) return [];
    const label =
      overrides.get(match.pathname) ?? resolveHandleText(match.handle.breadcrumb, match.params);
    return label ? [{ label, to: match.pathname }] : [];
  });
}
