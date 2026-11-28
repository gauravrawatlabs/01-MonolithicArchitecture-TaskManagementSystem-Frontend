import { http, HttpResponse } from 'msw';

import { apiUrl } from '../api';
import { buildDashboard } from '../factories/dashboard';
import { buildPagedProjects, buildProjectDetails } from '../factories/projects';
import { buildPagedTasks } from '../factories/tasks';

/**
 * Default handlers for workspace data: a non-empty dashboard, an empty task list, no projects in the list,
 * and any project id opening "Website Redesign" (so layout/navigation tests can visit project pages).
 */
export const workspaceHandlers = [
  http.get(apiUrl('/api/dashboard'), () => HttpResponse.json(buildDashboard())),
  http.get(apiUrl('/api/tasks'), () => HttpResponse.json(buildPagedTasks([]))),
  http.get(apiUrl('/api/projects'), () => HttpResponse.json(buildPagedProjects([]))),
  http.get(apiUrl('/api/projects/:id'), ({ params }) =>
    HttpResponse.json(buildProjectDetails({ id: Number(params.id), name: 'Website Redesign' })),
  ),
  http.get(apiUrl('/api/users/lookup'), () => HttpResponse.json([])),
  http.get(apiUrl('/api/categories'), () => HttpResponse.json([])),
];
