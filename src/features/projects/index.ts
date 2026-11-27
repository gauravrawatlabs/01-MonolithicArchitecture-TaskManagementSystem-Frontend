/** Public API of the projects feature (used by tasks/board in Phases 11–12). */
export { projectKeys, projectsApi } from './api/projectsApi';
export { useProject, useProjects } from './hooks/useProjects';
export { canManageProject } from './projectRules';
