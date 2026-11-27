import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { taskKeys } from '@/features/tasks';
import {
  type CreateProjectRequest,
  type PagedProjects,
  type ProjectQuery,
  type UpdateProjectRequest,
} from '@/types/api';

import { projectKeys, projectsApi } from '../api/projectsApi';

/** The dashboard aggregates projects; its key is repeated here to avoid a feature→feature import cycle. */
const DASHBOARD_KEY = ['dashboard'] as const;

/** One page of projects. keepPreviousData: the old page stays visible while the next one loads (no flash). */
export function useProjects(query: ProjectQuery) {
  return useQuery({
    queryKey: projectKeys.list(query),
    queryFn: ({ signal }) => projectsApi.getProjects(query, signal),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useProject(id: number) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: ({ signal }) => projectsApi.getProject(id, signal),
    staleTime: 30_000,
    enabled: Number.isInteger(id) && id > 0,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateProjectRequest) => projectsApi.create(body),
    onSuccess: (created) => {
      queryClient.setQueryData(projectKeys.detail(created.id), created);
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateProjectRequest }) =>
      projectsApi.update(id, body),
    onSuccess: (updated) => {
      queryClient.setQueryData(projectKeys.detail(updated.id), updated);
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY });
      void queryClient.invalidateQueries({ queryKey: taskKeys.all }); // task rows show the project name
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => projectsApi.remove(id),
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: projectKeys.detail(id) });
      // Drop it from every cached page NOW, so returning to the list never flashes the deleted project
      // while the refetch (below) is still on its way.
      queryClient.setQueriesData<PagedProjects>({ queryKey: projectKeys.lists() }, (page) =>
        page?.items.some((project) => project.id === id)
          ? {
              ...page,
              items: page.items.filter((project) => project.id !== id),
              totalCount: page.totalCount - 1,
            }
          : page,
      );
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY });
      void queryClient.invalidateQueries({ queryKey: taskKeys.all }); // its tasks are gone (cascade)
    },
  });
}

export function useAddProjectMember(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => projectsApi.addMember(projectId, userId),
    onSuccess: (updated) => {
      queryClient.setQueryData(projectKeys.detail(projectId), updated); // the response IS the new member list
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() }); // member counts
    },
  });
}

export function useRemoveProjectMember(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => projectsApi.removeMember(projectId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: taskKeys.all }); // their tasks were unassigned
      void queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY });
    },
  });
}
