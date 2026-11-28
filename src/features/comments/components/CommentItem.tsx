import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { getErrorMessage } from '@/api/apiError';
import { Avatar } from '@/components/common/Avatar';
import { Button } from '@/components/common/Button';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { useToast } from '@/contexts/toast';
import { type Comment } from '@/types/api';
import { formatDateTime, formatTimeAgo } from '@/utils/dates';

import { type CommentPermissions } from '../commentRules';
import { useDeleteComment, useUpdateComment } from '../hooks/useComments';
import { CommentForm } from './CommentForm';

/** One comment: author, time ("edited" when changed), text, and Edit/Delete where allowed. */
export function CommentItem({
  comment,
  permissions,
  isMine,
}: {
  comment: Comment;
  permissions: CommentPermissions;
  isMine: boolean;
}) {
  const toast = useToast();
  const update = useUpdateComment(comment.taskId);
  const remove = useDeleteComment(comment.taskId);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const headingId = `comment-${comment.id}`;

  return (
    <li className="flex gap-3" aria-labelledby={headingId}>
      <Avatar name={comment.authorName} decorative />
      <article className="min-w-0 flex-1" aria-labelledby={headingId}>
        <header className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <h3 id={headingId} className="font-medium text-foreground">
            {comment.authorName}
            {isMine ? <span className="font-normal text-muted-foreground"> (you)</span> : null}
          </h3>
          <time
            dateTime={comment.createdAtUtc}
            title={formatDateTime(comment.createdAtUtc)}
            className="text-xs text-muted-foreground"
          >
            {formatTimeAgo(comment.createdAtUtc)}
          </time>
          {comment.updatedAtUtc ? (
            <span className="text-xs text-muted-foreground">
              · edited{' '}
              <time dateTime={comment.updatedAtUtc}>{formatTimeAgo(comment.updatedAtUtc)}</time>
            </span>
          ) : null}
        </header>

        {editing ? (
          <div className="mt-2">
            <CommentForm
              label="Edit comment"
              submitLabel="Save"
              initialContent={comment.content}
              focusOnMount
              onCancel={() => {
                setEditing(false);
              }}
              onSubmit={async (content) => {
                await update.mutateAsync({ id: comment.id, content });
                setEditing(false);
                toast.success('Comment updated');
              }}
            />
          </div>
        ) : (
          <p className="mt-1 text-sm break-words whitespace-pre-line">{comment.content}</p>
        )}

        {!editing && (permissions.canEdit || permissions.canDelete) ? (
          <div className="mt-1 flex gap-1">
            {permissions.canEdit ? (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Pencil aria-hidden="true" />}
                aria-label={`Edit comment by ${comment.authorName}`}
                onClick={() => {
                  setEditing(true);
                }}
              >
                Edit
              </Button>
            ) : null}
            {permissions.canDelete ? (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Trash2 aria-hidden="true" />}
                aria-label={`Delete comment by ${comment.authorName}`}
                onClick={() => {
                  setConfirming(true);
                }}
              >
                Delete
              </Button>
            ) : null}
          </div>
        ) : null}
      </article>

      {confirming ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setConfirming(false);
          }}
          title="Delete this comment?"
          description={
            isMine
              ? "Your comment will be removed for everyone. This can't be undone."
              : `${comment.authorName}'s comment will be removed for everyone. This can't be undone.`
          }
          confirmLabel="Delete comment"
          onConfirm={async () => {
            try {
              await remove.mutateAsync(comment.id);
              toast.success('Comment deleted');
            } catch (error) {
              toast.error('Could not delete the comment', getErrorMessage(error));
              throw error;
            }
          }}
        />
      ) : null}
    </li>
  );
}
