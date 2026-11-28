import { MessageSquare } from 'lucide-react';

import { getErrorMessage, toApiError } from '@/api/apiError';
import { Button } from '@/components/common/Button';
import { Card, CardContent, CardHeader } from '@/components/common/Card';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useToast } from '@/contexts/toast';
import { useAuth } from '@/features/auth';
import { type ProjectDetails } from '@/types/api';

import { canAddComment, commentPermissions } from '../commentRules';
import { useAddComment, useComments } from '../hooks/useComments';
import { CommentForm } from './CommentForm';
import { CommentItem } from './CommentItem';

/**
 * The discussion on a task. `project` (owner and members) decides who may edit/delete; while it loads,
 * no actions are offered. Oldest first; "Show more" loads the next 20.
 */
export function CommentsSection({
  taskId,
  project,
}: {
  taskId: number;
  project: ProjectDetails | undefined;
}) {
  const { user } = useAuth();
  const toast = useToast();
  const comments = useComments(taskId);
  const add = useAddComment(taskId);
  const items = comments.data?.pages.flatMap((page) => page.items) ?? [];
  const total = comments.data?.pages.at(-1)?.totalCount ?? 0;
  const remaining = Math.max(0, total - items.length);

  return (
    <Card>
      <CardHeader title={comments.data ? `Comments (${total})` : 'Comments'} />
      <CardContent className="grid gap-5">
        {comments.isError ? (
          <ErrorState
            title="We couldn't load the comments"
            description={getErrorMessage(comments.error)}
            correlationId={toApiError(comments.error).correlationId}
            onRetry={() => void comments.refetch()}
            isRetrying={comments.isFetching}
          />
        ) : comments.isPending ? (
          <div role="status" aria-label="Loading comments" className="grid gap-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-3/4" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No comments yet"
            description="Start the discussion below."
          />
        ) : (
          <ol aria-label="Comments" className="grid gap-5">
            {items.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                isMine={comment.authorId === user?.id}
                permissions={commentPermissions(user, comment, project)}
              />
            ))}
          </ol>
        )}

        {comments.hasNextPage ? (
          <Button
            variant="secondary"
            size="sm"
            className="justify-self-start"
            isLoading={comments.isFetchingNextPage}
            onClick={() => void comments.fetchNextPage()}
          >
            Show more comments ({remaining})
          </Button>
        ) : null}

        {canAddComment(user) ? (
          <CommentForm
            label="Add a comment"
            submitLabel="Comment"
            onSubmit={async (content) => {
              await add.mutateAsync(content);
              toast.success('Comment added');
            }}
          />
        ) : (
          <p className="text-sm text-warning">Verify your email address to comment.</p>
        )}
      </CardContent>
    </Card>
  );
}
