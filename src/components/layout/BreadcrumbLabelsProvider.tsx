import { type ReactNode, useCallback, useMemo, useState } from 'react';

import { BreadcrumbLabelsContext, type BreadcrumbLabelsValue } from './breadcrumbLabels';

/** Holds the page-provided breadcrumb labels (see breadcrumbLabels.ts). */
export function BreadcrumbLabelsProvider({ children }: { children: ReactNode }) {
  const [labels, setLabels] = useState<ReadonlyMap<string, string>>(new Map());

  // STABLE (no dependencies): pages call it from an effect that lists it as a dependency. If it changed
  // with every label update, that effect's cleanup (remove label) and re-run (add label) would loop forever.
  const setLabel = useCallback((pathname: string, label: string | null) => {
    setLabels((current) => {
      if ((current.get(pathname) ?? null) === label) return current;
      const next = new Map(current);
      if (label === null) next.delete(pathname);
      else next.set(pathname, label);
      return next;
    });
  }, []);

  const value = useMemo<BreadcrumbLabelsValue>(() => ({ labels, setLabel }), [labels, setLabel]);

  return <BreadcrumbLabelsContext value={value}>{children}</BreadcrumbLabelsContext>;
}
