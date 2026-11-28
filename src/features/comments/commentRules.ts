import { isAdmin, isEmailVerified } from '@/features/auth';
import { type Comment, type ProjectDetails, type UserProfile } from '@/types/api';

/** Mirrors CommentRules (backend): 1–2000 characters after trimming. */
export const COMMENT_MAX = 2000;

export interface CommentPermissions {
  canEdit: boolean;
  canDelete: boolean;
}

/**
 * Backend CommentAuthorizationHandler (+ EmailVerified on every write), for the UI; the API decides:
 *   Edit   → the AUTHOR only, while still a project member ("nobody may put words in someone else's
 *            mouth", not even an Admin)
 *   Delete → the author (still a member), the project owner (moderation) or an Admin
 * Admins are NOT exempt from the membership check for editing, and nobody is exempt from verification.
 */
export function commentPermissions(
  user: UserProfile | null,
  comment: Pick<Comment, 'authorId'>,
  project: Pick<ProjectDetails, 'ownerId' | 'members'> | undefined,
): CommentPermissions {
  if (!user || !isEmailVerified(user)) return { canEdit: false, canDelete: false };
  const isOwner = project?.ownerId === user.id;
  const isMember = isOwner || (project?.members.some((m) => m.userId === user.id) ?? false);
  const isAuthor = comment.authorId === user.id && isMember;
  return { canEdit: isAuthor, canDelete: isAuthor || isOwner || isAdmin(user) };
}

/** Anyone who can read the task may comment (AddComment = Read), with a verified email. */
export function canAddComment(user: UserProfile | null): boolean {
  return isEmailVerified(user);
}
