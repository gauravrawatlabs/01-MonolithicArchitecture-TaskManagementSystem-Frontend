import { apiClient } from '@/api/client';
import { type Comment, type PagedComments } from '@/types/api';

/**
 * CommentsController. Reading needs the task to be visible (project member / Admin); every write needs a
 * verified email. Comments come OLDEST FIRST (a conversation reads top-down).
 */
export const commentsApi = {
  /** One page of a task's comments, oldest first. 404 when the task isn't visible. */
  getPage: async (taskId: number, page: number, pageSize: number, signal?: AbortSignal) =>
    (
      await apiClient.get<PagedComments>(`/api/tasks/${taskId}/comments`, {
        params: { Page: page, PageSize: pageSize },
        signal,
      })
    ).data,

  /** 201 · 400 (empty, > 2000) · 403 unverified · 404 task not visible. Any project member may comment. */
  add: async (taskId: number, content: string) =>
    (await apiClient.post<Comment>(`/api/tasks/${taskId}/comments`, { content })).data,

  /** 200 · 403 (only the AUTHOR, not even an Admin) · 404. Sets updatedAtUtc ("edited"). */
  update: async (id: number, content: string) =>
    (await apiClient.put<Comment>(`/api/comments/${id}`, { content })).data,

  /** 204 · 403 (author, project owner or Admin only) · 404. */
  remove: async (id: number) => {
    await apiClient.delete(`/api/comments/${id}`);
  },
};

export const commentKeys = {
  all: ['comments'] as const,
  forTask: (taskId: number) => [...commentKeys.all, 'task', taskId] as const,
};
