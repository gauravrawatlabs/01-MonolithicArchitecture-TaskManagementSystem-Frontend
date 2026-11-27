import { createContext, use, useEffect } from 'react';
import { useMatch } from 'react-router';

/**
 * Route metadata only knows the URL ("Project #12"). Once a page has loaded its data it can give its
 * breadcrumb (and the browser tab title) a real label ("Website Redesign"): labels are keyed by the
 * matched route's pathname and removed when the page unmounts.
 */
export interface BreadcrumbLabelsValue {
  labels: ReadonlyMap<string, string>;
  setLabel: (pathname: string, label: string | null) => void;
}

export const BreadcrumbLabelsContext = createContext<BreadcrumbLabelsValue | null>(null);

/** Overrides labels only where a provider exists (tests may render without one). */
export function useBreadcrumbLabels(): ReadonlyMap<string, string> {
  return use(BreadcrumbLabelsContext)?.labels ?? new Map<string, string>();
}

/**
 * Labels the breadcrumb of the route matching `routePattern` (e.g. "/projects/:projectId").
 * Pass null while the data is loading (the route's default label is shown meanwhile).
 */
export function useBreadcrumbLabel(routePattern: string, label: string | null): void {
  const context = use(BreadcrumbLabelsContext);
  const match = useMatch({ path: routePattern, end: false });
  const pathname = match?.pathnameBase;
  const setLabel = context?.setLabel;

  useEffect(() => {
    if (!setLabel || !pathname) return undefined;
    setLabel(pathname, label);
    return () => {
      setLabel(pathname, null);
    };
  }, [setLabel, pathname, label]);
}
