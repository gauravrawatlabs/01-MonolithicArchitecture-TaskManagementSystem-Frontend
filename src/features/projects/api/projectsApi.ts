import { apiClient } from '@/api/client';
import {
  type CreateProjectRequest,
  type PagedProjects,
  type ProjectDetails,
  type ProjectQuery,
  type UpdateProjectRequest,
} from '@/types/api';

/**
 * ProjectsController. Visibility: owner or member (Admin: all). A project you're not a member of is a
 * 404, not a 403: the API doesn't reveal that it exists.
 */
export const projectsApi = {
  /** One page of projects (search, ownedByMe, sort, paging on the server). */
  getProjects: async (query: ProjectQuery, signal?: AbortSignal) =>
    (await apiClient.get<PagedProjects>('/api/projects', { params: query, signal })).data,

  /** 200 with members (owner first) · 404 unknown or not a member. */
  getProject: async (id: number, signal?: AbortSignal) =>
    (await apiClient.get<ProjectDetails>(`/api/projects/${id}`, { signal })).data,

  /** 201 · 400 · 403 (not Admin/Manager or unverified) · 409 the owner already has this name. */
  create: async (body: CreateProjectRequest) =>
    (await apiClient.post<ProjectDetails>('/api/projects', body)).data,

  /** 200 · 400 · 403 (member, not owner) · 404 · 409. */
  update: async (id: number, body: UpdateProjectRequest) =>
    (await apiClient.put<ProjectDetails>(`/api/projects/${id}`, body)).data,

  /** 204 · 403 · 404. DELETES the project's tasks and their comments too (cascade). */
  remove: async (id: number) => {
    await apiClient.delete(`/api/projects/${id}`);
  },

  /** 200 updated project · 403 · 404 · 409 already a member · 422 user unknown or inactive. */
  addMember: async (id: number, userId: string) =>
    (await apiClient.post<ProjectDetails>(`/api/projects/${id}/members`, { userId })).data,

  /** 204 · 403 · 404 · 422 the owner can't be removed. Their tasks in the project become unassigned. */
  removeMember: async (id: number, userId: string) => {
    await apiClient.delete(`/api/projects/${id}/members/${userId}`);
  },
};

export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (query: ProjectQuery) => [...projectKeys.lists(), query] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: number) => [...projectKeys.details(), id] as const,
};
