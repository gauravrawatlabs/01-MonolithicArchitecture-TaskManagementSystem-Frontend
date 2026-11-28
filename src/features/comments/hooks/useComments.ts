import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import { type Comment, type PagedComments } from '@/types/api';

import { commentKeys, commentsApi } from '../api/commentsApi';

export const COMMENTS_PAGE_SIZE = 20;

/**
 * A task's comments, oldest first, 20 at a time ("Show more" loads the next page). useInfiniteQuery keeps
 * the pages together under ONE key, so a refetch refreshes everything shown, in order.
 */
export function useComments(taskId: number) {
  return useInfiniteQuery({
    queryKey: commentKeys.forTask(taskId),
    queryFn: ({ pageParam, signal }) =>
      commentsApi.getPage(taskId, pageParam, COMMENTS_PAGE_SIZE, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
    staleTime: 15_000,
  });
}

type CommentPages = InfiniteData<PagedComments, number>;

/** Applies a change to every loaded page (edit/delete happen in place, without refetching). */
function mapComments(data: CommentPages | undefined, change: (items: Comment[]) => Comment[]) {
  if (!data) return data;
  return { ...data, pages: data.pages.map((page) => ({ ...page, items: change(page.items) })) };
}

export function useAddComment(taskId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => commentsApi.add(taskId, content),
    // The new comment is the NEWEST: its position depends on how many exist, so refetch all loaded pages.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: commentKeys.forTask(taskId) }),
  });
}

export function useUpdateComment(taskId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, content }: { id: number; content: string }) =>
      commentsApi.update(id, content),
    onSuccess: (saved) => {
      queryClient.setQueryData<CommentPages>(commentKeys.forTask(taskId), (data) =>
        mapComments(data, (items) => items.map((c) => (c.id === saved.id ? saved : c))),
      );
    },
  });
}

export function useDeleteComment(taskId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => commentsApi.remove(id),
    onSuccess: (_result, id) => {
      queryClient.setQueryData<CommentPages>(commentKeys.forTask(taskId), (data) =>
        mapComments(data, (items) => items.filter((c) => c.id !== id)),
      );
      // Page boundaries shifted by one: refetch in the background so "Show more" stays correct.
      void queryClient.invalidateQueries({ queryKey: commentKeys.forTask(taskId) });
    },
  });
}
