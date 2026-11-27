import { http, HttpResponse } from 'msw';

import { apiUrl } from '../api';
import { buildDashboard } from '../factories/dashboard';
import { buildPagedTasks } from '../factories/tasks';

/** Default handlers for workspace data: a non-empty dashboard and an empty task list. */
export const workspaceHandlers = [
  http.get(apiUrl('/api/dashboard'), () => HttpResponse.json(buildDashboard())),
  http.get(apiUrl('/api/tasks'), () => HttpResponse.json(buildPagedTasks([]))),
];
