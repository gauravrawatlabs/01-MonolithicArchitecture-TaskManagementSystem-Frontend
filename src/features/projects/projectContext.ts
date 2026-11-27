import { useOutletContext } from 'react-router';

import { type ProjectDetails } from '@/types/api';

/** What ProjectDetailsLayout hands to its tab pages: the loaded project (never undefined there). */
export interface ProjectOutletContext {
  project: ProjectDetails;
  canManage: boolean;
}

export function useProjectContext(): ProjectOutletContext {
  return useOutletContext<ProjectOutletContext>();
}
