import { useQuery } from '@tanstack/react-query';

import { dashboardApi, dashboardKeys } from '../api/dashboardApi';

/** Statistics are aggregates: 30 s freshness is plenty (docs/01 §14.2). Refetched on window focus. */
export function useDashboard() {
  return useQuery({
    queryKey: dashboardKeys.all,
    queryFn: ({ signal }) => dashboardApi.getDashboard(signal),
    staleTime: 30_000,
  });
}
